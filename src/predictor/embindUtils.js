const emscriptenLoader = require('../vendor/edge-fel/edge-fel.js')

const arrToVector = exports.arrToVector = async (arr, type = 'float') => {
    const v = new ((await emscriptenLoader())[`vector${type}`])()
    for (const val of arr) {
        v.push_back(val)
    }
    return v;
}

const vectorToArr = exports.vectorToArr = (vector) => new Array(vector.size()).fill(0).map((_, i) => vector.get(i))

const objToMap = exports.objToMap = async (obj, type = 'float') => {
    const m = new ((await emscriptenLoader())[`mapstring${type}`])()
    for (const [key, val] of Object.entries(obj)) {
        m.set(key, val)
    }
    return m;
}

const mapToObj = exports.mapToObj = (map) => {
    const obj = {}
    const keys = vectorToArr(map.keys())
    for (const key of keys) {
        obj[key] = map.get(key)
    }
    return obj
}