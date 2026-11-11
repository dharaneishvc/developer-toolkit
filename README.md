# Developer Toolbox

A free, local-first developer workbench. Text, files, JWTs, and keys stay in browser memory. No account, paid API, telemetry, or upload server is used.

## Supported catalog: 54 tools

| Category | Implemented tools |
| --- | --- |
| Data | JSON formatter/minifier/key sorter/validator/Schema validator; JSON/YAML conversion; YAML formatting; CSV/JSON conversion; CSV to TSV; JSON/JSON Lines conversion |
| Code | JavaScript, TypeScript, HTML, CSS, Markdown, SQL formatting; Markdown to HTML source |
| Text | Unified diff, regex tester, literal replacement, upper/lower/title/camel/snake/kebab case conversion, slugs, statistics, line sorting/deduplication, whitespace trimming, reversal |
| Encoding | UTF-8 Base64 encode/decode, URL encode/decode/inspection, HTML escaping, JSON string escape/unescape, UTF-8 hex encode/decode |
| Crypto | JWT decoding, SHA-1/256/384/512 hashing, HMAC-SHA-256/384/512 |
| Generators | UUID v4, rejection-sampled passwords, random hex bytes, Lorem ipsum |
| Date / numbers | Timestamp/date conversion, date difference, exact BigInt base conversion (2/8/10/16), binary byte-size conversion |
| Color | Hex to RGB/HSL, WCAG contrast and AA/AAA checks |

Every tool has an executable example. Common controls include search, category navigation, favorites, hash links, text import, clear/swap, copy/download, output reuse, stoppable jobs, and private activity history. Ctrl+Enter/Cmd+Enter runs the current job. Switching tools clears sensitive input state.

## Run and test

Requires Node.js 24, npm, and a current browser supporting Web Workers, Web Crypto, and IndexedDB. Deploy over HTTPS; localhost is valid for development.

```sh
npm ci
npm run dev -- --port 5173
npm run check
npx playwright install chromium
npm run test:e2e
```

`npm run build` produces static `dist/`. Unit tests run every sample and correctness/boundary cases. Browser tests run every sample in a real worker on desktop/mobile Chromium, plus keyboard actions, downloads, persistence, external-request checks, axe accessibility, and horizontal overflow.

## Verification

The recorded verification run passed 82 unit tests and 114 desktop/mobile browser cases for this repository. Builds and dependency audits passed. See [Verification](VERIFICATION.md) for coverage, advisory warnings, reproduction commands, and external deployment requirements. All documentation, dependencies, and CI configuration live in this repository; no parent workspace files are required.

## Limits and guarantees

Input: 2 million characters; output: 5 million; imports: 4 MB; job timeout: 15 seconds. Regex output is capped at 1,000 matches, and pathological jobs are terminated. YAML aliases are bounded. JSON numbers follow JavaScript precision; use the BigInt converter for exact integers. Schema validation uses local AJV draft-07 without remote references. CSV expects flat object arrays and escapes formula prefixes. Text reversal handles code points, not grapheme clusters. Dates without timezones depend on browser interpretation.

JWT decoding is NOT verification. SHA-1 is legacy-only, not recommended for security. Generated HTML stays inert textarea text. Submitted code/SQL is never executed. Web Crypto randomness is used; this is not a password-manager replacement. Limits mitigate, but do not eliminate, hostile-input memory exhaustion. Large parser bundles are an acknowledged initial-load cost. Arbitrary commercial-tool parity is not claimed.

See [Architecture](docs/ARCHITECTURE.md), [Operations](docs/OPERATIONS.md), [Contributing](CONTRIBUTING.md), and [Security](SECURITY.md). Publish this folder as an independent repository and enable the included Pages workflow. Jenkins requires a configured external runner. No remote repository, live deployment, or credit-funded API has been created.