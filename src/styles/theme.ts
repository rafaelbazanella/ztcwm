import { css } from 'lit';

export const theme = css`
    :host {
        --color-bg-primary: #0f1117;
        --color-bg-secondary: #161923;
        --color-bg-tertiary: #1c1f2e;
        --color-bg-elevated: #222639;
        --color-bg-hover: #2a2f45;

        --color-border: #2e3348;
        --color-border-light: #3a3f55;

        --color-text-primary: #e4e6ef;
        --color-text-secondary: #9498b0;
        --color-text-muted: #6b6f85;

        --color-accent: #F5A623;
        --color-accent-hover: #FFB84D;
        --color-accent-muted: rgba(245, 166, 35, 0.12);

        --color-success: #22c55e;
        --color-success-muted: rgba(34, 197, 94, 0.15);
        --color-warning: #f59e0b;
        --color-warning-muted: rgba(245, 158, 11, 0.15);
        --color-error: #ef4444;
        --color-error-muted: rgba(239, 68, 68, 0.15);
        --color-error-hover: #c01f1f;
        --color-info: #3b82f6;
        --color-info-muted: rgba(59, 130, 246, 0.15);

        --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

        --font-size-xs: 0.75rem;
        --font-size-sm: 0.8125rem;
        --font-size-base: 0.875rem;
        --font-size-lg: 1rem;
        --font-size-xl: 1.25rem;
        --font-size-2xl: 1.5rem;
        --font-size-3xl: 2rem;

        --space-xs: 4px;
        --space-sm: 8px;
        --space-md: 16px;
        --space-lg: 24px;
        --space-xl: 32px;
        --space-2xl: 48px;
        --space-3xl: 64px;

        --radius-sm: 4px;
        --radius-md: 6px;
        --radius-lg: 8px;
        --radius-xl: 12px;

        --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
        --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.3);
        --shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.4);
        --shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.5);

        --color-overlay: rgba(0, 0, 0, 0.6);
        --color-spinner-track: rgba(228, 230, 239, 0.3);
        --color-on-accent: #ffffff;

        --sidebar-width: 240px;
        --sidebar-width-collapsed: 64px;

        --transition-fast: 150ms ease;
        --transition-base: 200ms ease;
    }
`;

export const lightTheme = css`
    :host([theme="light"]) {
        --color-bg-primary: #f8f9fc;
        --color-bg-secondary: #ffffff;
        --color-bg-tertiary: #f0f2f5;
        --color-bg-elevated: #ffffff;
        --color-bg-hover: #e8eaef;

        --color-border: #c0c6d4;
        --color-border-light: #b8bfcd;

        --color-text-primary: #1a1d2b;
        --color-text-secondary: #5a5e72;
        --color-text-muted: #646877;

        --color-accent: #9A6500;
        --color-accent-hover: #7E5300;
        --color-accent-muted: rgba(154, 101, 0, 0.10);

        --color-success: #117a3b;
        --color-success-muted: rgba(17, 122, 59, 0.12);
        --color-warning: #a04806;
        --color-warning-muted: rgba(160, 72, 6, 0.12);
        --color-error: #c91f1f;
        --color-error-muted: rgba(201, 31, 31, 0.12);
        --color-error-hover: #b91c1c;
        --color-info: #2563eb;
        --color-info-muted: rgba(37, 99, 235, 0.12);

        --shadow-sm: 0 1px 2px rgba(31, 38, 64, 0.06);
        --shadow-md: 0 2px 4px rgba(31, 38, 64, 0.06), 0 4px 8px rgba(31, 38, 64, 0.05);
        --shadow-lg: 0 4px 8px rgba(31, 38, 64, 0.07), 0 12px 24px rgba(31, 38, 64, 0.08);
        --shadow-xl: 0 8px 16px rgba(31, 38, 64, 0.08), 0 24px 48px rgba(31, 38, 64, 0.12);

        --color-overlay: rgba(31, 38, 64, 0.5);
        --color-spinner-track: rgba(26, 29, 43, 0.20);
        --color-on-accent: #ffffff;
    }
`;

export const resetStyles = css`
    *,
    *::before,
    *::after {
        box-sizing: border-box;
    }
`;
