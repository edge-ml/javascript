#include <emscripten/bind.h>
#include <iostream>
#include <string>
#include <vector>

class Klass
{
public:
    Klass() {}
    void use_vector(std::vector<std::string> &);
};

void Klass::use_vector(std::vector<std::string> &vec)
{
    std::cout << "size() = " << vec.size() << ", capacity()=" << vec.capacity() << "\n";
    for (const auto &str : vec)
    {
        std::cout << "vec[]=|" << str << "|\n";
    }
}

// void use_vector_string(const std::vector<std::string> &vec)
// {
//     std::cout << "size() = " << vec.size() << ", capacity()=" << vec.capacity() << "\n";
//     for (const auto &str : vec)
//     {
//         std::cout << "vec[]=|" << str << "|\n";
//     }
// }

EMSCRIPTEN_BINDINGS(EmbindVectorStringDemo)
{
    emscripten::register_vector<std::string>("StringList");
    // emscripten::function("use_vector_string", &use_vector_string);
    emscripten::class_<Klass>("Klass")
        .constructor<>()
        .function("use_vector", &Klass::use_vector);
}