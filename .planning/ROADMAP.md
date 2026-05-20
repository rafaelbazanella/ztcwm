# Roadmap: ZeroTier Controller Web Manager

## Milestones

- ✅ **v1.0 MVP** — Phases 1-5 (shipped 2026-04-10)
- ✅ **v2.0 Backend & Multi-User** — Phases 6-12 (shipped 2026-04-16)
- ✅ **v3.0 UX Polish, Light-Theme AA, Docs** — Phases 13-17 (shipped 2026-04-29)
- ✅ **v3.1 Polish & i18n Cleanup** — Phases 18-20 ([archive](milestones/v3.1-ROADMAP.md), shipped 2026-05-20)
- 📋 **Next** — not yet defined (run `/gsd-new-milestone`)

## Phases

<details>
<summary>✅ v1.0 MVP — Phases 1-5 (shipped 2026-04-10)</summary>

Test infrastructure, security hardening, design tokens, full UI overhaul. 16 plans / 72 commits. See git tag `v1.0` for the snapshot.

</details>

<details>
<summary>✅ v2.0 Backend & Multi-User — Phases 6-12 (shipped 2026-04-16)</summary>

Fastify + SQLite backend, local-account auth with bcrypt + sessions + CSRF + rate limiting, three-role RBAC, setup wizard, full ZT API proxy with server-side token storage (AES-256-GCM), atomic frontend migration. 21 plans / 81 commits. See git tag `v2.0`.

</details>

<details>
<summary>✅ v3.0 UX Polish, Light-Theme AA, Docs — Phases 13-17 (shipped 2026-04-29)</summary>

Inline member-IP chip editor, case-insensitive members search/filter, IPv4-preferred Physical Address column, admin username rename with audit log, light-theme WCAG 2.1 AA pass (token-only refactor, MIRROR-fenced literal block), 26-assertion theme-contrast CI guardrail, 261-line v3.0 README + paste-ready EC2 deploy guide, 318-line `docs-audit.test.ts` CI guardrail. 15 plans / 107 commits. See git tag `v3.0`.

</details>

<details>
<summary>✅ v3.1 Polish & i18n Cleanup — Phases 18-20 (shipped 2026-05-20)</summary>

Full details: [milestones/v3.1-ROADMAP.md](milestones/v3.1-ROADMAP.md)

- [x] Phase 18: Member ZT Client Version (2/2 plans) — completed 2026-05-11
- [x] Phase 19: Internationalization Sweep (2/2 plans) — completed 2026-05-12
- [x] Phase 20: Shell & Users-Page Regression Fixes (5/5 plans incl. 20-05 gap closure) — completed 2026-05-15; UAT closure 2026-05-20

</details>

### 📋 Next Milestone (Not Defined)

Run `/gsd-new-milestone` to define v3.2 (or v4.0) — questioning → research → requirements → roadmap.

Carried-forward debt that may seed the next milestone:

- Phase 20 WR-01: `vaadin-router-location-changed` listener registered after `initRouter()` (next plan touching `firstUpdated()`)
- Phase 20 WR-03: catch-all route lacks title/subtitle metadata (cheap fix in `src/app.ts:111-112` defensive guard)
- Phase 19 WR-01: dead `configura[cç]` token in audit script (requires re-opening D-03)
- Phase 20 LAYOUT-02 follow-up: header-band geometry derived per-side rather than via shared `--header-band-padding` token
- Nyquist coverage gaps: Phase 18 + 20 missing `*-VALIDATION.md`; Phase 19 draft

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1–5 | v1.0 | 16/16 | Complete | 2026-04-10 |
| 6–12 | v2.0 | 21/21 | Complete | 2026-04-16 |
| 13–17 | v3.0 | 15/15 | Complete | 2026-04-29 |
| 18. Member ZT Client Version | v3.1 | 2/2 | Complete | 2026-05-11 |
| 19. Internationalization Sweep | v3.1 | 2/2 | Complete | 2026-05-12 |
| 20. Shell & Users-Page Regression Fixes | v3.1 | 5/5 | Complete | 2026-05-15 (UAT 2026-05-20) |

---

*Roadmap rebuilt: 2026-05-20 — v3.1 archived to `milestones/v3.1-ROADMAP.md`; next milestone undefined.*
