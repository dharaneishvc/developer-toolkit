# Developer Toolbox Verification

Verified locally on Windows with Node.js 24 on 2026-11-01. This report applies only to this repository.

| Check | Result |
| --- | --- |
| Supported catalog | 54 tools |
| Unit tests | 82 passed |
| Desktop/mobile browser cases | 114 passed |
| Locked dependency install | `npm ci` passed |
| Source lint | Passed with one advisory warning |
| TypeScript and production build | Passed |
| Dependency audit | Zero reported vulnerabilities at verification time |
| Editor diagnostics | No errors |

## Verified Coverage

- Every tool sample in unit tests and a real production-browser worker.
- Known hash vectors, Unicode roundtrips, exact integer conversion, schema validation, contrast calculations, invalid parsers, and input/generator limits.
- Keyboard execution, text downloads, search, hash navigation, favorites persistence, and metadata-only history with a 50-entry cap.
- Axe accessibility scans, desktop/mobile horizontal-overflow checks, and reviewed screenshots for tested states.
- No third-party runtime requests in the tested workbench state.
- Workflow/dependency YAML parsing and least-privilege Pages deployment gates.
- Live development-worker JSON formatting. The integrated browser paused pointer visibility waits in a background tab, so this dev smoke job was dispatched programmatically; production Playwright tests independently verified normal pointer interactions.

## Reproduce

Run inside this repository:

```sh
npm ci
npm run check
npm audit --audit-level=high
npx playwright install chromium
npm run test -- --reporter=default --reporter=junit --outputFile=test-results/unit.xml
npm run test:e2e
```

Reports are generated in ignored `playwright-report/` and `test-results/` directories. Unit and browser JUnit files were confirmed present. Browser artifacts use `test-results/browser/` so browser startup does not erase unit reports. Counts above describe the recorded full verification run, not a claim that every subsequent documentation edit reran browser tests.

## Warnings and Unverified Requirements

One advisory React lint warning concerns `performance.now()` in an event handler. Large parser/worker bundles also exceed Vite's advisory chunk-size threshold. These are not build failures or a claim of optimal load performance.

GitHub Actions and Jenkins configuration are present, but were not executed on live GitHub/Jenkins infrastructure. Remote publication, reviewed initial commits, Pages settings, required PR checks, an isolated Jenkins Multibranch runner/webhook, and a distribution-license choice require owner setup. No paid/cloud API or GitHub credit-funded call was used.

Safari/Firefox certification, hostile-input penetration testing, production-load testing, and arbitrary commercial-tool parity were not verified. JWT decoding is not signature verification. See the [README](README.md) for supported features and limits, [Architecture](docs/ARCHITECTURE.md) for HLD/LLD/local BE/DB design, and [Operations](docs/OPERATIONS.md) for deployment.

## Local App Status

The development server is stopped. Restart from this repository with `npm run dev -- --port 5173`, then open http://localhost:5173/. Processing is browser-local; IndexedDB stores preferences and job metadata only.