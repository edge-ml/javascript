Module.onRuntimeInitialized = function() {  // Make sure EMSCRIPTEN_BINDINGS are called before we try to use them
    const vec = new Module.StringList();  // Allocates std::vector<std::string> which is managed by JS
    vec.push_back("hello");  // std::string and JavaScript strings are automatically interconverted
    vec.push_back("world");
    vec.push_back("1234");

    kl = new Module.Klass();
    kl.use_vector(vec);
    vec.delete();  // Required to avoid C++ memory leaks and undestructed object
}