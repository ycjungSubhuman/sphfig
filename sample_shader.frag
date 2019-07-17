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

/*****************************************************************************/ 
/* Geometry Primitives */
/*****************************************************************************/ 

// A 2D point
struct Point {
    float x;
    float y;
};

// A 2D line of form
//   a*x + b*y + c = 0
struct Line {
    float a;
    float b;
    float c;
};

// A 2D circle
struct Circle {
    Point center;
    float radius;
};

/*****************************************************************************/ 
/* Collision checking tools */
/*****************************************************************************/ 

// Get the position of an intersection
//   If the intersection does not exist, 
//   returns Point(VERY_FAR_DISTANCE, VERY_FAR_DISTANCE)

//// Line vs. line
////   'inter' stands for intersection
void intersection(Line line1, Line line2, vec2 inter[1]) {

}

//// Line vs. circle
void intersection(Line line, Circle circle, vec2 inter[2])
{

}

/*****************************************************************************/ 
/* Trasnformation tools */
/*****************************************************************************/ 

// convert a uv coordinate to a zero-centered uv coordinate
vec2 uv2cuv(vec2 uv)
{
    return uv;
}


/*****************************************************************************/ 
/* Rendering Primitives */
/*****************************************************************************/ 

struct RPoint {
    Point goem;
    vec4 color;
    float width;
};

struct RLine {
    Line geom;
    vec4 color;
    float width;
};

struct RCircle { // 'R' stands for 'Rendered'
    Circle geom;
    vec4 color;
    float width;
};

/*****************************************************************************/ 
/* Rendering tools */
/*****************************************************************************/ 

float draw_point(vec2 pos)
{
    return 0.0;
}

void main()
{
    vec2 cuv = uv2cuv(uv);
    color = vec4(uv.x, uv.y, 0.0, 1.0);
}
