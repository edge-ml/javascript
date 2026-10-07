/**
 * Minimal fetch wrapper (browsers and Node.js >= 18 ship fetch).
 * Errors are thrown as `Error("<status>: <message>")`, matching the messages
 * the library produced with axios before.
 */

const joinUrl = (base, path) => base.replace(/\/+$/, "") + path;

async function request(method, base, path, body, { responseType = "json" } = {}) {
  let res;
  try {
    res = await fetch(joinUrl(base, path), {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error("Server error: " + (e && e.message ? e.message : e));
  }

  if (!res.ok) {
    let detail;
    try {
      const data = await res.json();
      detail = data.error || data.detail || JSON.stringify(data);
    } catch (e) {
      detail = res.statusText;
    }
    throw new Error(res.status + ": " + detail);
  }

  if (responseType === "arraybuffer") return res.arrayBuffer();
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

export const http = {
  get: (base, path, opts) => request("GET", base, path, undefined, opts),
  post: (base, path, body, opts) => request("POST", base, path, body, opts),
};
