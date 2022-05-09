const Module = require('./output')()

const arrToVector = async (arr, type = 'float') => {
    const v = new ((await Module)[`vector${type}`])()
    for (const val of arr) {
        v.push_back(val)
    }
    return v;
}

const vectorToArr = (vector) => new Array(vector.size()).fill(0).map((_, i) => vector.get(i))

const objToMap = async (obj, type = 'float') => {
    const m = new ((await Module)[`mapstring${type}`])()
    for (const [key, val] of Object.entries(obj)) {
        m.set(key, val)
    }
    return m;
}

const mapToObj = (map) => {
    const obj = {}
    const keys = vectorToArr(map.keys())
    for (const key of keys) {
        obj[key] = map.get(key)
    }
    return obj
}

async function aa () {  // Make sure EMSCRIPTEN_BINDINGS are called before we try to use them
    const vec = await arrToVector(['aaa', 'bbbb', 'ccccc'], 'string')

    kl = new (await Module).Klass();
    kl.use_vector(vec);
    vec.delete();  // Required to avoid C++ memory leaks and undestructed object
}
aa()