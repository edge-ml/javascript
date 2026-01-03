const axios = require("axios");
const edgeML = require("../dist/index.js");

const BASE_URL = process.env.BACKEND_URL || "http://backend:8000";
const TIMEOUT = 10000;
jest.setTimeout(60000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBackend() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const res = await axios.get(`${BASE_URL}/docs`, { timeout: 2000 });
      if (res.status === 200) {
        return;
      }
    } catch (err) {
      // ignore until ready
    }
    await sleep(1000);
  }
  throw new Error("Backend did not become ready in time");
}

function newUser() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    username: `test_${suffix}`,
    email: `test_${suffix}@example.com`,
    password: "testpassword",
  };
}

async function registerAndLogin() {
  const user = newUser();
  const registerBody = new URLSearchParams();
  registerBody.set("username", user.username);
  registerBody.set("email", user.email);
  registerBody.set("password", user.password);

  const regRes = await axios.post(`${BASE_URL}/api/v1/auth/register`, registerBody, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: TIMEOUT,
  });
  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${regRes.status} ${regRes.data}`);
  }

  const loginBody = new URLSearchParams();
  loginBody.set("username", user.username);
  loginBody.set("password", user.password);

  const loginRes = await axios.post(`${BASE_URL}/api/v1/auth/token`, loginBody, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: TIMEOUT,
  });
  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status} ${loginRes.data}`);
  }
  return loginRes.data.access_token;
}

async function createProject(accessToken) {
  const res = await axios.post(
    `${BASE_URL}/api/v1/projects/`,
    { name: `js-it-${Date.now()}` },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: TIMEOUT,
    }
  );
  if (res.status !== 201) {
    throw new Error(`Project creation failed: ${res.status} ${res.data}`);
  }
  return res.data.id;
}

async function enableExternalApi(projectId, accessToken) {
  const switchRes = await axios.post(
    `${BASE_URL}/api/v1/${projectId}/external_api/switch/true`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: TIMEOUT }
  );
  if (switchRes.status !== 200 && switchRes.status !== 201) {
    throw new Error(`Enable external api failed: ${switchRes.status} ${switchRes.data}`);
  }

  const keyRes = await axios.put(
    `${BASE_URL}/api/v1/${projectId}/external_api/`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` }, timeout: TIMEOUT }
  );
  if (keyRes.status !== 200) {
    throw new Error(`Key generation failed: ${keyRes.status} ${keyRes.data}`);
  }
  return { readKey: keyRes.data.read_key, writeKey: keyRes.data.write_key };
}

async function setupKeys() {
  const accessToken = await registerAndLogin();
  const projectId = await createProject(accessToken);
  return enableExternalApi(projectId, accessToken);
}

beforeAll(async () => {
  await waitForBackend();
});

test("datasetCollector rejects invalid series name", async () => {
  const { writeKey } = await setupKeys();
  const collector = await edgeML.datasetCollector(
    BASE_URL,
    writeKey,
    `js-it-dataset-${Date.now()}`,
    false,
    ["Acc"],
    {}
  );

  expect(() => collector.addDataPoint(Date.now(), "Gyro", 1.0)).toThrow(
    "invalid time-series name"
  );
});

test("datasetCollector rejects non-numeric value", async () => {
  const { writeKey } = await setupKeys();
  const collector = await edgeML.datasetCollector(
    BASE_URL,
    writeKey,
    `js-it-dataset-${Date.now()}`,
    false,
    ["Acc"],
    {}
  );

  expect(() => collector.addDataPoint(Date.now(), "Acc", "bad")).toThrow(
    "Datapoint is not a number"
  );
});

test("datasetCollector rejects invalid timestamp", async () => {
  const { writeKey } = await setupKeys();
  const collector = await edgeML.datasetCollector(
    BASE_URL,
    writeKey,
    `js-it-dataset-${Date.now()}`,
    false,
    ["Acc"],
    {}
  );

  expect(() => collector.addDataPoint("bad", "Acc", 1.0)).toThrow(
    "Provide a valid timestamp"
  );
});

test("datasetCollector uploads with labeling", async () => {
  const { readKey, writeKey } = await setupKeys();
  const datasetName = `js-it-dataset-${Date.now()}`;
  const collector = await edgeML.datasetCollector(
    BASE_URL,
    writeKey,
    datasetName,
    false,
    ["Acc"],
    {},
    "activity_walk"
  );

  const baseTime = Date.now();
  collector.addDataPoint(baseTime, "Acc", 1.0);
  collector.addDataPoint(baseTime + 10, "Acc", 2.0);
  await collector.onComplete();

  const projectRes = await axios.get(
    `${BASE_URL}/api/v1/deviceapi/project/${readKey}`,
    { timeout: TIMEOUT }
  );
  const dataset = projectRes.data.datasets.find((item) => item.name === datasetName);
  expect(dataset).toBeTruthy();
  expect(dataset.labelings).toHaveLength(1);
  const labeling = projectRes.data.labelings.find(
    (item) => item._id === dataset.labelings[0].labelingId
  );
  expect(labeling.name).toBe("activity");
  const labelType = dataset.labelings[0].labels[0].type;
  const label = labeling.labels.find((item) => item._id === labelType);
  expect(label.name).toBe("walk");
});

test("datasetCollector uploads without labeling", async () => {
  const { readKey, writeKey } = await setupKeys();
  const datasetName = `js-it-dataset-${Date.now()}`;
  const collector = await edgeML.datasetCollector(
    BASE_URL,
    writeKey,
    datasetName,
    false,
    ["Acc"],
    {}
  );

  const baseTime = Date.now();
  collector.addDataPoint(baseTime, "Acc", 1.0);
  collector.addDataPoint(baseTime + 10, "Acc", 2.0);
  await collector.onComplete();

  const projectRes = await axios.get(
    `${BASE_URL}/api/v1/deviceapi/project/${readKey}`,
    { timeout: TIMEOUT }
  );
  const dataset = projectRes.data.datasets.find((item) => item.name === datasetName);
  expect(dataset).toBeTruthy();
  expect(dataset.labelings).toHaveLength(0);
});
