#version 430

#define VERY_FAR_DISTANCE (10000)

/* Written by Yucheol Jung <ycjung@postech.ac.kr>. July 17th, 2019. */

in vec2 uv; // uv coordinate
out vec4 color;

// current aspect ratio of the screen
uniform float aspect_ratio;
// current global translattion
uniform float translateX;
uniform float translateY;
// current global scale
uniform float scale;

void main()
{
    float d = sqrt(uv.x*uv.x + uv.y*uv.y);
    color = vec4(d, d, 0.0, 1.0);
}
