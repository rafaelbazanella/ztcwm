import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme, lightTheme, resetStyles } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import '../components/logo.js';

const loginStyles = css`
    :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: var(--color-bg-primary);
    }

    .login-card {
        max-width: 400px;
        width: 100%;
        padding: var(--space-lg);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
    }

    .login-title {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        color: var(--color-text-primary);
        text-align: center;
        margin-bottom: var(--space-xs);
    }

    .login-subtitle {
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
        text-align: center;
        margin-bottom: var(--space-lg);
    }

    .login-logo {
        text-align: center;
        margin-bottom: var(--space-lg);
    }

    .remember-me {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        margin-bottom: var(--space-md);
    }

    .remember-me label {
        font-size: var(--font-size-xs);
        color: var(--color-text-secondary);
        cursor: pointer;
    }

    .remember-me input[type="checkbox"] {
        accent-color: var(--color-accent);
    }

    .login-submit {
        width: 100%;
        padding: 0.625rem 1rem;
        justify-content: center;
    }

    .error-message {
        color: var(--color-error);
        font-size: var(--font-size-sm);
        text-align: center;
        margin-top: var(--space-md);
        opacity: 0;
        transition: opacity var(--transition-fast);
    }

    .error-message.visible {
        opacity: 1;
    }

    .version-text {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        text-align: center;
        margin-top: var(--space-lg);
    }

    .spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid var(--color-spinner-track);
        border-top-color: var(--color-text-primary);
        border-radius: 50%;
        animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

@customElement('zt-login-page')
export class ZtLoginPage extends LitElement {
    @state() private username = '';
    @state() private password = '';
    @state() private rememberMe = false;
    @state() private loading = false;
    @state() private error = '';
    @state() private csrfToken = '';

    static styles = [theme, lightTheme, resetStyles, sharedStyles, loginStyles];

    connectedCallback(): void {
        super.connectedCallback();
        this._fetchCsrfToken();
        this.updateComplete.then(() => {
            this.shadowRoot?.getElementById('username')?.focus();
        });
    }

    private async _fetchCsrfToken(): Promise<void> {
        try {
            const res = await fetch('/api/csrf-token', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json() as { token: string };
                this.csrfToken = data.token;
            }
        } catch {
            // CSRF token fetch failure is not critical at this point
        }
    }

    private async _handleSubmit(e: Event): Promise<void> {
        e.preventDefault();

        if (!this.username.trim()) {
            this.error = 'Username is required';
            return;
        }
        if (!this.password) {
            this.error = 'Password is required';
            return;
        }

        this.loading = true;
        this.error = '';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken,
                },
                body: JSON.stringify({
                    username: this.username,
                    password: this.password,
                    rememberMe: this.rememberMe,
                }),
            });

            if (res.ok) {
                const returnUrl = sessionStorage.getItem('ztcwm-return-url');
                sessionStorage.removeItem('ztcwm-return-url');
                const safeUrl = returnUrl && returnUrl.startsWith('/') ? returnUrl : '/dashboard';
                window.location.href = safeUrl;
                return;
            }

            if (res.status === 401) {
                this.error = 'Invalid username or password';
            } else if (res.status === 429) {
                this.error = 'Too many login attempts. Please try again in 1 minute.';
            } else {
                this.error = 'Unable to connect to server. Please try again.';
            }
        } catch {
            this.error = 'Unable to connect to server. Please try again.';
        } finally {
            this.loading = false;
        }
    }

    render() {
        return html`
            <div class="login-logo">
                <zt-logo></zt-logo>
            </div>
            <div class="card login-card">
                <h1 class="login-title">Sign In</h1>
                <p class="login-subtitle">ZeroTier Controller Web Manager</p>
                <form @submit=${this._handleSubmit} novalidate>
                    <div class="form-group">
                        <label class="label" for="username">Username</label>
                        <input
                            class="input"
                            id="username"
                            type="text"
                            placeholder="Enter your username"
                            .value=${this.username}
                            @input=${(e: Event) => this.username = (e.target as HTMLInputElement).value}
                            ?disabled=${this.loading}
                        />
                    </div>
                    <div class="form-group">
                        <label class="label" for="password">Password</label>
                        <input
                            class="input"
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            .value=${this.password}
                            @input=${(e: Event) => this.password = (e.target as HTMLInputElement).value}
                            ?disabled=${this.loading}
                        />
                    </div>
                    <div class="remember-me">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            .checked=${this.rememberMe}
                            @change=${(e: Event) => this.rememberMe = (e.target as HTMLInputElement).checked}
                        />
                        <label for="rememberMe">Remember me for 7 days</label>
                    </div>
                    <button
                        type="submit"
                        class="btn btn-primary login-submit"
                        ?disabled=${this.loading}
                    >
                        ${this.loading ? html`<span class="spinner"></span>` : 'Sign In'}
                    </button>
                </form>
                <div class="error-message ${this.error ? 'visible' : ''}" aria-live="polite">
                    ${this.error}
                </div>
            </div>
            <div class="version-text">v2.0</div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-login-page': ZtLoginPage;
    }
}
