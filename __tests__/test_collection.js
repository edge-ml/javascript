const axios = require("axios").default;
jest.mock("axios");

const sendDataset = require("../src/index.js").sendDataset;
const datasetCollector = require("../src/index.js").datasetCollector;

const fakeDataset_One = {
  start: 1595506316,
  end: 1595506319,
  name: "fakeDataset_One",
  timeSeries: [
    {
      data: [
        { timestamp: 1595506316, datapoint: 1 },
        { timestamp: 1595506317, datapoint: 2 },
        { timestamp: 1595506318, datapoint: 3 },
        { timestamp: 1595506319, datapoint: 4 },
      ],
      offset: 0,
      name: "u1",
      unit: "t1",
      start: 1595506316,
      end: 1595506319,
      samplingRate: 2,
    },
  ],
};

afterEach(() => {
  jest.resetAllMocks();
});

describe("Sending whole dataset", () => {
  it("Success case", async () => {
    axios.post.mockImplementationOnce(() =>
      Promise.resolve({ status: 200, text: { message: "Generated dataset" } })
    );
    var collector = await sendDataset("fakeURL", "key", fakeDataset_One);
    expect(collector).toEqual("Generated dataset");
  });

  it("Url is wrong", async () => {
    axios.post.mockImplementationOnce(() =>
      Promise.reject({ text: { error: "Server Error" } })
    );
    sendDataset("fakeURL", "key", fakeDataset_One).catch((err) => {
      expect(err).toEqual({ text: { error: "Server Error" } });
    });
  });

  it("Key is wrong", async () => {
    axios.post.mockImplementationOnce(() =>
      Promise.reject({ status: 403, text: { error: "Invalid key" } })
    );
    sendDataset("fakeURL", "wrong_key", fakeDataset_One)
      .then(() => {
        expect(false).toEqual(true);
      })
      .catch((err) => {
        expect(err).toEqual({ status: 403, text: { error: "Invalid key" } });
      });
  });
});

describe("sending dataset in increments", () => {
  it("Error creating datasetCollector", async () => {
    axios.post.mockImplementation(() => Promise.reject({status: 400, text: { error: "fakeError" }}));
    datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      "testDataset",
      false
    ).catch((err) => {
      // console.log(err)
      expect(true);
    });
  });

  it("Error sending single datapoints", async () => {
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { datasetKey: "fake_key" }}));
    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    axios.post.mockImplementation(() => Promise.reject({status: 400, text: { error: "fake_error" }}));
    try {
      collector.addDataPoint(1618760114000, "accX", 1);
      await collector.onComplete();
    } catch (e) {
      // console.log(e);
      expect(e.message).toEqual("Could not upload data");
      //expect(e).toEqual({ status: 400, text: { error: "fake_error" } });
    }
  });

  it("Datapoint value is not a number", async () => {
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { datasetKey: "fake_key" }}));
    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    try {
      collector.addDataPoint(1618760114000, "accX", "not_a_number");
      await collector.onComplete();
    } catch (e) {
      expect(e.message).toEqual("Datapoint is not a number");
    }
  });

  it("Timestamp is not valid", async () => {
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { datasetKey: "fake_key" }}));
    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    try {
      collector.addDataPoint("not_valid", "accX", 23);
      await collector.onComplete();
    } catch (e) {
      expect(e.message).toEqual("Provide a valid timestamp");
    }
  });

  it("Use own timestamps", async () => {
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { datasetKey: "fake_key" }}));
    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { message: "Added data" }}));
    try {
      for (var i = 0; i < 10; i++) {
        collector.addDataPoint(1618760114000, "accX", 1);
      }
      await collector.onComplete();
    } catch (e) {
      fail(e);
    }
  });

  it("Use device time", async () => {
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { datasetKey: "fake_key" }}));
    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      true
    );
    expect(collector.error).toEqual(undefined);
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { message: "Added data" }}));
    try {
      for (var i = 0; i < 10; i++) {
        collector.addDataPoint("accX", 1);
      }
      await collector.onComplete();
    } catch (e) {
      fail(e);
    }
  });

  it("Trigger increment upload", async () => {
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { datasetKey: "fake_key" }}));
    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    axios.post.mockImplementation(() => Promise.resolve({status: 200, text: { message: "Added data" }}));
    try {
      for (var i = 0; i < 1001; i++) {
        collector.addDataPoint(i * 10, "accX", 1);
      }
      await collector.onComplete();
    } catch (e) {
      throw new Error("Test failed");
    }
  });
});
