const edgeml = require('.');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function () {
    try {
        collector = await edgeml.datasetCollector("http://localhost:3004", "11239024e8898864c3d51c9f6a1d5e88", "test_js", false, ["accX", "accY", "accZ"], { "testjs": "abc" }, "labeling_label");
        for (var i = 0; i < 1000; i++) {
            collector.addDataPoint(i*100, "accX", Math.sin(i/10));
            collector.addDataPoint(i*100, "accY", Math.cos(i/10));
            collector.addDataPoint(i*100, "accZ", Math.tan(i/10));
            await sleep(1)
        }
        await collector.onComplete();
    }
    catch (error) {
        console.log("ERROR")
        console.log(error)
    }
})()