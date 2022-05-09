const fs = require('fs')
const { Predictor } = require('../src/predictor')
const { score } = require('./model_javascript')

const p = new Predictor(
    (input) => score(input),
    ['ACC_x', 'ACC_y', 'GYRO_x', 'ACC_z', 'GYRO_y', 'GYRO_z'],
    50,
    ['6278fb975ebd3c0013327e63', '6278fb975ebd3c0013327e64']
)

const test = csvToArray(fs.readFileSync('./test.csv', { encoding:'utf8' }))

async function runner() {
    for (const { time, ...valObjs } of test) {
        for (const [key, valStr] of Object.entries(valObjs)) {
            p.addDatapoint(key, parseInt(valStr), parseInt(time))
        }
    
        try {
            const x = await p.predict()
            console.log(x)
            await sleep(250)
        } catch(e) {
            console.log(e)
        }
    }
}
runner();

function csvToArray(str, delimiter = ",") {
    const headers = str.slice(0, str.indexOf("\n")).split(delimiter);
    const rows = str.slice(str.indexOf("\n") + 1).split("\n");
    const arr = rows.map(function (row) {
        const values = row.split(delimiter);
        const el = headers.reduce(function (object, header, index) {
            object[header] = values[index];
            return object;
        }, {});
        return el;
    });
    return arr;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}