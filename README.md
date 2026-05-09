# Codeway Configuration — Case Study

> A take-home case: build a configuration management system where app managers
> sign in to a panel and edit key/value/description parameters, while mobile
> clients fetch a flat JSON config from a separate, token-protected endpoint.
> Three non-trivial features were specified on top of the basics — this README
> walks through how each was approached and where the interesting decisions
> live.

**Stack:** Node.js 20 + Express + Firebase Admin / Firestore on the backend,
Vue 3 (Composition API) + Pinia + Vue Router + Tailwind on the frontend,
Firebase Auth (Email/Password) for sign-in, Google Gemini (`gemini-2.5-flash`)
for AI suggestions. ES modules end-to-end, Zod for env + request validation,
ESLint clean.

## Highlights

The three things the case asked for, and where each one actually lives:

- **Optimistic concurrency control** — every parameter carries a monotonic
  `version`; every `PATCH` / `DELETE` requires `expectedVersion`; the backend
  enforces it inside a Firestore transaction and returns 409 with the live
  document under `error.details.current`. The frontend opens a side-by-side
  conflict modal with **Discard** vs **Reapply on top**. No pessimistic
  locks. → [`parametersService.js`](backend/src/services/parametersService.js),
  [`ConflictModal.vue`](frontend/src/components/ConflictModal.vue).
- **Country audiences** — each parameter has a `countryOverrides` map keyed by
  ISO 3166-1 alpha-2. The `/v1/config` endpoint flattens overrides server-side,
  normalizes the country code (so `?country=tr` matches `TR`), silently drops
  unknown codes at save time, and falls back to the default for everything
  else. → [`configCache.js`](backend/src/services/configCache.js),
  [`AudiencesTab.vue`](frontend/src/components/AudiencesTab.vue).
- **AI-assisted suggestions** — Gemini is asked for country-specific values for
  one parameter at a time, with a system instruction that pins it to preserve
  the default's type and *omit* countries where no localization applies. The
  backend validates every suggestion (drops anything off-list, drops anything
  whose type doesn't match the default, truncates rationales to 140 chars),
  rate-limits to 10 req/min/uid, and **never writes to Firestore** — the user
  has to opt in row-by-row in the UI before saving. → [`aiService.js`](backend/src/services/aiService.js),
  [`AISuggestModal.vue`](frontend/src/components/AISuggestModal.vue).

## Architecture

```
                                            ┌──────────────────────┐
   Mobile clients ──── /v1/config?country ─▶│                      │
   (X-Api-Token)                            │                      │
                                            │   Express  on        │   Firestore
   Admin panel  ───── /api/parameters ─────▶│   Cloud Run          │── (parameters/)
   (Firebase ID                             │                      │
    token)                                  │   ┌──────────────┐   │
                                            │   │ node-cache   │   │
                                            │   │ (30s, per    │   │
                                            │   │  country)    │   │
                                            │   └──────────────┘   │
                                            │                      │
   Admin panel  ───── /api/.../ai-suggest ──▶│   Gemini 2.5 Flash  │
                                            └──────────────────────┘
```

- Firestore is **only** accessed by the backend Admin SDK — security rules deny
  direct client reads/writes (see [firestore.rules](firestore.rules)).
- The serving endpoint flattens `countryOverrides` server-side and is cached
  (default 30 s) per resolved country.

## Repository layout

```
codeway-config/
├── README.md                  ← you are here
├── firestore.rules            ← deny-all client access; backend-only
├── backend/                   ← Node 20 / Express / Firebase Admin / Gemini
│   ├── Dockerfile             ← Cloud Run-ready
│   ├── .env.example
│   └── src/
│       ├── index.js           ← express bootstrap, helmet/cors/compression/morgan
│       ├── config/            ← env (zod), firebase admin init
│       ├── middleware/        ← Firebase ID-token verifier, mobile-token verifier, error handler
│       ├── routes/            ← thin: parameters / ai / config (mobile)
│       ├── services/          ← parametersService, configCache, aiService
│       └── utils/             ← errors, ISO-3166 country list
└── frontend/                  ← Vue 3 / Vite / Pinia / Tailwind / Firebase web SDK
    ├── firebase.json          ← Hosting SPA rewrite + immutable cache headers
    ├── .env.example
    └── src/
        ├── main.js / App.vue / router / stores
        ├── services/          ← firebase web SDK init, axios + token interceptor
        ├── views/             ← SignIn, Parameters
        └── components/        ← AppHeader, ParametersTable, ParameterCard,
                                EditParameterModal, AudiencesTab, AISuggestModal,
                                ConflictModal, ValueEditor
```

## Spec coverage

Mapping of the case prompt requirements to where each lives:

| Requirement | Where |
| --- | --- |
| Optimistic concurrency via `version` + Firestore transactions | [`parametersService.js`](backend/src/services/parametersService.js), [`ConflictModal.vue`](frontend/src/components/ConflictModal.vue) |
| Country overrides + ISO-3166 normalization + serving endpoint | [`configCache.js`](backend/src/services/configCache.js), [`countries.js`](backend/src/utils/countries.js), [`AudiencesTab.vue`](frontend/src/components/AudiencesTab.vue) |
| AI suggestions with type-preserving validation, rate limit, opt-in | [`aiService.js`](backend/src/services/aiService.js), [`AISuggestModal.vue`](frontend/src/components/AISuggestModal.vue) |
| Mobile token: `Authorization` *or* `X-Api-Token`, `crypto.timingSafeEqual` | [`authApiToken.js`](backend/src/middleware/authApiToken.js) |
| 30 s in-process cache, `Cache-Control: public, max-age=30`, invalidates on writes | [`configCache.js`](backend/src/services/configCache.js), [`routes/config.js`](backend/src/routes/config.js) |
| Firebase ID-token gate on all admin routes | [`authFirebase.js`](backend/src/middleware/authFirebase.js) |
| Uniform error envelope `{ error: { code, message, details } }` | [`errors.js`](backend/src/utils/errors.js), [`errorHandler.js`](backend/src/middleware/errorHandler.js) |
| Firestore rules deny all client access | [`firestore.rules`](firestore.rules) |
| Type-aware `ValueEditor` (string / number / boolean / JSON) | [`ValueEditor.vue`](frontend/src/components/ValueEditor.vue) |
| Responsive — table ≥ md, cards < md | [`Parameters.vue`](frontend/src/views/Parameters.vue), [`ParameterCard.vue`](frontend/src/components/ParameterCard.vue) |
| Sign-in errors humanized (no raw Firebase codes leaked) | [`stores/auth.js`](frontend/src/stores/auth.js) |
| Zod validation on env + every request body | [`config/env.js`](backend/src/config/env.js), [`routes/parameters.js`](backend/src/routes/parameters.js), [`routes/ai.js`](backend/src/routes/ai.js) |
| ESLint configs (Vue + Node) — both apps lint clean | [`backend/.eslintrc.cjs`](backend/.eslintrc.cjs), [`frontend/.eslintrc.cjs`](frontend/.eslintrc.cjs) |
| Dockerfile (Cloud Run) + `firebase.json` (Hosting) — no actual deploy | [`backend/Dockerfile`](backend/Dockerfile), [`frontend/firebase.json`](frontend/firebase.json) |

## Prerequisites

- Node.js 20 or newer
- A Firebase project (Firestore in **native** mode, Email/Password auth enabled)
- A Google Generative AI API key for `gemini-2.5-flash` (configurable via
  `GEMINI_MODEL` — anything Gemini's `@google/generative-ai` SDK supports
  works; the validation layer is model-agnostic). Free-tier quotas are tight
  per project — if you see 429s, either wait for the per-minute quota to
  reset or switch the model.

## Firebase setup

1. Create a Firebase project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable **Email/Password**. Add a manager
   user.
3. **Firestore Database**: create a database in **native** mode in your preferred
   region.
4. **Project settings → Service accounts**: click *Generate new private key*. The
   downloaded JSON is what you paste into `FIREBASE_SERVICE_ACCOUNT_JSON`.
5. Deploy the lockdown rules:

   ```bash
   firebase deploy --only firestore:rules
   ```

## Local development

### Backend

```bash
cd backend
cp .env.example .env   # then fill in the secrets
npm install
npm run dev            # node --watch src/index.js → http://localhost:8080
curl http://localhost:8080/healthz
```

`backend/.env.example`:

```bash
PORT=8080
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173

# Firebase Admin: paste the service-account JSON, stringified onto one line.
# In Cloud Run you can omit this and rely on Application Default Credentials.
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
# FIREBASE_PROJECT_ID=your-project-id   # only needed for ADC fallback

# Pre-shared token for the mobile serving endpoint. Generate with:
#   openssl rand -hex 32
MOBILE_API_TOKEN=replace-with-a-long-random-string

GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

CONFIG_CACHE_TTL=30
```

### Frontend

```bash
cd frontend
cp .env.example .env   # fill in your Firebase web app config
npm install
npm run dev            # → http://localhost:5173
```

`frontend/.env.example`:

```bash
VITE_API_BASE_URL=http://localhost:8080
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
```

## API reference

All admin endpoints expect `Authorization: Bearer <Firebase ID token>`. Errors
share a uniform shape:

```json
{ "error": { "code": "conflict", "message": "...", "details": { "current": { ... } } } }
```

### `GET /api/parameters`

```bash
curl -H "Authorization: Bearer $ID_TOKEN" http://localhost:8080/api/parameters
```

### `POST /api/parameters`

```bash
curl -X POST http://localhost:8080/api/parameters \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "latestVersion",
    "value": "2.1",
    "description": "App version",
    "countryOverrides": { "TR": "2.2" }
  }'
```

### `PATCH /api/parameters/:id`

`expectedVersion` is required. A mismatch returns 409 with the current document.

```bash
curl -X PATCH http://localhost:8080/api/parameters/latestVersion \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "expectedVersion": 1, "value": "2.2" }'
```

### `DELETE /api/parameters/:id?expectedVersion=N`

```bash
curl -X DELETE "http://localhost:8080/api/parameters/latestVersion?expectedVersion=2" \
  -H "Authorization: Bearer $ID_TOKEN"
```

### `POST /api/parameters/:id/ai-suggestions`

Rate-limited to 10 requests per minute per user.

```bash
curl -X POST http://localhost:8080/api/parameters/latestVersion/ai-suggestions \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "targetCountries": ["TR", "DE", "JP"] }'
```

### `GET /v1/config?country=TR`  (mobile, pre-shared token)

```bash
# Authorization header
curl -H "Authorization: Bearer $MOBILE_API_TOKEN" \
  "http://localhost:8080/v1/config?country=TR"

# X-Api-Token header
curl -H "X-Api-Token: $MOBILE_API_TOKEN" \
  "http://localhost:8080/v1/config?country=US"
```

Response shape (flat — no metadata, no version, no overrides):

```json
{
  "latestVersion": "2.2",
  "welcomeMessage": "Uygulamamıza hoş geldiniz!"
}
```

Same call without `?country=` (or with an unknown / missing country) returns
the defaults instead:

```json
{
  "latestVersion": "2.1",
  "welcomeMessage": "Welcome to our app!"
}
```

## Concurrency model

Every parameter document carries a `version` (starts at 1). Every `PATCH` and
`DELETE` requires `expectedVersion` from the client. The backend runs a Firestore
transaction:

1. Read the current document; if missing → 404.
2. If `doc.version !== expectedVersion` → respond with 409 and include the
   current document under `error.details.current`.
3. Otherwise write the update with `version + 1` plus audit fields and a server
   timestamp.

The frontend handles 409 by opening `ConflictModal.vue` with a side-by-side view
of the user's pending change and the server's current value. Two actions:

- **Discard my changes** — close the modal, refresh the list.
- **Reapply on top** — re-fetch the latest, set the editor's `expectedVersion` to
  it, keep the user's edited fields, and let them re-submit.

No pessimistic locks, no "currently editing" flags — strictly optimistic.

## Country audiences

Each parameter stores `countryOverrides` keyed by ISO 3166-1 alpha-2. The
serving endpoint flattens overrides server-side:

```js
for (const p of params) {
  out[p.key] = (country && p.countryOverrides[country] !== undefined)
    ? p.countryOverrides[country]
    : p.value;
}
```

- Country codes are normalized to upper-case before lookup, so `?country=tr`
  matches a `TR` override.
- Unknown / missing / empty `country` → all defaults.
- Unknown codes submitted in `countryOverrides` are **silently dropped** at save
  time (per spec).

Worked example (Turkey):

| Stored                            | Request                | Response (`latestVersion`) |
| --------------------------------- | ---------------------- | -------------------------- |
| `value: "2.1", overrides: {TR:"2.2"}` | `?country=TR`          | `"2.2"`                    |
| same                              | `?country=tr`          | `"2.2"` (normalized)       |
| same                              | `?country=US`          | `"2.1"` (no US override)   |
| same                              | (no `country`)          | `"2.1"`                    |

## AI-assisted flow

- Endpoint: `POST /api/parameters/:id/ai-suggestions` with optional
  `{ targetCountries: string[] }`. Default targets are the top mobile-app
  markets: `["US","GB","DE","FR","JP","TR","IN","BR","CA","AU"]`. (Mobile-app
  revenue ranks differently from GDP — this list is configured in
  [aiService.js](backend/src/services/aiService.js) so it's easy to tune.)
- Gemini is called with `responseMimeType: "application/json"` so the SDK
  returns parseable JSON, plus a system instruction that pins it to a single
  parameter and tells it to *omit* countries where no localization applies
  (rather than hallucinate a value).
- The backend **validates** the response: parses JSON, drops any country not in
  the requested list, and **drops any value whose type doesn't match** the
  default's type. Strings stay strings, numbers stay numbers, booleans stay
  booleans, objects/arrays preserved. No coercion.
- The endpoint **never writes to Firestore.** It returns suggestions the user
  must then opt in to.
- Frontend (`AISuggestModal.vue`) lists each suggestion with a checkbox starting
  **unchecked**. The user picks rows to apply, the modal merges them into the
  editor's working state, and the user still has to click Save on the parent
  modal.
- Per-user rate limit: **10 requests per minute** keyed by Firebase UID.
- AI failure is non-fatal: the modal shows a clean error; the manual override
  flow always works.

**Live example.** Asking Gemini to localize `welcomeMessage = "Welcome to our app!"`
for the default ten-market list yields:

```json
{
  "suggestions": {
    "DE": "Willkommen in unserer App!",
    "FR": "Bienvenue sur notre application !",
    "JP": "アプリへようこそ！",
    "TR": "Uygulamamıza hoş geldiniz!",
    "BR": "Bem-vindo(a) ao nosso aplicativo!"
  },
  "rationale": {
    "DE": "Localized greeting for German speakers.",
    "FR": "Localized greeting for French speakers.",
    "JP": "Localized greeting for Japanese speakers.",
    "TR": "Localized greeting for Turkish speakers.",
    "BR": "Localized greeting for Brazilian Portuguese speakers."
  }
}
```

`US`, `GB`, `CA`, `AU`, `IN` are correctly **omitted** — the default is already
English, so there is no meaningful localization to suggest. This is the system
instruction working as intended; it's not a bug.

## Performance notes

- The serving endpoint is the hot path. It is cached in-process via `node-cache`
  with a default TTL of 30 s, keyed by `country || '__default__'`. The TTL is
  configurable through `CONFIG_CACHE_TTL`.
- `parametersService` invalidates the cache (`flushAll()`) on every successful
  create / update / delete, so writers see at-most-30s staleness, never longer.
- The serving response sets `Cache-Control: public, max-age=30` so any CDN in
  front (Cloud CDN, Cloudflare) absorbs traffic too. The admin endpoints are
  not cached.

**Scaling for 100× traffic:**

- Put Cloud CDN (or Cloudflare) in front of `/v1/config` and lean on the
  `Cache-Control` header — most traffic never hits Cloud Run.
- Move the cache out-of-process to Memorystore (Redis) so multi-replica Cloud
  Run instances share a single warm cache instead of each warming its own.
- Pre-compute the per-country flat blobs in a Firestore trigger (or a small
  worker) on every parameter write, so `/v1/config` becomes a single document
  read instead of a collection scan + flatten.

## Deployment

The case prompt explicitly asks for deployment artifacts but no actual deploy.
Both pieces are wired:

**Backend → Cloud Run** ([`backend/Dockerfile`](backend/Dockerfile)):

```bash
cd backend
export PROJECT_ID=<your-gcp-project>
gcloud builds submit --tag gcr.io/$PROJECT_ID/codeway-config-backend
gcloud run deploy codeway-config-backend \
  --image gcr.io/$PROJECT_ID/codeway-config-backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,CORS_ORIGINS=https://$PROJECT_ID.web.app,GEMINI_MODEL=gemini-2.5-flash,CONFIG_CACHE_TTL=30 \
  --set-secrets MOBILE_API_TOKEN=mobile-api-token:latest,GEMINI_API_KEY=gemini-api-key:latest
```

On Cloud Run you can omit `FIREBASE_SERVICE_ACCOUNT_JSON` and rely on
Application Default Credentials (just set `FIREBASE_PROJECT_ID`). Put
`MOBILE_API_TOKEN` and `GEMINI_API_KEY` in Secret Manager.

**Frontend → Firebase Hosting** ([`frontend/firebase.json`](frontend/firebase.json) — SPA
rewrite + `immutable` cache headers for hashed assets):

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

**Firestore rules** ([`firestore.rules`](firestore.rules) — deny-all):

```bash
firebase deploy --only firestore:rules
```

## Trade-offs

Decisions I made knowingly, and what I'd revisit with more time:

- **Country param is spoofable.** The serving endpoint trusts whatever
  `country=` the caller sends. For real localization you'd resolve country
  server-side from the request IP (or a signed claim from the mobile SDK). For
  this case the param *is* the contract, and trying to enforce it would
  break testability — but it's worth flagging.
- **30 s cache lag.** Edits aren't seen by mobile clients for up to
  `CONFIG_CACHE_TTL` seconds (plus any CDN TTL). The cache invalidates on
  writes inside one process, but a multi-replica deploy means each replica's
  cache expires independently. Redis would give instant cross-replica
  invalidation; that's the next step if instant propagation matters more than
  operational simplicity.
- **AI is unsuitable for some parameters.** Asking Gemini for a country
  override on `latestVersion` is meaningless — the value should be uniform
  across markets, which is exactly what the live test showed (Gemini returned
  the default for non-TR countries, preserving the existing override). The
  responsible-use guardrails (type validation, opt-in checkboxes,
  human-readable rationale, never auto-write) handle the case in practice. A
  future iteration could let parameter authors mark a parameter as
  "AI-suggestable: false" so the button never appears.
- **No frontend tests.** The case prompt explicitly puts frontend tests out of
  scope, so I didn't write any. The validation-heavy parts (AI payload
  filtering, country normalization) live in the backend and are written so
  they could be unit-tested via the `__testing` export in
  [`aiService.js`](backend/src/services/aiService.js); I verified them
  ad-hoc instead of formalizing them in Vitest.

## Notes for reviewers

If you want to skim the most interesting code first, in order:

1. [`parametersService.js`](backend/src/services/parametersService.js) — the
   transactional optimistic-locking core. Returns the live document on 409 so
   the UI can show a side-by-side diff.
2. [`configCache.js`](backend/src/services/configCache.js) — the per-country
   cache with the flatten function injected, so the same module can be tested
   without a Firestore dependency.
3. [`aiService.js`](backend/src/services/aiService.js) — the validation pass
   (`validatePayload`) is the responsible-use heart: drops anything off-list,
   drops anything whose type doesn't match the default, truncates rationales.
4. [`EditParameterModal.vue`](frontend/src/components/EditParameterModal.vue) — orchestrates
   the Default tab, the Audiences tab, and the AI suggest modal; surfaces 409
   conflicts back up to the parent so the conflict modal can mediate.

Run the full local + curl smoke test with the commands in
[Local development](#local-development) plus [API reference](#api-reference) — the
serving endpoint with `?country=tr` (lowercase) is the quickest way to confirm
the country-audience flow end-to-end.
