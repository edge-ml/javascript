import { http } from "./http";

/**
 * Thrown when a sensor unit cannot be converted to the unit a model expects,
 * so the app gets an error instead of wrong predictions.
 */
export class UnitError extends Error {}

/**
 * Fetches the unit catalog of the edge-ml server: every quantity with its
 * units and the unit models expect (`defaultUnit`). No API key needed.
 * @param {string} url - The url of the backend server
 * @returns {Promise<import("../index").UnitCatalog>}
 */
export function fetchUnits(url) {
  return http.get(url, "/ml/units/");
}

/**
 * Time-series as given by the app: a plain name, or `{ name, unit?, quantity? }`.
 * @param {string | { name: string, unit?: string, quantity?: string }} ts
 * @returns {{ name: string, unit?: string, quantity?: string }}
 */
export function seriesSpec(ts) {
  if (typeof ts === "string") return { name: ts };
  if (!ts || typeof ts.name !== "string" || !ts.name) {
    throw new TypeError("A time-series needs a name, e.g. \"accX\" or { name: \"accX\", unit: \"g\", quantity: \"acceleration\" }");
  }
  return ts;
}

/**
 * The time-series entry of a dataset init request. Plain names stay plain
 * strings, so servers without unit support keep accepting them.
 */
export function initEntry(ts) {
  const { name, unit, quantity } = seriesSpec(ts);
  if (!unit && !quantity) return name;
  return { name, unit: unit || "", quantity: quantity || null };
}

/**
 * The expected unit of every model input, from `manifest.input.units`.
 * Exports made before units existed have none: every input is unknown.
 * @returns {import("../index").InputUnit[]}
 */
export function manifestUnits(manifest) {
  const names = manifest.input.timeseries;
  const byName = {};
  for (const u of manifest.input.units || []) byName[u.name] = u;
  return names.map((name) => {
    const u = byName[name] || {};
    return { name, quantity: u.quantity || null, unit: u.unit || "", conversions: u.conversions || {} };
  });
}

const isUnknown = (input) => !input.quantity && !input.unit;

/** The catalog unit id of `unit` within `quantityId`, matching ids, labels and aliases. */
function catalogUnitId(catalog, quantityId, unit) {
  const quantity = catalog && (catalog.quantities || []).find((q) => q.id === quantityId);
  if (!quantity) return null;
  const match = quantity.units.find((u) => u.id === unit || u.label === unit || (u.aliases || []).includes(unit));
  return match ? match.id : null;
}

/**
 * Works out how to convert each input from the unit the app delivers to the
 * unit the model expects.
 *
 * @param {import("../index").InputUnit[]} inputs - from `manifestUnits`
 * @param {{ [sensor: string]: string }} sensorUnits - unit each sensor delivers; sensors the model does not use are ignored
 * @param {import("../index").UnitCatalog} [catalog] - optional, to also accept unit labels and aliases (e.g. "°C")
 * @returns {({ scale: number, offset: number } | null)[]} per input, null = pass values through
 */
export function resolveConversions(inputs, sensorUnits, catalog) {
  return inputs.map((input) => {
    const unit = sensorUnits ? sensorUnits[input.name] : undefined;
    if (unit === undefined || unit === null) return null;
    if (typeof unit !== "string") throw new TypeError(`The unit of '${input.name}' must be a string`);
    // trained before units existed, or on data of unknown unit: values go in as they are
    if (isUnknown(input)) return null;

    let conv = input.conversions[unit];
    if (!conv && unit !== input.unit && input.quantity) {
      const id = catalogUnitId(catalog, input.quantity, unit);
      if (id) conv = input.conversions[id] || (id === input.unit ? { scale: 1, offset: 0 } : undefined);
    }
    if (!conv && unit === input.unit) conv = { scale: 1, offset: 0 };
    if (!conv) {
      const accepted = Object.keys(input.conversions);
      const expected = `${input.unit || "no unit"}${input.quantity ? ` (${input.quantity})` : ""}`;
      throw new UnitError(
        `'${input.name}' is declared in '${unit}', but the model expects ${expected} and cannot convert from '${unit}'. ` +
          (accepted.length > 1 ? `Accepted units: ${accepted.join(", ")}.` : `Deliver it in ${input.unit || "the unit it was trained on"}.`)
      );
    }
    return conv.scale === 1 && conv.offset === 0 ? null : { scale: conv.scale, offset: conv.offset };
  });
}
