This is a general framework for fragment-shader-based figure drawing

## Usage

Put a `shader.frag` file next to the executable. Edit the shader and reload to draw things. Save as PNG if you want.

Check `sample_shader.frag` to see provided uniforms and attributes, 

* Mouse drag (left button) - translates current figure
* Mouse scroll - modify scale of current figure
* S key - save current figure as `fig.png`
* R key - reload shader `shader.frag`. Use this after updating the shader

## Build requirement

* A GPU with OpenGL >= 4.6 support
* glfw3
* glew
* libpng

## Build

Use `cmake` to process CMakeLists.txt and generate a project for your toolchains.
