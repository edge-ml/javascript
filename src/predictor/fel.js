const emscriptenLoader = require('../vendor/edge-fel/edge-fel.js')

const Module = require('../vendor/edge-fel/edge-fel')()

let _cachedExtractSome;
let _cachedFel;

const arrToVector = exports.arrToVector = async (arr, type = 'float') => {
    const v = new ((await Module)[`vector${type}`])()
    for (const val of arr) {
        v.push_back(val)
    }
    return v;
}

const vectorToArr = exports.vectorToArr = (vector) => new Array(vector.size()).fill(0).map((_, i) => vector.get(i))

const objToMap = exports.objToMap = async (obj, type = 'float') => {
    const m = new ((await Module)[`mapstring${type}`])()
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

const extractSome = exports.extractSome = async (features, inArr, params) => {
    const values = await arrToVector(inArr);
    const delegate = await _getFel();
    const ret = delegate.extractSome(features, values, params)
    const retObj = mapToObj(ret);
    values.delete()
    ret.delete()
    return retObj;
}

const _getFel = async () => {
    if (_cachedFel) return _cachedFel;

    _cachedFel = new ((await Module).ExtractionDelegate)()
    return _getFel()
}