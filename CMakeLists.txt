project(sphfig)
cmake_minimum_required(VERSION 3.11)
set(CMAKE_CXX_STANDARD 17)

find_package(OpenGL REQUIRED)
find_package(PNG REQUIRED)
find_package(GLEW REQUIRED)
find_package(glfw3 REQUIRED)

add_executable(main main.cpp paint.cpp)
target_link_libraries(main stdc++fs OpenGL::GL ${GLEW_LIBRARIES} glfw ${PNG_LIBRARY})