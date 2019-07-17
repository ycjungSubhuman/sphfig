/* Written by Yucheol Jung <ycjung@postech.ac.kr>. July 17th, 2019. */

#include <iostream>
#include <fstream>
#include <stdexcept>
#include <vector>
#include <cstring>

#include <png.h>

#include "paint.h"

// width and height of a window and the generated image
#define SPHFIG_WIDTH (1024)
#define SPHFIG_HEIGHT (1024)

/*****************************************************************************/
/* Local functions */
/*****************************************************************************/
namespace
{
    void glfw_error_callback(int code, const char* description)
    {
        std::cerr << "[GLFW error] " << code << " " << description << std::endl;
    }


    void handle_scroll()
    {
    }

    void glfw_handle_key(GLFWwindow *window, int key, int scancode, int action, int mods)
    {
        GLPaintContext *context = (GLPaintContext*)glfwGetWindowUserPointer(window);

        if (key == GLFW_KEY_R && action == GLFW_PRESS)
        {
            context->ReloadShader();
        }

        if (key == GLFW_KEY_S && action == GLFW_PRESS)
        {
            context->SaveCurrent();
        }
    }

    void write_png(const char *path, const uint8_t *buf)
    {
        FILE *fp = fopen(path, "wb");
        png_structp wsp = png_create_write_struct(PNG_LIBPNG_VER_STRING, NULL, NULL, NULL);
        png_infop isp = png_create_info_struct(wsp);
        png_init_io(wsp, fp);
        png_set_IHDR(wsp, isp, SPHFIG_WIDTH, SPHFIG_HEIGHT,
                    8, PNG_COLOR_TYPE_RGBA, PNG_INTERLACE_NONE,
                    PNG_COMPRESSION_TYPE_DEFAULT, PNG_FILTER_TYPE_DEFAULT);
        png_write_info(wsp, isp);

        const uint8_t **scanlines = new const uint8_t*[SPHFIG_HEIGHT];
        for(size_t i=0; i<SPHFIG_HEIGHT; i++)
        {
            int i_inv = SPHFIG_HEIGHT - i - 1;
            scanlines[i_inv] = &buf[4*SPHFIG_WIDTH*i];
        }
        png_write_image(wsp, const_cast<uint8_t**>(scanlines));
        delete[] scanlines;
        png_write_end(wsp, NULL);
        fclose(fp);
    }
}

// The main shader that does all the drawing.
// Put this file in the same directory as the executable file
const char *GLPaintContext::m_shader_path = "shader.frag";

const char *GLPaintContext::m_save_path = "fig.png";

// A trivial vertex shader.
// It forwards vertex positions and uv coordinates to fragment shader
const char *GLPaintContext::m_stub_vert_shader = 
"#version 460 \n"
"\n"
"in vec3 _pos;"
"in vec2 _uv;"
"out vec2 uv;"
"\n"
"void main() { \n"
"  gl_Position = vec4(_pos,1.0); \n"
"  uv = _uv; \n"
"}\n";

GLPaintContext::GLPaintContext():
    m_shader_created(false) 
{
    m_uniforms["aspect_ratio"] = static_cast<float>(SPHFIG_WIDTH) / SPHFIG_HEIGHT;
    m_uniforms["translateX"] = 0.0f;
    m_uniforms["translateY"] = 0.0f;
    m_uniforms["scale"] = 1.0f;
}

GLPaintContext::~GLPaintContext()
{
    if(m_window)
        glfwDestroyWindow(m_window);
}

GLPaintContext::Ptr GLPaintContext::Create()
{
    GLPaintContext::Ptr result = std::make_shared<GLPaintContext>();

    InitApiContext(result);
    InitFramebuffer(result);
    InitCanvas(result);
    result->ReloadShader();

    return result;
}

void GLPaintContext::Loop()
{
    while(!glfwWindowShouldClose(m_window))
    {
        Draw();
        glfwSwapBuffers(m_window);
        glfwPollEvents();
    }
}

void GLPaintContext::InitApiContext(GLPaintContext::Ptr &instance)
{
    // Setup GLFW window
    //   GLFW is a libray for automatically setting up window and initializing OpenGL
    //   context. It handles I/O of the window also.
    //// Init GLFW
    if(int code = glfwInit(); GLFW_TRUE != code)
    {
        throw std::runtime_error("GLFW init error: " + glfwGetError(nullptr));
    }
    glfwSetErrorCallback(glfw_error_callback);

    //// Init window
    glfwWindowHint(GLFW_VISIBLE, GLFW_TRUE);
    glfwWindowHint(GLFW_FOCUSED, GLFW_TRUE);
    glfwWindowHint(GLFW_CLIENT_API, GLFW_OPENGL_API);
    glfwWindowHint(GLFW_CONTEXT_CREATION_API, GLFW_NATIVE_CONTEXT_API);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 6);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GLFW_FALSE);
    instance->m_window = glfwCreateWindow(SPHFIG_WIDTH, SPHFIG_HEIGHT, "Figure", nullptr, nullptr);
    if(nullptr == instance->m_window)
    {
        throw std::runtime_error("GLFW window creation error: " + glfwGetError(nullptr));
    }
    glfwMakeContextCurrent(instance->m_window);
    glfwSetWindowUserPointer(instance->m_window, instance.get());
    glfwSetKeyCallback(instance->m_window, glfw_handle_key);

    // Load GL extensions with GLEW
    //   GLEW is a library for automatically loading OpenGL extensions and assigning
    //   function pointers to C functions
    if (GLenum code = glewInit(); GLEW_OK != code)
    {
        glfwTerminate();
        throw std::runtime_error((const char*)glewGetErrorString(code));
    }
}

void GLPaintContext::InitFramebuffer(GLPaintContext::Ptr &instance)
{
    // For reading pixel values into CPU memory from OpenGL-rendered images,
    // we setup a framebuffer as our OpenGL rendering target

    // Init renderbuffer
    glGenRenderbuffers(2, instance->m_rbufs);
    //// A renderbuffer for color attachment
    glBindRenderbuffer(GL_RENDERBUFFER, instance->m_rbufs[0]);
    glRenderbufferStorage(GL_RENDERBUFFER, GL_RGBA, SPHFIG_WIDTH, SPHFIG_HEIGHT);
    //// A renderbuffer for depth attachment
    glBindRenderbuffer(GL_RENDERBUFFER, instance->m_rbufs[1]);
    glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH_COMPONENT, SPHFIG_WIDTH, SPHFIG_HEIGHT);

    // Init a framebuffer
    glGenFramebuffers(1, instance->m_fbufs);
    glBindFramebuffer(GL_DRAW_FRAMEBUFFER, instance->m_fbufs[0]);
    //// Attach created the color attachment and the depth attachment to the framebuffer
    glFramebufferRenderbuffer(GL_DRAW_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_RENDERBUFFER, instance->m_rbufs[0]);
    glFramebufferRenderbuffer(GL_DRAW_FRAMEBUFFER, GL_DEPTH_ATTACHMENT, GL_RENDERBUFFER, instance->m_rbufs[1]);

    if(GLenum code = glCheckFramebufferStatus(GL_FRAMEBUFFER); 
       GL_FRAMEBUFFER_COMPLETE != code)
    {
        throw std::runtime_error("Framebuffer incomplete");
    }
}

void GLPaintContext::InitCanvas(GLPaintContext::Ptr &instance)
{
    // Draw two triangles covering the whole screen
    std::vector<GLfloat> _pos = {
        -1.0f, -1.0f, 0.0f,
        1.0f, -1.0f, 0.0f,
        -1.0f, 1.0f, 0.0f,

        1.0f, -1.0f, 0.0f,
        1.0f, 1.0f, 0.0f,
        -1.0f, 1.0f, 0.0f,
    };
    std::vector<GLfloat> _uv = {
        0.0f, 0.0f,
        1.0f, 0.0f,
        0.0f, 1.0f,

        1.0f, 0.0f,
        1.0f, 1.0f,
        0.0f, 1.0f,
    };

    GLuint vao;
    glGenVertexArrays(1, &vao);
    glBindVertexArray(vao);

    glGenBuffers(2, instance->m_glbufs);

    glBindBuffer(GL_ARRAY_BUFFER, instance->m_glbufs[0]);
    glBufferData(GL_ARRAY_BUFFER, _pos.size()*sizeof(GLfloat), _pos.data(), GL_STATIC_DRAW);
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 0, 0);

    glBindBuffer(GL_ARRAY_BUFFER, instance->m_glbufs[1]);
    glBufferData(GL_ARRAY_BUFFER, _uv.size()*sizeof(GLfloat), _uv.data(), GL_STATIC_DRAW);
    glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 0, 0);

    glBindBuffer(GL_ARRAY_BUFFER, 0);
}

void GLPaintContext::ReloadShader()
{
    GLuint vshader = glCreateShader(GL_VERTEX_SHADER);
    GLuint fshader = glCreateShader(GL_FRAGMENT_SHADER);
    
    // Feed shader source to OpenGL
    //// Set geometry shader
    GLint size_vsource = std::strlen(m_stub_vert_shader);
    glShaderSource(vshader, 1, &m_stub_vert_shader, &size_vsource);
    //// Read fragment shader
    if(!std::experimental::filesystem::exists(m_shader_path))
    {
        std::cerr << "Shader does not exists: " << 
            std::string((char*)m_shader_path) << std::endl;
    }
    {
        std::ifstream file_in((char*)m_shader_path, std::ios::ate);
        GLint size_fsource = file_in.tellg();
        std::vector<char> source(size_fsource+1, 0);
        file_in.seekg(std::ios::beg);
        file_in.read(source.data(), source.size());
        GLchar *ptr_fsource = source.data();
        //// Set fragment shader
        glShaderSource(fshader, 1, &ptr_fsource, &size_fsource);
    }

    // Compile shader source
    auto compile = [](GLuint shader, const char *name) -> bool {
        glCompileShader(shader);
        GLint code;
        glGetShaderiv(shader, GL_COMPILE_STATUS, &code);
        if (GL_TRUE != code)
        {
            std::string message;
            message.resize(500);
            glGetShaderInfoLog(shader, 500, nullptr, message.data());
            std::cerr << name << "[Shader compile failed] " << message << std::endl;
            return false;
        }
        else
        {
            return true;
        }
    };
    if( !(compile(vshader, "vshader") && compile(fshader, "fshader")) )
    {
        return;
    }

    // Link shaders to program
    GLuint program = glCreateProgram();
    glAttachShader(program, vshader);
    glAttachShader(program, fshader);
    glLinkProgram(program);
    GLint code_link;
    glGetProgramiv(program, GL_LINK_STATUS, &code_link);
    if(GL_TRUE != code_link)
    {
        std::cerr << "Could not link shaders to program" << std::endl;
    }

    if(m_shader_created)
    {
        glDeleteProgram(m_program);
        glDeleteShader(m_vshader);
        glDeleteShader(m_fshader);
        std::cout << "Shader Reloaded" << std::endl;
    }

    m_program = program;
    m_vshader = vshader;
    m_fshader = fshader;
    m_shader_created = true;
}

void GLPaintContext::SaveCurrent()
{
    glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbufs[0]);
    std::vector<uint8_t> buf(SPHFIG_WIDTH*SPHFIG_HEIGHT*4*sizeof(char));
    glReadPixels(0, 0, SPHFIG_WIDTH, SPHFIG_HEIGHT, GL_RGBA, GL_UNSIGNED_BYTE, buf.data());
    glBindFramebuffer(GL_READ_FRAMEBUFFER, 0);

    write_png(m_save_path, buf.data());

    std::cout << "Image saved to " << m_save_path << std::endl;
}

void GLPaintContext::Draw()
{
    // Use '_pos' and '_uv' vertex attributes
    glUseProgram(m_program);
    glBindBuffer(GL_ARRAY_BUFFER, m_glbufs[0]);
    glBindBuffer(GL_ARRAY_BUFFER, m_glbufs[1]);
    glEnableVertexAttribArray(0);
    glEnableVertexAttribArray(1);

    // Setup uniforms
    for (const auto &p : m_uniforms)
    {
        auto [key, value] = p;
        GLint pos = glGetUniformLocation(m_program, key.c_str());
        glUniform1f(pos, value);
    }

    // draw to framebuffer
    glBindFramebuffer(GL_DRAW_FRAMEBUFFER, m_fbufs[0]);
    glDrawArrays(GL_TRIANGLES, 0, 3*2);

    // draw to screen
    glBindFramebuffer(GL_READ_FRAMEBUFFER, m_fbufs[0]);
    glBindFramebuffer(GL_DRAW_FRAMEBUFFER, 0);
    glBlitFramebuffer(
        0, 0, SPHFIG_WIDTH, SPHFIG_HEIGHT, 
        0, 0, SPHFIG_WIDTH, SPHFIG_HEIGHT, GL_COLOR_BUFFER_BIT, GL_NEAREST);

    // Disable '_pos' and '_uv' vertex attributes
    glDisableVertexAttribArray(1);
    glDisableVertexAttribArray(0);
    glBindBuffer(GL_ARRAY_BUFFER, 0);

#ifndef NDEBUG
    if (GLenum code = glGetError(); GL_NO_ERROR != code)
        std::cerr << "glError: " << code << std::endl;
#endif

}