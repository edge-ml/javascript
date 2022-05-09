const emscriptenLoader = require('../vendor/edge-fel/edge-fel.js')

const Module = require('../vendor/edge-fel/edge-fel')()

let _cachedExtractSome;
let _cachedFel;

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

const extractSome = exports.extractSome = async (arr) => {
    if (_cachedExtractSome) return _cachedExtractSome(arr);

    // from edge-fel#Benchmarker@Main.cpp
    const params = await objToMap({"mean_n_abs_max_n": 8, "change_quantile_lower": -0.1, "change_quantile_upper": 0.1, "change_quantile_aggr": 0, "range_count_lower": -1, "range_count_upper": 1, "count_above_x": 0, "count_below_x": 0, "quantile_q": 0.5, "autocorrelation_lag": 1})
    const features_tsfresh = await arrToVector(["abs_energy", "abs_sum_of_changes", "autocorrelation", "count_above", "count_above_mean", "count_below", "count_below_mean", "first_location_of_max",
    "first_location_of_min", "kurtosis", "last_location_of_max", "last_location_of_min", "max", "mean", "mean_abs_changes", "mean_changes", "median", "min", "zero_cross",
    "quantile", "range_count", "root_mean_square", "skewness", "std_dev", "sum", "var"], 'string')

    _cachedExtractSome = async (inArr) => {
        const values = await arrToVector(inArr);
        const delegate = await _getFel();
        const ret = delegate.extractSome(features_tsfresh, values, params)
        const retObj = mapToObj(ret);
        values.delete()
        ret.delete()
        return retObj;
    }
    return extractSome(arr)
}

const _getFel = async () => {
    if (_cachedFel) return _cachedFel;

    _cachedFel = new ((await Module).ExtractionDelegate)()
    return _getFel()
}