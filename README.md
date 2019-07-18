This is a general framework for fragment-shader-based figure drawing

By manipulating pixels directly, you can paint any surface you want.

With great power comes great responsibility. You have to implement all of the following:

1. Geometry representation (usually as signed distance functions)
1. Composition of a scene
1. Blending different objects in the scene
1. Antialiasing

However, if you plan to draw only simple primitives like circles, lines, and ovals. You might want to consider using `cairo` project. It provides beautiful line
drawings.

## Usage

Put a `shader.frag` file next to the executable. Edit the shader and reload to draw things. Save as PNG if you want.

Check `sample_shader.frag` and `shader.frag` to see provided uniforms and attributes, 

* Mouse drag (left button) - change `translateX` and `translateY`
* Mouse scroll - modify `scale`
* S key - save current figure as `fig.png`
* R key - reload shader `shader.frag`. Use this after updating the shader

## Build requirement

* A C++ compiler with C++17 spec support
* A GPU with OpenGL >= 4.6 support
* glfw3
* glew
* libpng

## Build

Use `cmake` to process CMakeLists.txt and generate a project for your toolchains.

### Linux

Install `gcc, make, glfw3, glew, libpng, mesa` and run `cmake . && make`

### Windows

#### If you are using `vcpkg` package manager for Windows

Install `glfw, glew, libpng` and configure vcpkg with your build system
(see https://github.com/microsoft/vcpkg)

#### If you are using VS

1. Open your web browser, download `glfw3, glew, libpng`. 
1. Install all the dependencies.
1. Install all the dependencies of the dependencies (i.e. libzlib).
1. Install and open `cmake-gui`. Configure to generate a VS project. 
1. It might stop while configuring. Find all the missing variables.
1. Open up the project. Build all.
