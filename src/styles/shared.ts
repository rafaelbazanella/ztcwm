import { css } from 'lit';

export const sharedStyles = css`
    p, h1, h2, h3, h4, h5, h6 {
        margin: 0;
    }

    .card {
        background: var(--color-bg-secondary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 1.25rem;
    }

    .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .card-title {
        font-size: var(--font-size-lg);
        font-weight: 600;
        color: var(--color-text-primary);
    }

    .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: var(--radius-md);
        border: 1px solid transparent;
        font-family: var(--font-family);
        font-size: var(--font-size-sm);
        font-weight: 500;
        cursor: pointer;
        transition: all var(--transition-fast);
        text-decoration: none;
        line-height: 1.4;
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-primary {
        background: var(--color-accent);
        color: var(--color-on-accent);
    }

    .btn-primary:hover:not(:disabled) {
        background: var(--color-accent-hover);
    }

    .btn-secondary {
        background: var(--color-bg-tertiary);
        color: var(--color-text-primary);
        border-color: var(--color-border);
    }

    .btn-secondary:hover:not(:disabled) {
        background: var(--color-bg-hover);
    }

    .btn-danger {
        background: var(--color-error);
        color: var(--color-on-accent);
    }

    .btn-danger:hover:not(:disabled) {
        background: var(--color-error-hover);
    }

    .btn-sm {
        padding: 0.3rem 0.6rem;
        font-size: var(--font-size-xs);
    }

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

    .btn-icon-svg {
        display: inline-flex;
        width: 16px;
        height: 16px;
    }

    .btn-full {
        width: 100%;
    }

    .input {
        padding: 0.5rem 0.75rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
        background: var(--color-bg-primary);
        color: var(--color-text-primary);
        font-family: var(--font-family);
        font-size: var(--font-size-base);
        outline: none;
        transition: border-color var(--transition-fast);
        width: 100%;
        box-sizing: border-box;
    }

    .input:focus {
        border-color: var(--color-accent);
    }

    .input::placeholder {
        color: var(--color-text-muted);
    }

    .label {
        display: block;
        font-size: var(--font-size-sm);
        font-weight: 500;
        color: var(--color-text-secondary);
        margin-bottom: 0.35rem;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    .table-wrapper {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        padding: 0.65rem 0.75rem;
        font-size: var(--font-size-xs);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--color-text-muted);
        border-bottom: 1px solid var(--color-border);
    }

    td {
        padding: 0.65rem 0.75rem;
        font-size: var(--font-size-sm);
        color: var(--color-text-primary);
        border-bottom: 1px solid var(--color-border);
    }

    tr:hover td {
        background: var(--color-bg-hover);
    }

    .mono {
        font-family: var(--font-mono);
        font-size: var(--font-size-xs);
    }

    .text-muted {
        color: var(--color-text-muted);
    }

    .text-secondary {
        color: var(--color-text-secondary);
    }

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
    }

    .page-title {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .page-subtitle {
        font-size: var(--font-size-sm);
        color: var(--color-text-secondary);
        margin-top: 0.25rem;
    }

    .grid {
        display: grid;
        gap: 1rem;
    }

    .grid-2 {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }

    .grid-3 {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    .skeleton {
        background: linear-gradient(90deg, var(--color-bg-tertiary) 25%, var(--color-bg-hover) 50%, var(--color-bg-tertiary) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s linear infinite;
        border-radius: var(--radius-md);
    }

    .grid-4 {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }

    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: var(--color-text-muted);
    }

    .empty-state-icon {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--color-text-muted);
    }

    .spinner {
        width: 24px;
        height: 24px;
        border: 2px solid var(--color-border);
        border-top-color: var(--color-accent);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
        margin-right: 0.5rem;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .flex {
        display: flex;
    }

    .flex-center {
        display: flex;
        align-items: center;
    }

    .gap-sm {
        gap: 0.5rem;
    }

    .gap-md {
        gap: 1rem;
    }
`;
