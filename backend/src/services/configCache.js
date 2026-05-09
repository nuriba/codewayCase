import NodeCache from 'node-cache';
import { env } from '../config/env.js';
import { normalizeCountryCode } from '../utils/countries.js';

const ttlSeconds = Number.parseInt(env.CONFIG_CACHE_TTL, 10) || 30;

export const configCache = new NodeCache({
  stdTTL: ttlSeconds,
  checkperiod: Math.max(ttlSeconds, 30),
  useClones: false,
});

export const CACHE_TTL_SECONDS = ttlSeconds;

export function buildFlatConfig(params, country) {
  const out = {};
  for (const p of params) {
    const overrides = p.countryOverrides ?? {};
    if (country && Object.prototype.hasOwnProperty.call(overrides, country)) {
      out[p.key] = overrides[country];
    } else {
      out[p.key] = p.value;
    }
  }
  return out;
}

export async function getServedConfig(rawCountry, fetchAllParameters) {
  const country = normalizeCountryCode(rawCountry); // null when missing/invalid
  const cacheKey = country ?? '__default__';
  const cached = configCache.get(cacheKey);
  if (cached) return cached;

  const params = await fetchAllParameters();
  const flat = buildFlatConfig(params, country);
  configCache.set(cacheKey, flat);
  return flat;
}
