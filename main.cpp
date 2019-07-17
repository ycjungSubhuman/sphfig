/* Written by Yucheol Jung <ycjung@postech.ac.kr>. July 17th, 2019. */

#include <vector>
#include <string>
#include <iostream>

#include "paint.h"

int main(int argc, char **argv)
{
    auto context = GLPaintContext::Create();
    context->Loop();
    return 0;
}