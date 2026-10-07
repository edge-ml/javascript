const before = {
    uncaughtException: process.listenerCount("uncaughtException"),
    unhandledRejection: process.listenerCount("unhandledRejection"),
};
const edgeML = require("../dist/index");

describe("Package exports", () => {
    it("exposes the documented API", () => {
        for (const name of [
            "datasetCollector", "sendDataset",
            "listPipelines", "trainModel", "startTraining", "waitForModel", "getModel", "listModels",
            "loadModel", "OnnxPredictor", "PredictorError",
        ]) {
            expect(typeof edgeML[name]).toBe("function");
        }
    });

    it("PredictorError is an Error", () => {
        expect(new edgeML.PredictorError("x")).toBeInstanceOf(Error);
    });

    it("does not install process-wide error handlers", () => {
        expect(process.listenerCount("uncaughtException")).toBe(before.uncaughtException);
        expect(process.listenerCount("unhandledRejection")).toBe(before.unhandledRejection);
    });
});
