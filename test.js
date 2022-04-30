const sendDataset = require("./index.js").sendDataset;
const datasetCollector = require("./index.js").datasetCollector;

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

const mockFetch = (status, text) => {
  if (!text) {
    globalThis.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        status: status,
      })
    );
  } else {
    globalThis.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        status: status,
        text: () => {
          return Promise.resolve(JSON.stringify(text));
        },
      })
    );
  }
};

afterEach(() => {
  jest.resetAllMocks();
});

describe("Testing postData", () => {});

describe("Sending whole dataset", () => {
  it("Success case", async () => {
    mockFetch(200, { message: "Generated dataset" });
    var collector = await sendDataset("fakeURL", "key", fakeDataset_One);
    expect(collector).toEqual("Generated dataset");
  });

  it("Url is wrong", async () => {
    mockFetch(500);
    sendDataset("fakeURL", "key", fakeDataset_One).catch((err) => {
      expect(err).toEqual({ text: { error: "Server Error" } });
    });
  });

  it("Key is wrong", async () => {
    mockFetch(403, { error: "Invalid Key" });
    sendDataset("fakeURL", "wrong_key", fakeDataset_One)
      .then(() => {
        expect(false).toEqual(true);
      })
      .catch((err) => {
        expect(err).toEqual({ status: 403, text: { error: "Invalid Key" } });
      });
  });
});

describe("sending dataset in increments", () => {
  // axios.post.mockImplementation(() => Promise.reject({ error: "fakeError" }));
  it("Error creating datasetCollector", async () => {
    mockFetch(400, { error: "fake_error" });
    datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      "testDataset",
      false
    ).catch(() => {
      expect(true);
    });
  });

  it("Error sending single datapoints", async () => {
    mockFetch(200, { datasetKey: "fake_key" });
    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    mockFetch(400, { error: "fake_error" });
    try {
      collector.addDataPoint(1618760114000, "accX", 1);
      await collector.onComplete();
    } catch (e) {
      console.log(e);
      expect(e.message).toEqual("Could not upload data");
      //expect(e).toEqual({ status: 400, text: { error: "fake_error" } });
    }
  });

  it("Datapoint value is not a number", async () => {
    mockFetch(200, { datasetKey: "fake_key" });
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
    mockFetch(200, { datasetKey: "fake_key" });
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
    mockFetch(200, { datasetKey: "fakeDeviceKey" });

    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    mockFetch(200, { message: "Added data" });

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
    mockFetch(200, { datasetKey: "fakeDeviceKey" });

    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      true
    );
    expect(collector.error).toEqual(undefined);
    mockFetch(200, { message: "Added data" });

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
    mockFetch(200, { datasetKey: "fakeDeviceKey" });

    var collector = await datasetCollector(
      "fakeURL",
      "fakeKey",
      "fake_name",
      false
    );
    expect(collector.error).toEqual(undefined);
    mockFetch(200, { message: "Added data" });

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
