const { Predictor } = require('./src/predictor')

const p = new Predictor(
    null,
    ['ACC_RAW_z', 'ACC_RAW_y', 'ACC_RAW_x'],
    5,
    null
)

const z = [   5, null, null, null, null, null, null,   45, null,   49]
const y = [null, null,    9,   10,   11,   12, null,    1, null,   2]
const x = [   5,    6, null,   41,   42,   43,   44,   45,   46, null]
let i = 0;

setInterval(() => {
    const time = 1652044007265 + i * 1000
    z[i] && p.addDatapoint('ACC_RAW_z', z[i], time)
    y[i] && p.addDatapoint('ACC_RAW_y', y[i], time)
    x[i] && p.addDatapoint('ACC_RAW_x', x[i], time)
    i++

    p.predict()
        .then(x => console.log(x))
        .catch(e => console.log(e.message))
}, 1000)