const { Predictor } = require('../src/predictor')

let p, z, y, x, time

beforeEach(() => {
    p = new Predictor(
        null,
        ['ACC_RAW_z', 'ACC_RAW_y', 'ACC_RAW_x'],
        5,
        null
    )

    z = [   5, null, null, null, null, null, null,   45, null,   49]
    y = [null, null,    9,   10,   11,   12, null,    1, null,   2]
    x = [   5,    6, null,   41,   42,   43,   44,   45,   46, null]

    time = 1652044007265
});

describe('Interpolation', () => {
    it('Samples get interpolated correctly (all)', () => {
        let i = 0;
        while (i < x.length) {
            const t = time + i * 1000
            z[i] && p.addDatapoint('ACC_RAW_z', z[i], t)
            y[i] && p.addDatapoint('ACC_RAW_y', y[i], t)
            x[i] && p.addDatapoint('ACC_RAW_x', x[i], t)
            i++
        }
    
        const samples = Predictor._merge(p.store, p.sensors)
        const interp = Predictor._interpolate(samples, p.sensors.length)
    
        expect(JSON.stringify(interp)).toEqual('[["1652044007265",5,9,5],["1652044008265",10.714285714285715,9,6],["1652044009265",16.428571428571427,9,23.5],["1652044010265",22.142857142857142,10,41],["1652044011265",27.857142857142854,11,42],["1652044012265",33.57142857142858,12,43],["1652044013265",39.285714285714285,6.5,44],["1652044014265",45,1,45],["1652044015265",47,1.5,46],["1652044016265",49,2,46]]')
    })

    it('Samples get interpolated correctly (before window)', () => {
        let i = 0;
        while (i < 4) {
            const t = time + i * 1000
            z[i] && p.addDatapoint('ACC_RAW_z', z[i], t)
            y[i] && p.addDatapoint('ACC_RAW_y', y[i], t)
            x[i] && p.addDatapoint('ACC_RAW_x', x[i], t)
            i++
        }
    
        const samples = Predictor._merge(p.store, p.sensors)
        const interp = Predictor._interpolate(samples, p.sensors.length)
    
        expect(JSON.stringify(interp)).toEqual('[["1652044007265",5,9,5],["1652044008265",5,9,6],["1652044009265",5,9,23.5],["1652044010265",5,10,41]]')
    })

    it('Samples get interpolated correctly (after window)', () => {
        let i = 0;
        while (i < 7) {
            const t = time + i * 1000
            z[i] && p.addDatapoint('ACC_RAW_z', z[i], t)
            y[i] && p.addDatapoint('ACC_RAW_y', y[i], t)
            x[i] && p.addDatapoint('ACC_RAW_x', x[i], t)
            i++
        }
    
        const samples = Predictor._merge(p.store, p.sensors)
        const interp = Predictor._interpolate(samples, p.sensors.length)
    
        expect(JSON.stringify(interp)).toEqual('[["1652044007265",5,9,5],["1652044008265",5,9,6],["1652044009265",5,9,23.5],["1652044010265",5,10,41],["1652044011265",5,11,42],["1652044012265",5,12,43],["1652044013265",5,12,44]]')
    })
})
