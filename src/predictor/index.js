const { interpolateLinear } = require('./interpolation')
const { extractSome, objToMap, arrToVector } = require("./fel")

function cache(fn){
    var NO_RESULT = Symbol("cache");
    var res = NO_RESULT;
    return function () {
        if(res === NO_RESULT) return (res = fn.apply(this, arguments));
        return res;
    };
}

const PredictorError = exports.PredictorError = class PredictorError extends Error {}

/**
 * @namespace
 * @property {(input: number[]) => number[]} predictor 
 * @property {string[]} sensors 
 * @property {number} windowSize 
 * @property {string[]} labels 
 * @property {{ [sensorName: string]: [number, number][] }} store
 */
const Predictor = exports.Predictor = class Predictor {
    /**
     * Predictor
     * @param {(input: number[]) => number[]} predictor 
     * @param {string[]} sensors 
     * @param {number} windowSize 
     * @param {string[]} labels 
     */
    constructor(predictor, sensors, windowSize, labels) {
        /** @type {(input: number[]) => number[]} */
        this.predictor = predictor;
        /** @type {string[]} */
        this.sensors = sensors;
        /** @type {number} */
        this.windowSize = windowSize;
        /** @type {string[]} */
        this.labels = labels; 

        /** @type {{ [sensorName: string]: [number, number][] }} sensorName: [timestamp, value][] */
        this.store = this.sensors.reduce((acc, cur) => {
            acc[cur] = [];
            return acc;
        }, {})
    }

    /**
     * addDatapoint
     * @param {string} sensorName 
     * @param {number} value 
     * @param {number | null} time use a predefined timestamp, or null if the timestamp should be generated
     */
    addDatapoint = (sensorName, value, time = null) => {
        if (typeof value !== 'number') throw new TypeError('Datapoint is not a number');
        if (!this.sensors.includes(sensorName)) throw new TypeError('Sensor is not valid');
        if (time === null) time = Date.now()

        this.store[sensorName].push([time, value]);

        this._updateStore()
    }

    /**
     * @private
     */
    _updateStore() {
        for (const sensorName of this.sensors) {
            if (this.store[sensorName].length > this.windowSize * 4) {
                this.store[sensorName] = this.store[sensorName].slice(-2 * this.windowSize)
            }
        }
    }

    predict = async () => {
        const samples = Predictor._merge(this.store, this.sensors);
        const interpolated = Predictor._interpolate(samples, this.sensors.length)
        const window = interpolated.slice(-this.windowSize)
        if (window.length < this.windowSize) {
            throw new PredictorError("Not enough samples")
        }

        console.log(window, await Predictor._extract(window, this.sensors.length))
        return window
    }

    /**
     * @param {{ [sensorName: string]: [number, number][] }} store
     * @param {string[]} sensors
     * @return {((number | null)[])[]} ((number | null)[]): [time, ...values], values in the ordering of this.sensors, null for missing values
     */
    static _merge(store, sensors) {
        /** @type {{ [time: number]: { [sensorName: string]: number } }} */
        const out = {};
        for (const sensorName of sensors) {
            for (const [time, value] of store[sensorName]) {
                out[time] = out[time] || {};
                out[time][sensorName] = value
            }
        }
        return Object.entries(out).map(([time, values]) => {
            const arr = [time];
            for (const sensorName of sensors) {
                arr.push(values[sensorName] || null)
            }
            return arr;
        }).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    }

    /**
     * from pandas: ‘linear’: Ignore the index and treat the values as *equally* spaced.
     * @param {((number | null)[])[]} frame
     * @param {number} sensorsLength
     * @return {(number[])[]}
     */
    static _interpolate(frame, sensorsLength) {
        const lists = []
        for (let i = 0; i < sensorsLength; i++) {
            const sensorValues = frame.map(x => x[i+1]);
            interpolateLinear(sensorValues)
            lists[i] = sensorValues;
        }

        return frame.map(([time], i) => {
            const arr = [time];
            for (let j = 0; j < sensorsLength; j++) {
                arr.push(lists[j][i])
            }
            return arr;
        })
    }

    /**
     * 
     * @param {(number[])[]} frame 
     * @param {number} sensorsLength
     * @returns {number[]}
     */
    static async _extract(frame, sensorsLength) {
        // cache these
        const felParams = await Predictor.felParams()
        const felFeaturesTSfresh = await Predictor.felFeaturesTSfresh()

        const feats = [] // [features, values]
        for (let i = 0; i < sensorsLength; i++) {
            const toF = frame.map(x => x[i+1]);
            const featureMap = await extractSome(felFeaturesTSfresh, toF, felParams)
            for (const [feat, val] of Object.entries(featureMap)) {
                feats.push([[i, feat], val])
            }
        }
        feats.sort(([[aI, aFeat]], [[bI, bFeat]]) => {
            if (aI !== bI) return aI - bI;
            return Predictor.featuresTSfresh.indexOf(aFeat) - Predictor.featuresTSfresh.indexOf(bFeat)
        })
        return [feats.map(x => x[0].join('__')), feats.map(x => x[1])]
    }
}

/** @type {string[]} features */
Predictor.featuresTSfresh = [
    "sum",
    "median",
    "mean",
    // "length", // FIXME: HUGE BUG HERE Nothing makes sense without this, but edge-fel doesn't have it
    "std_dev",
    "var",
    "root_mean_square",
    "max",
    // "absolute_maximum", // same here
    "min" 
]
Predictor.felParams = cache(() => objToMap({"mean_n_abs_max_n": 8, "change_quantile_lower": -0.1, "change_quantile_upper": 0.1, "change_quantile_aggr": 0, "range_count_lower": -1, "range_count_upper": 1, "count_above_x": 0, "count_below_x": 0, "quantile_q": 0.5, "autocorrelation_lag": 1}))
Predictor.felFeaturesTSfresh = cache(() => arrToVector(Predictor.featuresTSfresh, 'string'))