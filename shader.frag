#version 430

#define VERY_FAR_DISTANCE (10000)
#define PI (3.14159265359)

/* Written by Yucheol Jung <ycjung@postech.ac.kr>. July 17th, 2019. */

in vec2 uv; // uv coordinate. left-bottom is (0,0). top-right is (1,1)
out vec4 color; // resulting color

/* Uniforms */
/*   These values are supplied from CPU. check paint.cpp */
// current aspect ratio of the screen
uniform float aspect_ratio;
// current global translattion
uniform float translateX;
uniform float translateY;
// current global scale
uniform float scale;

/*****************************************************************************/ 
/* Variables */
/*****************************************************************************/ 

const vec3 color_white = vec3(1.0, 1.0, 1.0);
const vec3 color_black = vec3(0.0, 0.0, 0.0);
const vec3 color_red = vec3(1.0, 0.0, 0.0);
const vec3 color_green = vec3(0.0, 1.0, 0.0);
const vec3 color_blue = vec3(0.0, 0.7, 1.0);
const vec3 color_blue2 = vec3(0.0, 0.3, 1.0);
const vec3 color_green2 = vec3(0.2, 1.0, 0.3);

struct Style {
    vec4 color;
    float width;
};

const Style normal_border = Style(vec4(color_white, 1.0), 0.005);
const Style thin_border = Style(vec4(color_white, 1.0), 0.002);
const Style ray1 = Style(vec4(color_red, 0.6), 0.003);
const Style ray2 = Style(vec4(color_green2, 1.0), 0.0025);
const Style ray3 = Style(vec4(color_blue, 0.4), 0.003);
const Style normal_point = Style(vec4(color_blue, 1.0), 0.015);
const Style small_point = Style(vec4(color_blue, 1.0), 0.008);
const Style point2 = Style(vec4(color_green2, 1.0), 0.015);
const Style middleline = Style(vec4(color_green, 1.0), 0.0030);
const Style weakline = Style(vec4(color_white, 0.5), 0.003);

/*****************************************************************************/ 
/* Geometry Primitives */
/*****************************************************************************/ 

// A 2D line of form
//   a*x + b*y + c = 0
struct Line {
    float a;
    float b;
    float c;
};

// A 2D line segment that starts at `a` and ends at `b`
struct Segment {
    vec2 a;
    vec2 b;
};

// A 2D circle
struct Circle {
    vec2 center;
    float radius;
};

/*****************************************************************************/ 
/* Collision checking tools */
/*****************************************************************************/ 

// Get the position of intersections

//// Line vs. line
vec2 intersection(Line line1, Line line2) 
{
    mat2 A = mat2(line1.a, line2.a, line1.b, line2.b);
    vec2 b = vec2(-line1.c, -line2.c);
    vec2 x = inverse(A)*b;
    return x;
}

//// Solve a*x*x + b*x + c = 0
vec2 solve_equation2(float a, float b, float c)
{
    float det = sqrt(b*b - 4*a*c);
    return vec2((-b-det) / (2*a), (-b+det) / (2*a));
}

//// Line vs. circle
////   'inter' stands for intersection
void circle_intersection(Line line, Circle circle, inout vec2 inter[2])
{
    float a = (line.a*line.a) / (line.b*line.b) + 1.;
    float b = 2*(circle.center.y + line.c/line.b)*(line.a/line.b) - 2*(circle.center.x);
    float c = pow(circle.center.y+line.c/line.b, 2.0) + (circle.center.x*circle.center.x) 
        - circle.radius*circle.radius;
    vec2 x = solve_equation2(a, b, c);
    inter[0] = vec2(x.x, -(line.a*x.x + line.c) / line.b);
    inter[1] = vec2(x.y, -(line.a*x.y + line.c) / line.b);
}

// Converts a `Segment` instance to a `Line` instance
Line seg2line(Segment seg)
{
    float slope = (seg.b.y - seg.a.y) / (seg.b.x - seg.a.x);
    float a = slope;
    float b = -1;
    float c = -slope*seg.a.x + seg.a.y;
    return Line(a, b, c);
}

/*****************************************************************************/ 
/* Trasnformation tools */
/*****************************************************************************/ 

// converts a uv coordinate to a zero-centered uv coordinate (cuv)
vec2 uv2cuv(vec2 uv)
{
    vec2 cuv = vec2(2.0*(uv.x-0.5), 2.0*(uv.y-0.5));
    cuv.x *= aspect_ratio;
    return cuv;
}

// converts a cuv to a translated cuv (tcuv)
vec2 cuv2tcuv(vec2 cuv)
{
    return cuv - vec2(translateX, translateY);
}

// converts a tcuv to a scaled tcuv (stcuv)
vec2 tcuv2stcuv(vec2 tcuv)
{
    return (1./(scale))*tcuv;
}

/*****************************************************************************/ 
/* Rendering tools */
/*****************************************************************************/ 

// A soft version of (if (value > th) then 1.0 else 100)
float smoothcut(float th, float value)
{
    return 100*smoothstep(th-0.0000001, th, -value) + 
        smoothstep(th, th+0.0000001, value);
}

// draw border from distance function values. A border is 
vec4 db(float d, float width, vec4 color, vec4 base)
{
    float aaf = 1.*fwidth(d); // antialiasing width
    float alpha = 1.0-smoothstep(width*(1/scale)-aaf, (width+0.0010)*(1/scale), d);
    vec3 c = mix(base.rgb, color.rgb, alpha);
    return vec4(mix(base.rgb, c, color.a), 1.0);
}

// distance function of an upper circle
float dist_upper_circle(Circle circle, vec2 uv)
{
    float x = uv.x - circle.center.x;
    float y = uv.y - circle.center.y;

    float d = smoothcut(0, y)*abs(circle.radius - sqrt(x*x + y*y));
    return d;
}

// distance function of a line
float dist_line(Line line, vec2 uv)
{
    return abs(line.a*uv.x + line.b*uv.y + line.c) / sqrt(line.a*line.a + line.b*line.b);
}

// distance function of a line segment
float dist_segment(Segment seg, vec2 uv)
{
    Line line = seg2line(seg);
    float q = dot(uv-seg.a,uv-seg.b);
    return smoothcut(0, -q) * dist_line(line, uv);
}

// distance function of a half line segment starting at 'seg.a'
float dist_halfsegment(Segment seg, vec2 uv)
{
    Line line = seg2line(seg);
    float q = dot(uv-seg.a,seg.b-seg.a);
    return smoothcut(0, q) * dist_line(line, uv);
}

// distance function of a point
float dist_point(vec2 p, vec2 uv)
{
    return distance(p, uv);
}

/*****************************************************************************/ 
/* Project-specific code */
/*   
/*   Write your code here
/*****************************************************************************/ 

// comment ENABLE_VERSION1 to disable version 1 line
#define ENABLE_VERSION1
// comment ENABLE_VERSION2 to disable version 2 points and lines
#define ENABLE_VERSION2

const float FOV_half_rad = PI / 3.0;
const vec3 color_background = color_black;

// A parametric representation of the middle curve between the circle and 
// the projection plane in version 1
vec2 jinwoong_curve(float t, float alpha)
{
    return vec2(
        (1-alpha)*tan(FOV_half_rad)*t/FOV_half_rad + alpha*sin(t),
        (1-alpha)+alpha*cos(t));
}

// Produces the three objects for the scene:
//   point_inter_lineoriginprojdiv_circle: 
//     the intersection between a line that connects the dividing point 
//     in the projection plane and the circle.
//   point_lee: 
//     the middle point (slerp) between point_inter_lineoriginprojdiv_circle and
//     a point on the circle with rad_mod detree starting from y-axis
//   seg_pointoriginlee: 
//     the line segment connecting between the origin and the `point_lee`
//   
//   arguments)
//     circle: the main circle
//     point_projdiv: a point on the projection plane
//     rad_div: The radian value for the point on the circle (starts from y-axis)
void get_lee_geometry(
    float ratio, Circle circle, vec2 proj_endpoint,
    inout vec2 point_inter_lineoriginprojdiv_circle, 
    inout vec2 point_lee, inout Segment seg_pointoriginlee)
{
    float radius = circle.radius;
    vec2 point_projdiv = mix(vec2(0,radius), proj_endpoint, ratio);
    float rad_div = FOV_half_rad*ratio;

    Segment seg_origin_projdiv = Segment(vec2(0,0), point_projdiv);
    Line line_origin_projdiv = seg2line(seg_origin_projdiv);

    vec2 cand_inter_lineoriginprojdiv[2]; // cand := candidate
    circle_intersection(line_origin_projdiv, circle, cand_inter_lineoriginprojdiv);
    point_inter_lineoriginprojdiv_circle = cand_inter_lineoriginprojdiv[0];

    float rad_inter = atan(-point_inter_lineoriginprojdiv_circle.x, point_inter_lineoriginprojdiv_circle.y);
    float rad_mid = (rad_inter + rad_div)*0.5;
    point_lee = vec2(-radius*sin(rad_mid), radius*cos(rad_mid));
    seg_pointoriginlee = Segment(vec2(0,0), point_lee);
}

void get_div_geometry(
    float ratio, Circle circle, vec2 proj_endpoint,
    inout Line line_divcircle, inout vec2 point_inter_linedivcircle_circle,
    inout vec2 point_div_interfovproj_top, inout vec2 point_mid_proj_circle,
    inout Segment line_mid_proj_circle)
{
    float radius = circle.radius;

    // Calculate the div segment of the half FOV cirlce segment
    line_divcircle = seg2line(Segment(vec2(0,0), vec2(tan(-FOV_half_rad*ratio),1)));
    vec2 cand_inter_linedivcircle_circle[2];
    circle_intersection(line_divcircle, circle, cand_inter_linedivcircle_circle); 
    point_inter_linedivcircle_circle = cand_inter_linedivcircle_circle[0];

    // Calculate the div segment of the half FOV projection plane segment
    point_div_interfovproj_top = 
        mix(vec2(0.0, radius), proj_endpoint, ratio);

    // Calculate the middle point of
    //   * point_inter_linedivcircle_circle
    //   * point_div_interfovproj_top
    point_mid_proj_circle = 
        mix(point_inter_linedivcircle_circle, point_div_interfovproj_top, 0.5);
    //// The line connecting the two points
    line_mid_proj_circle = 
        Segment(point_inter_linedivcircle_circle, point_div_interfovproj_top);
}

vec4 draw_scene(vec2 uv)
{
    /*----------------------------- Variable declaration */
    vec4 bg = vec4(color_background, 1.0);

    float radius = 1.0;

    Line axis_x, axis_y;
    // The main circle
    Circle circle;
    // The line for a projection plane
    Line line_proj;
    // The half-line segments for FOV
    Segment seg_fovright;
    Segment seg_fovleft;
    //// FOV vs. the circle
    vec2 point_inter_fov_proj;
    //// FOV vs. the projection plane
    vec2 point_inter_fov_circle;

    Line line_divcircle1, line_divcircle2;
    vec2 point_inter_linedivcircle_circle1, point_inter_linedivcircle_circle2;
    vec2 point_div_interfovproj_top1, point_div_interfovproj_top2; 
    vec2 point_mid_proj_circle1, point_mid_proj_circle2;
    Segment line_mid_proj_circle1, line_mid_proj_circle2;

    /*----------------------------- Basic setup */
    axis_x = Line(0., 1., 0.);
    axis_y = Line(1., 0., 0.);
    circle = Circle(vec2(0.0, 0.0), radius);
    line_proj = Line(0., 1., -radius);
    seg_fovright = Segment(vec2(0,0),vec2(tan(FOV_half_rad),1));
    seg_fovleft = Segment(vec2(0,0),vec2(tan(-FOV_half_rad),1));

    /*----------------------------- Common intersections */
    // Calculate the intersection between the FOV lines and the main circle
    vec2 cand_inter_fov_circle[2];
    circle_intersection(seg2line(seg_fovleft), circle, cand_inter_fov_circle); 
    point_inter_fov_proj = intersection(line_proj, seg2line(seg_fovleft));
    point_inter_fov_circle = cand_inter_fov_circle[0];

    get_div_geometry(0.5, circle, point_inter_fov_proj,
        line_divcircle1, point_inter_linedivcircle_circle1,
        point_div_interfovproj_top1, point_mid_proj_circle1,
        line_mid_proj_circle1);
    get_div_geometry(0.75, circle, point_inter_fov_proj,
        line_divcircle2, point_inter_linedivcircle_circle2,
        point_div_interfovproj_top2, point_mid_proj_circle2,
        line_mid_proj_circle2);

    // draw onto current image. 
    //   __df: a distance function
    //   __geom: a geometry primitive struct
    //   __style: a style struct
    #define Draw(__df,__geom,__style) (bg=db(__df(__geom,uv),__style.width,__style.color,bg));

    /*----------------------------- Common draw */
    // basic
    Draw(dist_line, axis_x, weakline);
    Draw(dist_line, axis_y, weakline);
    Draw(dist_upper_circle, circle, normal_border);
    Draw(dist_line, line_proj, normal_border);
    Draw(dist_halfsegment, seg_fovleft, ray1);
    Draw(dist_halfsegment, seg_fovright, ray1);
    // half
    Draw(dist_segment, line_mid_proj_circle1, weakline);
    Draw(dist_point, point_inter_linedivcircle_circle1, normal_point);
    Draw(dist_point, point_div_interfovproj_top1, normal_point);
    Draw(dist_point, point_mid_proj_circle1, small_point);
    // quarter
    Draw(dist_segment, line_mid_proj_circle2, weakline);
    Draw(dist_point, point_inter_linedivcircle_circle2, normal_point);
    Draw(dist_point, point_div_interfovproj_top2, normal_point);
    Draw(dist_point, point_mid_proj_circle2, small_point);

    /*----------------------------- Version-specific draw */
#ifdef ENABLE_VERSION1
    // Draw the parametric curve of version 1 by drawing multiple line segments
    vec2 prev = jinwoong_curve(-FOV_half_rad, 0.5);
    int quant = 20; // quantization level
    for(int i=-quant+1; i<=quant; i++)
    {
        float t = i * FOV_half_rad / quant;
        vec2 p = jinwoong_curve(t, 0.5);
        Segment seg = Segment(prev, p);
        vec2 rp = prev;
        prev = p;
        Draw(dist_segment, seg, middleline);
        // Fill in the gaps between segments
        Draw(dist_point, rp, middleline);
    }
#endif

#ifdef ENABLE_VERSION2
    vec2 point_inter_lineoriginprojdiv_circle1, point_inter_lineoriginprojdiv_circle2;
    vec2 point_lee1, point_lee2;
    Segment seg_pointoriginlee1, seg_pointoriginlee2;
    // half
    get_lee_geometry(
        0.5, circle, point_inter_fov_proj, 
        point_inter_lineoriginprojdiv_circle1, point_lee1, seg_pointoriginlee1);
    // quarter
    get_lee_geometry(
        0.75, circle, point_inter_fov_proj, 
        point_inter_lineoriginprojdiv_circle2, point_lee2, seg_pointoriginlee2);

    Draw(dist_point, point_inter_lineoriginprojdiv_circle1, small_point);
    Draw(dist_point, point_lee1, point2);
    Draw(dist_halfsegment, seg_pointoriginlee1, ray2);

    Draw(dist_point, point_inter_lineoriginprojdiv_circle2, small_point);
    Draw(dist_point, point_lee2, point2);
    Draw(dist_halfsegment, seg_pointoriginlee2, ray2);
#endif

    return bg;
}

/**
 * Main routine
 *
 *   main() is a function that assigns an RGBA color value to `color` variable.
 *   The whole purpose of this script is to produce the `color` value for 
 *   a given `uv` coordinate.
 */
void main()
{
    vec2 stcuv = tcuv2stcuv(cuv2tcuv(uv2cuv(uv)));
    vec3 color_bg = color_white;
    color = draw_scene(stcuv);
}
