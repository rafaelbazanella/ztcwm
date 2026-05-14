# Phase 20: Shell & Users-Page Regression Fixes — Pattern Map

**Mapped:** 2026-05-14
**Files analyzed:** 17 (1 created, 16 modified)
**Analogs found:** 16 / 17 (one new-pattern file: nested-shadow-DOM computed-style test)

> Phase 20 is a regression fix on a mature Lit + Vite codebase. Every touched file has a direct analog inside the repo. This map pins the literal lines and excerpts the planner must reference in `<read_first>` and "copy the pattern" instructions. **No analog is synthesized — every excerpt below is verbatim from the source.**

---

## File Classification

| Touched File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/data-table.ts` | component (shared) | request-response (renders parent callbacks in own shadow DOM) | `src/components/modal.ts` (component already on `[theme, sharedStyles, css...]` pattern) | exact |
| `src/components/navbar.ts` | component (shared) | event-driven (poll + slot) | `src/components/sidebar.ts` (fixed-position shell sibling with brand row CSS) | exact |
| `src/app.ts` | app-shell | event-driven (router-location-changed) | self (already listens to event at lines 104-106; only adds rendering and Router import) | exact |
| `src/router/index.ts` | router | config | self (each existing route entry is the analog for the route metadata extension) | exact |
| `src/styles/theme.ts` | design tokens | config | self (`--navbar-height` token at line 67 — either delete or leave dormant per UI-SPEC) | exact |
| `src/pages/dashboard.ts` | page | request-response | `src/pages/dashboard.ts` itself (the two existing `<zt-navbar>` invocations at 241 + 249 are the deletion target) | exact |
| `src/pages/networks.ts` | page | request-response | same — one `<zt-navbar>` at line 137 | exact |
| `src/pages/network-detail.ts` | page | request-response | same — two `<zt-navbar>` invocations at 665 + 680 | exact |
| `src/pages/members.ts` | page | request-response | same — one `<zt-navbar>` at line 103 | exact |
| `src/pages/controllers.ts` | page | request-response | same — two `<zt-navbar>` invocations at 75 + 83 | exact |
| `src/pages/settings.ts` | page | request-response | same — one `<zt-navbar>` at line 95 | exact |
| `src/pages/logs.ts` | page | request-response | same — one `<zt-navbar>` at line 89 | exact |
| `src/pages/api-explorer.ts` | page | request-response | same — one `<zt-navbar>` at line 230 | exact |
| `src/pages/pending.ts` | page | request-response | same — one `<zt-navbar>` at line 199 | exact |
| `src/pages/users.ts` | page | request-response | same — one `<zt-navbar>` at line 523 | exact |
| `src/pages/users.test.ts` | test | n/a | `src/pages/users.test.ts:193-199` (existing navbar-asserting test block; remove or move) | exact |
| `src/app.test.ts` | test (new tests appended) | n/a | `src/app.test.ts:80-90` (existing "initRouter when authenticated" test as scaffolding template) | exact-self |
| **NEW** D-03 computed-style nested-shadow test | test | n/a | **no analog** — no existing test in this repo uses `getComputedStyle` or drills page.shadowRoot → child.shadowRoot. Pattern is new. | none |

---

## Shared Patterns

### Pattern A — Lit `static styles` array with `[theme, sharedStyles, css\`...\`]`

**Source 1 (component):** `src/components/modal.ts:1-14`
```ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';

@customElement('zt-modal')
export class ZtModal extends LitElement {
    @property({ type: Boolean, reflect: true }) open = false;
    @property({ type: String }) heading = '';

    static styles = [
        theme,
        sharedStyles,
        css`
            :host {
```

**Source 2 (component):** `src/components/ip-chip-editor.ts:1-21`
```ts
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
...
    static styles = [
        theme,
        sharedStyles,
        css`
```

**Source 3 (component, already has all elements):** `src/components/navbar.ts:1-22`
```ts
import { theme } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
...
    static styles = [
        theme,
        sharedStyles,
        css`
```

**What to copy:** The two-token positioning — `theme` first, `sharedStyles` second, then the local `css\`\`` literal. The import line at the top is `import { sharedStyles } from '../styles/shared.js';` (note the `../` relative path from `src/components/`; same path applies for `data-table.ts`).

**Applied to:** `src/components/data-table.ts` (D-01).

---

### Pattern B — `.btn-icon svg { width: 16px; height: 16px }` (the rule the test must verify)

**Source:** `src/styles/shared.ts:82-106`
```css
    .btn-icon {
        padding: 0.4rem;
        border-radius: var(--radius-sm);
        background: transparent;
        border: none;
        color: var(--color-text-secondary);
        cursor: pointer;
        transition: all var(--transition-fast);
    }

    .btn-icon:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-hover);
    }

    .btn-icon:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        color: var(--color-text-muted);
    }

    .btn-icon svg {
        width: 16px;
        height: 16px;
    }
```

**What to copy:** The literal `16px` / `16px` is the computed-width value the D-03 test asserts (`getComputedStyle(svg).width === '16px'`). The styling block itself is **not** changed by this phase; the regression test merely verifies it reaches into the data-table shadow root once `sharedStyles` is imported.

---

### Pattern C — `vaadin-router-location-changed` event subscription

**Source:** `src/app.ts:100-107`
```ts
        this.currentPath = window.location.pathname;
        window.addEventListener('popstate', () => {
            this.currentPath = window.location.pathname;
        });
        window.addEventListener('vaadin-router-location-changed', () => {
            this.currentPath = window.location.pathname;
        });
    }
```

**What to copy:** The persistent-navbar block in `app.ts` reuses **this same event** to refresh the route-derived title/subtitle. The listener already lives inside `firstUpdated()`; the planner adds two `@state` fields (e.g. `private routeTitle = ''`, `private routeSubtitle = ''`) updated inside this existing handler by reading `Router.location.route` from `@vaadin/router`. **Do NOT add a second `addEventListener` call** — extend the existing handler at lines 104-106.

**Router.location.route shape (Vaadin Router 2.0.1):** the route object passed during route resolution exposes any custom fields declared on the route definition. Phase 20 adds `title` and `subtitle` to each route (Pattern E below); they appear on `Router.location.route.title` / `.subtitle`. Import `Router` from `@vaadin/router` (already imported in `src/router/index.ts:1`).

---

### Pattern D — `<zt-navbar title="..." subtitle="...">` invocations to delete (literal-string source for route metadata)

**All 13 invocations (grep output):**
```
src/pages/users.ts:523:            <zt-navbar title="User Management" subtitle="Manage accounts and roles"></zt-navbar>
src/pages/settings.ts:95:            <zt-navbar title="Preferences" subtitle="User preferences"></zt-navbar>
src/pages/members.ts:103:            <zt-navbar title="Members" subtitle="All network members"></zt-navbar>
src/pages/api-explorer.ts:230:            <zt-navbar title="API Explorer" subtitle="Test ZeroTier API endpoints"></zt-navbar>
src/pages/logs.ts:89:            <zt-navbar title="Logs" subtitle="Application event log"></zt-navbar>
src/pages/pending.ts:199:            <zt-navbar title="Pending Authorization" subtitle="Unauthorized members across all networks"></zt-navbar>
src/pages/controllers.ts:75:                <zt-navbar title="Controllers" subtitle="Controller and peer status"></zt-navbar>
src/pages/controllers.ts:83:            <zt-navbar title="Controllers" subtitle="Controller and peer status"></zt-navbar>
src/pages/dashboard.ts:241:                <zt-navbar title="Dashboard" subtitle="Overview"></zt-navbar>
src/pages/dashboard.ts:249:            <zt-navbar title="Dashboard" subtitle="Overview"></zt-navbar>
src/pages/networks.ts:137:            <zt-navbar title="Networks" subtitle="Manage your ZeroTier networks"></zt-navbar>
src/pages/network-detail.ts:665:                <zt-navbar title="Network Detail" subtitle=${this.networkId}></zt-navbar>
src/pages/network-detail.ts:680:            <zt-navbar title="Network Detail" subtitle=${this.networkId}></zt-navbar>
```

**Per-page `import '../components/navbar.js'` lines to delete:**
```
src/pages/settings.ts:6
src/pages/members.ts:9
src/pages/logs.ts:8
src/pages/users.ts:10
src/pages/networks.ts:9
src/pages/api-explorer.ts:6
src/pages/pending.ts:9
src/pages/controllers.ts:8
src/pages/dashboard.ts:10
src/pages/network-detail.ts:12
```

**What to copy:** The literal title/subtitle strings become route-metadata values in `src/router/index.ts` (Pattern E). **D-07 caveat:** `network-detail.ts` passes `subtitle=${this.networkId}` (dynamic); per D-07 the route metadata uses a **static** string (`subtitle: 'Members and settings'`), and the dynamic network name stays inside the page body (not the navbar).

---

### Pattern E — Vaadin Router route definition shape

**Source:** `src/router/index.ts:72-99` (three representative existing routes)
```ts
                {
                    path: 'dashboard',
                    component: 'page-dashboard',
                    action: async () => {
                        await import('../pages/dashboard.js');
                    },
                },
                {
                    path: 'networks',
                    component: 'page-networks',
                    action: async () => {
                        await import('../pages/networks.js');
                    },
                },
                {
                    path: 'networks/:id',
                    component: 'page-network-detail',
                    action: async () => {
                        await import('../pages/network-detail.js');
                    },
                },
```

**Authorization-gated route variant** (for `users` and `api` routes, which Phase 20 also extends):
```ts
                {
                    path: 'users',
                    component: 'page-users',
                    action: async (_context, commands) => {
                        await import('../pages/users.js');
                        await userService.getCurrentUser();
                        if (!userService.hasRole('admin')) {
                            return commands.redirect('/dashboard');
                        }
                        return undefined;
                    },
                },
```

**What to copy:** Add `title: '...'` and `subtitle: '...'` as **sibling keys** to `path`/`component`/`action` on each authenticated route (children of the `path: '/'` parent at line 53). Vaadin Router passes the whole route object through `Router.location.route` — extra fields are preserved. Leave `/login` (line 46-51) and `/setup` (line 38-44) **without** metadata per D-06.

Final shape per D-05:
```ts
{ path: 'dashboard', component: 'page-dashboard', title: 'Dashboard', subtitle: 'Overview', action: async () => { await import('../pages/dashboard.js'); } },
```

---

### Pattern F — Sidebar `.brand` row geometry (LAYOUT-02 alignment source)

**Source:** `src/components/sidebar.ts:18-40`
```ts
            :host {
                display: block;
                width: var(--sidebar-width);
                height: 100vh;
                background: var(--color-bg-secondary);
                border-right: 1px solid var(--color-border);
                position: fixed;
                top: 0;
                left: 0;
                z-index: 100;
                overflow-y: auto;
                transition: width var(--transition-base);
            }

            .brand {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.25rem;
                border-bottom: 1px solid var(--color-border);
                text-decoration: none;
                cursor: pointer;
            }
```

**What to copy (literally):** `padding: 1rem 1.25rem` and `border-bottom: 1px solid var(--color-border)`. These two declarations move into `<zt-navbar> :host` (replacing the current `height: var(--navbar-height); padding: 0 1.5rem` at `navbar.ts:24-28`). The `position: fixed; top: 0; z-index: 100` pattern at lines 24-27 is the analog for D-11 sticky/fixed positioning — though the navbar should use `position: sticky; top: 0` inside `.main-content` (which is the natural fit given `.main-content` has `margin-left: var(--sidebar-width)` already at `app.ts:33`).

---

### Pattern G — Persistent component in `app.ts` shell render

**Source:** `src/app.ts:119-135` (the current shell render — the modification site for D-13)
```ts
    render() {
        if (this.isLoginPage) {
            return html`
                <div id="outlet" class="router-outlet"></div>
                <zt-toast-container></zt-toast-container>
            `;
        }
        return html`
            <div class="app-layout">
                <zt-sidebar .currentPath=${this.currentPath}></zt-sidebar>
                <main class="main-content">
                    <div id="outlet" class="router-outlet"></div>
                </main>
                <zt-toast-container></zt-toast-container>
            </div>
        `;
    }
```

**What to copy:** `<zt-sidebar>` is the existing precedent for a persistent shell component — it is mounted once at the shell level, never inside pages. The new `<zt-navbar>` follows the same lifecycle: mounted **once** inside the `if (!this.isLoginPage)` branch, between `<main class="main-content">` and `<div id="outlet">`. Bind `title`/`subtitle` via `.title=${this.routeTitle} .subtitle=${this.routeSubtitle}` (property bindings, mirroring sidebar's `.currentPath=${this.currentPath}` at line 128). The new navbar import goes alongside `./components/sidebar.js` at `app.ts:5-6`:
```ts
import './components/sidebar.js';
import './components/navbar.js';  // ADD
import './components/toast.js';
```

---

### Pattern H — `isLoginPage` shell gate (the D-06 navbar-visibility gate)

**Source:** `src/app.ts:43-45`
```ts
    get isLoginPage(): boolean {
        return this.currentPath === '/login' || this.currentPath === '/setup';
    }
```

Used at line 120: `if (this.isLoginPage) { return html\`...\` }`.

**What to copy:** Nothing new — Phase 20 reuses this getter unchanged. The new `<zt-navbar>` lives **inside** the non-login branch (line 126-135), so it automatically inherits the `!isLoginPage` gate. No additional gating logic required.

---

## Per-File Pattern Assignments

### `src/components/data-table.ts` — D-01

**Role:** shared component (host of users-page action buttons in its shadow DOM)
**Data flow:** request-response (renders parent-provided render callbacks)

**Current `static styles`** at `data-table.ts:32-128`:
```ts
    static styles = [
        theme,
        css`
            :host { display: block; }
            ...
        `,
    ];
```

**Current imports** at `data-table.ts:1-5`:
```ts
import { LitElement, html, css, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import { ChevronUp, ChevronDown, Copy, Check, Pencil } from 'lucide-static';
import { theme } from '../styles/theme.js';
```

**Change (D-01 — single line + one new import):**
1. Add import after line 5: `import { sharedStyles } from '../styles/shared.js';`
2. Change `static styles = [\n        theme,` → `static styles = [\n        theme,\n        sharedStyles,`

**Analog to copy from:** `src/components/modal.ts:1-14` (Pattern A above). Same component-level position; identical relative import path; identical token order.

**Verification:** the page-level user-button `.btn-icon svg { width: 16px; height: 16px }` rule (Pattern B) now applies inside the data-table shadow root. The D-03 test verifies via computed style.

---

### `src/components/navbar.ts` — D-09, D-10, D-11

**Role:** shared component
**Data flow:** event-driven (30s health-check poll + theme toggle + slot for per-page actions)

**Current `:host` block** at `navbar.ts:23-32`:
```ts
            :host {
                display: block;
                height: var(--navbar-height);
                background: var(--color-bg-secondary);
                border-bottom: 1px solid var(--color-border);
                padding: 0 1.5rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
```

**Analog target (replace `height` + `padding`):** `src/components/sidebar.ts:32-40` (Pattern F)
```ts
            .brand {
                ...
                padding: 1rem 1.25rem;
                border-bottom: 1px solid var(--color-border);
                ...
            }
```

**Change:** Replace `height: var(--navbar-height); ... padding: 0 1.5rem` with `padding: 1rem 1.25rem` (D-09). Keep the existing `border-bottom: 1px solid var(--color-border)` (already matches D-10 — no change needed there). Remove the second `display: flex` (duplicate at line 29) — fold into the first.

**Add (D-11) — sticky positioning:**
```ts
            :host {
                position: sticky;
                top: 0;
                z-index: 50;  /* below sidebar's z-index: 100; high enough to clear page content */
                background: var(--color-bg-secondary);
                border-bottom: 1px solid var(--color-border);
                padding: 1rem 1.25rem;
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
```

**What to copy:** the literal `padding: 1rem 1.25rem` and `border-bottom: 1px solid var(--color-border)` from `sidebar.ts:36-37` — byte-for-byte. The render template (`navbar.ts:160-194`) and the `connectedCallback` poll setup (`navbar.ts:106-112`) are **unchanged**.

---

### `src/app.ts` — D-05, D-06, D-11 (host the persistent navbar)

**Role:** app-shell
**Data flow:** event-driven

**Current render** (analog target): `src/app.ts:119-135` (Pattern G)

**Current location-changed listener** (analog target): `src/app.ts:104-106` (Pattern C)

**Changes:**

1. **Import** at line 5-6 (after `sidebar.js`):
   ```ts
   import './components/sidebar.js';
   import './components/navbar.js';
   import './components/toast.js';
   ```

2. **Import `Router`** alongside the existing router-helper imports at line 4:
   ```ts
   import { initRouter, checkSetupStatus, checkAuth } from './router/index.js';
   import { Router } from '@vaadin/router';
   ```

3. **Add two `@state` fields** after line 11 (`@state() private theme = 'dark'`):
   ```ts
   @state() private routeTitle = '';
   @state() private routeSubtitle = '';
   ```

4. **Extend the existing location-changed listener** at `app.ts:104-106` (do NOT add a new listener):
   ```ts
   window.addEventListener('vaadin-router-location-changed', () => {
       this.currentPath = window.location.pathname;
       const route = (Router as any).location?.route as { title?: string; subtitle?: string } | undefined;
       this.routeTitle = route?.title ?? '';
       this.routeSubtitle = route?.subtitle ?? '';
   });
   ```
   (Planner verifies Vaadin Router 2.0.1's exact accessor — likely `Router.location` is the imported static; if not, fall back to capturing the location off the event's `detail`. Check `@vaadin/router` type defs in `node_modules` before authoring.)

5. **Modify the non-login render branch** at `app.ts:126-134`:
   ```ts
   return html`
       <div class="app-layout">
           <zt-sidebar .currentPath=${this.currentPath}></zt-sidebar>
           <main class="main-content">
               <zt-navbar .title=${this.routeTitle} .subtitle=${this.routeSubtitle} show-logout></zt-navbar>
               <div id="outlet" class="router-outlet"></div>
           </main>
           <zt-toast-container></zt-toast-container>
       </div>
   `;
   ```

**What to copy:** the `<zt-sidebar>` invocation pattern at line 128 — property-binding via `.foo=${this.bar}`. The `show-logout` boolean attribute matches the existing prop API at `navbar.ts:12` (`@property({ type: Boolean, attribute: 'show-logout' }) showLogout = true;`).

---

### `src/router/index.ts` — D-05

**Role:** router config
**Data flow:** config

**Analog:** Pattern E above — each existing route entry (`router/index.ts:73-78`, `80-85`, `87-92`, etc.) is the analog. Add `title` + `subtitle` fields to every entry inside the `children` array at lines 67-156, **except** `/setup` (38-44) and `/login` (46-51).

**Title/subtitle source values** — derived literally from Pattern D's grep output:

| Route path | `title` | `subtitle` |
|---|---|---|
| `'dashboard'` | `'Dashboard'` | `'Overview'` |
| `'networks'` | `'Networks'` | `'Manage your ZeroTier networks'` |
| `'networks/:id'` | `'Network Detail'` | `'Members and settings'` (static per D-07; replaces dynamic `${this.networkId}`) |
| `'members'` | `'Members'` | `'All network members'` |
| `'controllers'` | `'Controllers'` | `'Controller and peer status'` |
| `'settings'` | `'Preferences'` | `'User preferences'` |
| `'logs'` | `'Logs'` | `'Application event log'` |
| `'api'` | `'API Explorer'` | `'Test ZeroTier API endpoints'` |
| `'pending'` | `'Pending Authorization'` | `'Unauthorized members across all networks'` |
| `'users'` | `'User Management'` | `'Manage accounts and roles'` |

**What to copy:** insert `title: '...', subtitle: '...',` as sibling fields between `component` and `action` (cosmetic ordering; Vaadin Router does not care). Vaadin Router's `Route` type allows arbitrary extension fields without a typed-augmentation, but the planner may optionally add `declare module '@vaadin/router' { interface Route { title?: string; subtitle?: string } }` for type safety — call this out as a small optional polish, not required.

---

### `src/styles/theme.ts` — UI-SPEC § Navbar height token cleanup

**Role:** design tokens
**Data flow:** config

**Current:** `--navbar-height: 56px;` at line 67 (the only consumer was `navbar.ts:25`, removed in this phase).

**Decision (UI-SPEC says planner picks):**
- Either delete line 67 outright (preferred — dead token after Phase 20)
- Or leave it dormant (acceptable if planner prefers minimum-diff)

**Analog:** none specific — the surrounding token block (`--sidebar-width: 240px;` at line 65, `--sidebar-width-collapsed: 64px;` at line 66) is the local context. Both are still consumed (`sidebar.ts:20`, `app.ts:33`).

**What to copy:** if deleting, mirror the deletion style of any prior token cleanup in `git log` (none in Phase 20 scope) — just remove the single line. If keeping dormant, add a `/* deprecated: was navbar :host height; removed Phase 20 */` comment.

---

### Page files (10 of them) — D-13

**Role:** page
**Data flow:** request-response

**Per-file action map** (all derived from Pattern D's grep output):

| Page file | Lines to delete | Lines kept untouched |
|---|---|---|
| `src/pages/dashboard.ts` | 10 (import), 241, 249 | render structure (replace `<zt-navbar>` line with empty line or remove) |
| `src/pages/networks.ts` | 9 (import), 137 | rest of render |
| `src/pages/network-detail.ts` | 12 (import), 665, 680 | rest of render |
| `src/pages/members.ts` | 9 (import), 103 | rest of render |
| `src/pages/controllers.ts` | 8 (import), 75, 83 | rest of render |
| `src/pages/settings.ts` | 6 (import), 95 | rest of render |
| `src/pages/logs.ts` | 8 (import), 89 | rest of render |
| `src/pages/api-explorer.ts` | 6 (import), 230 | rest of render |
| `src/pages/pending.ts` | 9 (import), 199 | rest of render |
| `src/pages/users.ts` | 10 (import), 523 | rest of render (page-header, data-table, modals) |

**Analog precedent (`dashboard.ts:238-251`):**
```ts
    render() {
        if (this.loading) {
            return html`
                <zt-navbar title="Dashboard" subtitle="Overview"></zt-navbar>
                <div style="margin-top: var(--space-lg, 1.5rem);">
                    <zt-loading variant="skeleton-cards" count="4"></zt-loading>
                </div>
            `;
        }

        return html`
            <zt-navbar title="Dashboard" subtitle="Overview"></zt-navbar>

            <div style="margin-top: var(--space-lg, 1.5rem);">
```

**What to copy:** D-16 says treat double-renders uniformly — both branches lose their `<zt-navbar>`. The `<div style="margin-top: var(--space-lg, 1.5rem);">` wrapper stays (it positions content below the now-app-level navbar). Result after edit:
```ts
    render() {
        if (this.loading) {
            return html`
                <div style="margin-top: var(--space-lg, 1.5rem);">
                    <zt-loading variant="skeleton-cards" count="4"></zt-loading>
                </div>
            `;
        }

        return html`
            <div style="margin-top: var(--space-lg, 1.5rem);">
```

Note: the persistent navbar inside `app.ts` already occupies the top strip with its own padding (1rem 1.25rem). The `margin-top: var(--space-lg, 1.5rem)` page-level spacer is preserved exactly to keep visual rhythm.

---

### `src/pages/users.test.ts` — D-15

**Role:** test
**Data flow:** n/a

**Lines to remove or move:** `users.test.ts:193-199` — the test block "renders navbar with User Management title":
```ts
    it('renders navbar with User Management title', async () => {
        const el = await createUsersPage();

        const navbar = el.shadowRoot!.querySelector('zt-navbar');
        expect(navbar).toBeTruthy();
        expect(navbar?.getAttribute('title') || (navbar as any)?.title).toContain('User');
    });
```

**Decision (per D-15):** delete this `it()` block from `users.test.ts`. Replace with equivalent assertion in `app.test.ts` (see next file). No other navbar references exist in any other `pages/*.test.ts` (verified by grep — only `users.test.ts:196` matches).

**Analog for the replacement assertion in `app.test.ts`:** existing block at `app.test.ts:80-90`:
```ts
it('initializes router when authenticated', async () => {
    mockPathname('/dashboard');
    vi.mocked(checkSetupStatus).mockResolvedValue(false);
    vi.mocked(checkAuth).mockResolvedValue(true);

    const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 100));

    expect(initRouter).toHaveBeenCalled();
});
```

**What to copy:** the `mockPathname`/`checkAuth`/`fixture`/`updateComplete` ladder, then assert `el.shadowRoot!.querySelector('zt-navbar')` is truthy on `/dashboard` and falsy on `/login`. The existing test file already mocks `./components/sidebar.js` and `./components/toast.js` as empty modules (lines 11-12) — add `vi.mock('./components/navbar.js', () => ({}));` alongside them so the navbar import doesn't pull in real network polling during the test.

---

### `src/app.test.ts` — new tests appended (SC #5)

**Role:** test
**Data flow:** n/a

**Analog:** the existing file itself — re-use its `mockPathname` helper (lines 44-65), its `beforeEach`/`afterEach` scaffolding (lines 22-42), and its `vi.mock(...)` factory at the top (lines 4-12).

**New `describe` block to append** (after the existing `describe('zt-app pre-router auth gate')` at line 137):
```ts
describe('zt-app persistent navbar (LAYOUT-01)', () => {
    // beforeEach/afterEach mirror the existing block — re-use the same scaffolding
    it('renders <zt-navbar> when authenticated on /dashboard', async () => {
        mockPathname('/dashboard');
        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        const navbar = el.shadowRoot!.querySelector('zt-navbar');
        expect(navbar).toBeTruthy();
    });

    it('does NOT render <zt-navbar> on /login', async () => {
        mockPathname('/login');
        const el = await fixture<ZtApp>(html`<zt-app></zt-app>`);
        await el.updateComplete;
        await new Promise(r => setTimeout(r, 100));

        const navbar = el.shadowRoot!.querySelector('zt-navbar');
        expect(navbar).toBeFalsy();
    });

    it('does NOT render <zt-navbar> on /setup', async () => {
        mockPathname('/setup');
        ...
    });
});
```

**What to copy:** the test file's own scaffolding — identical `fixture<ZtApp>`, identical `await el.updateComplete; await new Promise(r => setTimeout(r, 100))` settle pattern. Add the navbar mock alongside the existing sidebar/toast mocks at lines 11-12.

---

### NEW — D-03 nested-shadow computed-style test (no analog)

**Role:** test
**Data flow:** n/a

**Why no analog:** `grep -rn "getComputedStyle"` returns zero matches in `/var/www/Projects/ztcwm/src`. No existing test drills `page.shadowRoot → child.shadowRoot`. This is a genuinely new test pattern.

**Closest precedent (single-level shadow drill):** `src/pages/users.test.ts:196` (existing pattern that the test must extend):
```ts
const navbar = el.shadowRoot!.querySelector('zt-navbar');
expect(navbar).toBeTruthy();
```

**Pattern the new test must construct (synthesized from D-03 + CONTEXT § specifics):**
```ts
it('Users-page action buttons render icons at 16x16 (D-03)', async () => {
    const el = await createUsersPage();
    // Drill page -> data-table
    const dataTable = el.shadowRoot!.querySelector('zt-data-table') as HTMLElement;
    expect(dataTable).toBeTruthy();
    // Drill data-table shadow root -> action buttons
    const buttons = dataTable.shadowRoot!.querySelectorAll('button.btn-icon');
    expect(buttons.length).toBeGreaterThanOrEqual(3); // Edit + Reset + Delete per row
    // Verify computed style of the nested SVG
    const firstSvg = buttons[0].querySelector('svg');
    expect(firstSvg).toBeTruthy();
    const cs = getComputedStyle(firstSvg!);
    expect(cs.width).toBe('16px');
    expect(cs.height).toBe('16px');
});
```

**File location:** add to `src/pages/users.test.ts` (per project convention — page-specific tests live alongside their pages). The test uses the existing `createUsersPage()` helper at `users.test.ts:61-68`.

**What to copy:** the existing `createUsersPage()` factory + the existing `el.shadowRoot!.querySelector('zt-data-table')` pattern (which already appears at `users.test.ts:82` and `:162`). The new addition is two more `.shadowRoot!.querySelectorAll(...)` calls and the `getComputedStyle(...)` check.

**Caveat:** the `lucide-static` SVGs render via `unsafeSVG()` directive — they end up as raw `<svg>...</svg>` children of the button. Verify by inspecting the rendered DOM in the test (use `console.log(buttons[0].innerHTML)` during development). The CSS selector `button.btn-icon svg` (Pattern B) should reach them once `sharedStyles` lives inside `<zt-data-table>` (D-01).

---

## No Analog Found

| File | Role | Data flow | Reason |
|---|---|---|---|
| D-03 nested-shadow computed-style test (location TBD: probably `users.test.ts` addendum) | test | n/a | No existing test in the repo uses `getComputedStyle` or chains two shadow-root drills. Pattern must be constructed; the planner derives it from the synthesized snippet above + the existing single-level shadow-root query pattern in `users.test.ts:82`. |

---

## Metadata

**Analog search scope:** `/var/www/Projects/ztcwm/src/{components,pages,router,styles,app.ts,app.test.ts}`
**Files scanned:** 17 source files read in full or in targeted ranges; 3 grep sweeps for `<zt-navbar`, navbar imports, and `sharedStyles`.
**Pattern extraction date:** 2026-05-14
**Codebase conventions confirmed:**
- Lit + custom elements (`@customElement('zt-...')`)
- `static styles = [theme, sharedStyles, css\`...\`]` is the canonical Lit class style block
- Tests use `@open-wc/testing-helpers` `fixture` + `html`; `vi.hoisted` for service mocks
- Tests live alongside source files (`src/components/foo.ts` + `src/components/foo.test.ts`)
- Vaadin Router 2.0.1 — `Router` imported from `@vaadin/router`, `RouterLocation` already used at `network-detail.ts:3`
- TypeScript: no `tsconfig` issues with extension fields on Vaadin `Route` — current codebase already does property-bag-style route configs

---

## PATTERN MAPPING COMPLETE

**Phase:** 20 — Shell & Users-Page Regression Fixes
**Files classified:** 17
**Analogs found:** 16 / 17

### Coverage
- Files with exact analog: 16
- Files with role-match analog: 0
- Files with no analog: 1 (D-03 nested-shadow computed-style test)

### Key Patterns Identified
- Every Lit component in the repo follows `static styles = [theme, sharedStyles, css\`...\`]` — `data-table.ts` is the lone holdout that joins the convention in D-01.
- The `vaadin-router-location-changed` event listener already exists at `app.ts:104-106` and is the single point of route-aware updates — the persistent-navbar block extends this handler, does not add a new one.
- Sidebar `.brand` row at `sidebar.ts:32-40` is the literal copy source for navbar's new `padding: 1rem 1.25rem` + bottom border — value-by-value duplication, not abstraction.
- Pages all share the `<zt-navbar title=... subtitle=...>` shape; the 13 invocations grep'd in Pattern D are the literal-string source for route-metadata title/subtitle values added to `router/index.ts`.
- No existing test uses `getComputedStyle` or drills two shadow roots deep — the D-03 regression test is a genuinely new pattern, scaffolded on the existing `createUsersPage()` helper.

### Files Created
- `/var/www/Projects/ztcwm/.planning/phases/20-shell-users-page-regression-fixes/20-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog file paths + line numbers in PLAN.md `<read_first>` and "copy from" sections.
