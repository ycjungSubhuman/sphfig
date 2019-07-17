#ifndef __SPHFIG_PAINT_H
#define __SPHFIG_PAINT_H

/* Written by Yucheol Jung <ycjung@postech.ac.kr>. July 17th, 2019. */

#include <GL/glew.h>
#include <GLFW/glfw3.h>
#include <experimental/filesystem>
#include <memory>
#include <unordered_map>

using GLScalarUniformSet = std::unordered_map<std::string, GLfloat>;

class GLPaintContext
{
    public:
    using Ptr = std::shared_ptr<GLPaintContext>;
    GLPaintContext();
    ~GLPaintContext();

    // Public static methods
    //// Initialize an object
    static Ptr Create();

    // Public methods
    void Draw();
    void Loop();

    void ReloadShader();
    void SaveCurrent();

    void StartDrag(double xpos, double ypos);
    void UpdateDrag(double xpos, double ypos);
    void EndDrag();
    void UpdateScroll(double yoff);

    // Static blobs
    private:
    static const char *m_shader_path;
    static const char *m_save_path;
    static const char *m_stub_vert_shader;
    
    // Private static methods
    //// Initialize GLEW and GLFW
    static void InitApiContext(Ptr &instance);
    //// Initialize framebuffers and renderbuffers used for OpenGL rendering
    static void InitFramebuffer(Ptr &instance);
    //// Initialize a blank canvas for a fragment shader
    static void InitCanvas(Ptr &instance);

    // Private instance methods
    private:

    // Private data members
    private:
    //// GLFW window
    GLFWwindow *m_window;
    //// gl vertex attribute buffers
    GLuint m_glbufs[2];
    //// gl frame buffers
    GLuint m_fbufs[1];
    //// gl render buffers: one for color and one for depth
    GLuint m_rbufs[2];
    //// shaders
    GLuint m_vshader, m_fshader, m_program;
    bool m_shader_created;
    //// uniforms
    GLScalarUniformSet m_uniforms;

    double m_drag_xpos, m_drag_ypos;
    GLfloat m_drag_translateX, m_drag_translateY;
    bool m_dragged;
};

#endif