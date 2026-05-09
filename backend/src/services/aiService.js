import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { Errors } from '../utils/errors.js';
import { COUNTRIES, countryName, filterValidCodes } from '../utils/countries.js';
import { getParameter } from './parametersService.js';

// Mobile-app revenue ranks differently from GDP — these are the top markets
// for mobile app monetization. Adjust here, not in route code.
export const DEFAULT_TARGET_COUNTRIES = ['US', 'GB', 'DE', 'FR', 'JP', 'TR', 'IN', 'BR', 'CA', 'AU'];

const SYSTEM_INSTRUCTION = [
  'You suggest country-specific values for a single mobile-app configuration parameter.',
  'Output strictly matches the requested JSON schema.',
  'Preserve the type of the default value.',
  'If a country has no meaningful localization, omit it from suggestions rather than hallucinating.',
].join(' ');

function inferType(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v; // 'string' | 'number' | 'boolean' | 'object'
}

function valuesSameType(defaultVal, candidate) {
  const t = inferType(defaultVal);
  const ct = inferType(candidate);
  if (t === 'number') return ct === 'number' && Number.isFinite(candidate);
  if (t === 'boolean') return ct === 'boolean';
  if (t === 'string') return ct === 'string';
  if (t === 'array') return ct === 'array';
  if (t === 'object') return ct === 'object';
  return ct === t;
}

function buildPrompt(parameter, targetCountries) {
  const countryList = targetCountries
    .map((code) => `${code} (${countryName(code)})`)
    .join(', ');
  const defaultType = inferType(parameter.value);

  return [
    `Parameter key: ${parameter.key}`,
    `Description: ${parameter.description || '(no description provided)'}`,
    `Default value type: ${defaultType}`,
    `Default value (JSON): ${JSON.stringify(parameter.value)}`,
    `Existing overrides (JSON): ${JSON.stringify(parameter.countryOverrides ?? {})}`,
    `Target countries: ${countryList}`,
    '',
    'Return JSON with this exact shape:',
    '{',
    `  "suggestions": { "<ISO-3166-1 alpha-2>": <value with same type as default>, ... },`,
    `  "rationale":   { "<ISO-3166-1 alpha-2>": "<short explanation, <= 140 chars>", ... }`,
    '}',
    '',
    'Only include countries from the target list. Omit any country where no meaningful localization applies.',
  ].join('\n');
}

let cachedClient = null;
function getClient() {
  if (!cachedClient) cachedClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return cachedClient;
}

function pickTargetCountries(input) {
  const requested = filterValidCodes(input);
  return requested.length > 0 ? requested : DEFAULT_TARGET_COUNTRIES;
}

function validatePayload(raw, parameter, targetCountries) {
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw Errors.badRequest('AI returned invalid JSON');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw Errors.badRequest('AI returned an unexpected payload');
  }

  const allowed = new Set(targetCountries);
  const cleanSuggestions = {};
  const cleanRationale = {};
  const suggestions = parsed.suggestions ?? {};
  const rationale = parsed.rationale ?? {};

  for (const [code, value] of Object.entries(suggestions)) {
    const upper = String(code).toUpperCase();
    if (!allowed.has(upper)) continue;
    if (!valuesSameType(parameter.value, value)) continue;
    cleanSuggestions[upper] = value;
    const r = rationale[code] ?? rationale[upper];
    if (typeof r === 'string') {
      cleanRationale[upper] = r.slice(0, 140);
    }
  }

  return { suggestions: cleanSuggestions, rationale: cleanRationale };
}

export async function suggestForParameter(parameterId, body) {
  const parameter = await getParameter(parameterId);
  const targetCountries = pickTargetCountries(body?.targetCountries);

  const model = getClient().getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
    },
  });

  let result;
  try {
    result = await model.generateContent(buildPrompt(parameter, targetCountries));
  } catch (err) {
    console.error('[ai] gemini call failed', err?.message);
    throw Errors.internal('AI suggestion service is currently unavailable');
  }

  const text = result?.response?.text?.() ?? '';
  return validatePayload(text, parameter, targetCountries);
}

export const __testing = { validatePayload, buildPrompt, valuesSameType, inferType };

// Re-exported for the frontend country picker bootstrap.
export { COUNTRIES };
