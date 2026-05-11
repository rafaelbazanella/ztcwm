# Phase 18 — Deferred Items

Out-of-scope discoveries during plan execution. Not fixed; logged for future work.

## 2026-05-11 — 18-01 execution

### Pre-existing ESLint configuration gap (`no-undef` on all test files)

- **Found during:** Task 2 verification (`npm run lint`).
- **Symptom:** `npm run lint` exits with code 1 and reports 1656 errors across 56 files. All are `no-undef` errors against Vitest globals (`describe`, `it`, `expect`, `vi`, `beforeEach`) and DOM globals (`navigator`, `document`, `window`).
- **Root cause:** `src/eslint.config.js` does not declare `vitest/globals` (or equivalent `globals: vitest`) on test files, nor `env: { browser: true }` on files that touch DOM globals. The project's `package.json` has `eslint` configured but no `eslint-plugin-vitest` installed.
- **Scope:** Pre-existing — confirmed by stashing my edits and re-running lint on the unchanged baseline. The same 1656 errors are present without any Phase 18 work.
- **Why not fixed in 18-01:** Out of scope per executor rules (only auto-fix issues caused by current task changes). Touching `eslint.config.js` or adding `eslint-plugin-vitest` would be a project-wide tooling change that goes beyond the type/service-layer slice of Phase 18.
- **Suggested follow-up:** Either add the missing globals to `eslint.config.js`:
  ```js
  // for test files
  files: ['**/*.test.ts'],
  languageOptions: { globals: { ...globals.vitest } }
  // for DOM files
  languageOptions: { globals: { ...globals.browser } }
  ```
  Or install `eslint-plugin-vitest` and apply its recommended config to `**/*.test.ts`. Track as a tooling-debt item; not a release blocker.
- **My edits' lint impact:** Zero new categories of errors. The errors in my edited `services/member-service.test.ts` (lines I touched) are the same `no-undef` for `describe`/`it`/`expect` that already exist on every other test file.
