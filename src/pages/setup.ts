import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { theme, lightTheme, resetStyles } from '../styles/theme.js';
import { sharedStyles } from '../styles/shared.js';
import { toastService } from '../services/index.js';
import '../components/logo.js';
import '../components/modal.js';

interface TestStep {
    name: string;
    label: string;
    status: 'pending' | 'running' | 'pass' | 'fail';
    error?: string;
}

const setupStyles = css`
    :host {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: var(--color-bg-primary);
    }

    .setup-card {
        max-width: 480px;
        width: 100%;
        padding: var(--space-lg);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
    }

    .setup-logo {
        text-align: center;
        margin-bottom: var(--space-lg);
    }

    .step-title {
        font-size: var(--font-size-2xl);
        font-weight: 700;
        color: var(--color-text-primary);
        text-align: center;
        margin-bottom: var(--space-xs);
    }

    .step-subtitle {
        font-size: var(--font-size-base);
        color: var(--color-text-secondary);
        text-align: center;
        margin-bottom: var(--space-lg);
    }

    .version-text {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        text-align: center;
        margin-top: var(--space-lg);
    }

    /* Stepper */
    .stepper {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: var(--space-xl);
        gap: 0;
    }

    .stepper-step {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .stepper-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        transition: all var(--transition-base);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        color: var(--color-on-accent);
    }

    .stepper-dot.completed {
        background: var(--color-success);
        border: 2px solid var(--color-success);
    }

    .stepper-dot.active {
        background: var(--color-accent);
        border: 2px solid var(--color-accent);
        box-shadow: 0 0 0 4px var(--color-accent-muted);
    }

    .stepper-dot.upcoming {
        background: transparent;
        border: 2px solid var(--color-border);
    }

    .stepper-line {
        height: 2px;
        width: 40px;
    }

    .stepper-line.completed {
        background: var(--color-success);
    }

    .stepper-line.upcoming {
        background: var(--color-border);
    }

    .stepper-label {
        font-size: var(--font-size-xs);
        margin-top: var(--space-xs);
        font-weight: 500;
        color: var(--color-text-secondary);
    }

    .stepper-label.active {
        color: var(--color-accent);
        font-weight: 600;
    }

    .stepper-label.completed {
        color: var(--color-success);
    }

    /* Form */
    .field-error {
        font-size: var(--font-size-sm);
        color: var(--color-error);
        margin-top: var(--space-xs);
        opacity: 0;
        transition: opacity var(--transition-fast);
    }

    .field-error.visible {
        opacity: 1;
    }

    .input.error {
        border-color: var(--color-error);
    }

    .btn-row {
        display: flex;
        justify-content: space-between;
        margin-top: var(--space-lg);
    }

    /* .btn-full is provided by shared.ts (canonical width: 100% rule).
       Removed local override per WR-02: the local rule duplicated the canonical
       width and additionally added justify-content: center, which is a behavior
       the canonical does not promise. Setup's full-width buttons rely on the
       shared .btn's inline-flex + gap layout (works for single-label content). */

    /* Password strength */
    .strength-row {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        margin-top: var(--space-xs);
    }

    .strength-bar {
        width: 120px;
        height: 4px;
        border-radius: var(--radius-sm);
        background: var(--color-bg-tertiary);
    }

    .strength-fill {
        height: 100%;
        border-radius: var(--radius-sm);
        transition: width var(--transition-base), background-color var(--transition-base);
    }

    .strength-label {
        font-size: var(--font-size-xs);
    }

    /* Connection test modal */
    .test-step {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        padding: var(--space-sm) 0;
    }

    .test-icon {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        flex-shrink: 0;
    }

    .test-icon.pending {
        border: 2px solid var(--color-border);
        background: transparent;
        width: 12px;
        height: 12px;
    }

    .test-icon.running {
        width: 16px;
        height: 16px;
        border: 2px solid var(--color-border);
        border-top-color: var(--color-info);
        animation: spin 0.6s linear infinite;
    }

    .test-icon.pass {
        background: var(--color-success);
        color: var(--color-on-accent);
    }

    .test-icon.fail {
        background: var(--color-error);
        color: var(--color-on-accent);
    }

    .test-summary {
        padding: var(--space-md);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        margin-top: var(--space-md);
    }

    .test-summary.success {
        background: var(--color-success-muted);
        color: var(--color-success);
    }

    .test-summary.error {
        background: var(--color-error-muted);
        color: var(--color-error);
    }

    .input-mono {
        font-family: var(--font-mono);
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

    .spinner-on-light {
        border-color: var(--color-spinner-track);
        border-top-color: var(--color-text-primary);
        width: 16px;
        height: 16px;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
        .setup-card {
            max-width: 90vw;
            padding: var(--space-md);
        }
        .stepper-label {
            display: none;
        }
        .stepper-line {
            width: 24px;
        }
    }
`;

@customElement('zt-setup-page')
export class ZtSetupPage extends LitElement {
    @state() private currentStep = 1;
    @state() private username = '';
    @state() private password = '';
    @state() private confirmPassword = '';
    @state() private controllerUrl = 'http://localhost:9993';
    @state() private authToken = '';
    @state() private errors: Record<string, string> = {};
    @state() private loading = false;
    @state() private testPassed = false;
    @state() private testModalOpen = false;
    @state() private testRunning = false;
    @state() private testSteps: TestStep[] = [];
    @state() private testSummary = '';
    @state() private testSuccess = false;
    @state() private ztConfigured = false;
    @state() private csrfToken = '';

    static styles = [theme, lightTheme, resetStyles, sharedStyles, setupStyles];

    connectedCallback(): void {
        super.connectedCallback();
        fetch('/api/csrf-token', { credentials: 'include' })
            .then(r => r.json())
            .then((data: { token: string }) => { this.csrfToken = data.token; })
            .catch(() => {});
        fetch('/api/setup/status')
            .then(r => r.json())
            .then((data: { needsSetup: boolean; ztConfigured: boolean }) => {
                if (!data.needsSetup) {
                    window.location.href = '/login';
                    return;
                }
                if (data.ztConfigured) {
                    this.ztConfigured = true;
                }
            })
            .catch(() => {});
        this.updateComplete.then(() => this._focusCurrentStep());
    }

    render() {
        return html`
            <div class="setup-logo"><zt-logo></zt-logo></div>
            <div class="setup-card card">
                ${this._renderStepper()}
                ${this.currentStep === 1 ? this._renderWelcome() : nothing}
                ${this.currentStep === 2 ? this._renderAdmin() : nothing}
                ${this.currentStep === 3 ? this._renderConnection() : nothing}
            </div>
            <div class="version-text">v2.0</div>
            ${this._renderTestModal()}
        `;
    }

    private _renderStepper() {
        const steps = [
            { label: 'Welcome', num: 1 },
            { label: 'Admin', num: 2 },
        ];
        if (!this.ztConfigured) {
            steps.push({ label: 'Connect', num: 3 });
        }

        return html`
            <div class="stepper">
                ${steps.map((step, i) => html`
                    ${i > 0 ? html`
                        <div class="stepper-line ${step.num <= this.currentStep ? 'completed' : 'upcoming'}"></div>
                    ` : nothing}
                    <div class="stepper-step">
                        <div class="stepper-dot ${
                            step.num < this.currentStep ? 'completed' :
                            step.num === this.currentStep ? 'active' : 'upcoming'
                        }">
                            ${step.num < this.currentStep ? '✓' : ''}
                        </div>
                        <span class="stepper-label ${
                            step.num < this.currentStep ? 'completed' :
                            step.num === this.currentStep ? 'active' : ''
                        }">${step.label}</span>
                    </div>
                `)}
            </div>
        `;
    }

    private _renderWelcome() {
        return html`
            <h1 class="step-title">Welcome to ZTCWM</h1>
            <p class="step-subtitle">Let's set up your ZeroTier controller. You'll create an admin account and connect to your ZeroTier node.</p>
            <button class="btn btn-primary btn-full" @click=${() => { this.currentStep = 2; this.updateComplete.then(() => this._focusCurrentStep()); }}>
                Get Started
            </button>
        `;
    }

    private _renderAdmin() {
        return html`
            <h1 class="step-title">Create Admin Account</h1>
            <p class="step-subtitle">This will be the first administrator account.</p>
            <div @keydown=${this._handleKeydown}>
                <div class="form-group">
                    <label class="label" for="username">Username</label>
                    <input
                        class="input ${this.errors.username ? 'error' : ''}"
                        id="username"
                        type="text"
                        placeholder="Enter a username"
                        .value=${this.username}
                        @input=${(e: Event) => { this.username = (e.target as HTMLInputElement).value; }}
                        @blur=${() => this._validateField('username')}
                        ?disabled=${this.loading}
                    />
                    <div class="field-error ${this.errors.username ? 'visible' : ''}">${this.errors.username || ''}</div>
                </div>
                <div class="form-group">
                    <label class="label" for="password">Password</label>
                    <input
                        class="input ${this.errors.password ? 'error' : ''}"
                        id="password"
                        type="password"
                        placeholder="Enter a password"
                        .value=${this.password}
                        @input=${(e: Event) => { this.password = (e.target as HTMLInputElement).value; }}
                        @blur=${() => this._validateField('password')}
                        ?disabled=${this.loading}
                    />
                    ${this.password ? this._renderStrength() : nothing}
                    <div class="field-error ${this.errors.password ? 'visible' : ''}">${this.errors.password || ''}</div>
                </div>
                <div class="form-group">
                    <label class="label" for="confirmPassword">Confirm Password</label>
                    <input
                        class="input ${this.errors.confirmPassword ? 'error' : ''}"
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        .value=${this.confirmPassword}
                        @input=${(e: Event) => { this.confirmPassword = (e.target as HTMLInputElement).value; }}
                        @blur=${() => this._validateField('confirmPassword')}
                        ?disabled=${this.loading}
                    />
                    <div class="field-error ${this.errors.confirmPassword ? 'visible' : ''}">${this.errors.confirmPassword || ''}</div>
                </div>
            </div>
            <div class="btn-row">
                <button class="btn btn-secondary" @click=${() => { this.currentStep = 1; }}>← Back</button>
                <button
                    class="btn btn-primary"
                    ?disabled=${!this._isStep2Valid() || this.loading}
                    @click=${() => this._handleStep2Continue()}
                >
                    ${this.loading ? html`<span class="spinner"></span>` : 'Continue →'}
                </button>
            </div>
        `;
    }

    private _renderStrength() {
        const strength = this._getPasswordStrength();
        if (strength.count === 0) return nothing;
        return html`
            <div class="strength-row">
                <div class="strength-bar">
                    <div class="strength-fill" style="width: ${strength.width}; background-color: ${strength.color};"></div>
                </div>
                <span class="strength-label" style="color: ${strength.color};">${strength.level}</span>
            </div>
        `;
    }

    private _renderConnection() {
        return html`
            <h1 class="step-title">ZeroTier Connection</h1>
            <p class="step-subtitle">Connect to your ZeroTier controller node.</p>
            <div @keydown=${this._handleKeydown}>
                <div class="form-group">
                    <label class="label" for="controller-url">Controller URL</label>
                    <input
                        class="input ${this.errors.controllerUrl ? 'error' : ''}"
                        id="controller-url"
                        type="text"
                        placeholder="http://localhost:9993"
                        .value=${this.controllerUrl}
                        @input=${(e: Event) => { this.controllerUrl = (e.target as HTMLInputElement).value; }}
                        @blur=${() => this._validateField('controllerUrl')}
                        ?disabled=${this.loading}
                    />
                    <div class="field-error ${this.errors.controllerUrl ? 'visible' : ''}">${this.errors.controllerUrl || ''}</div>
                </div>
                <div class="form-group">
                    <label class="label" for="auth-token">Auth Token</label>
                    <input
                        class="input input-mono ${this.errors.authToken ? 'error' : ''}"
                        id="auth-token"
                        type="password"
                        placeholder="Paste your ZeroTier auth token"
                        .value=${this.authToken}
                        @input=${(e: Event) => { this.authToken = (e.target as HTMLInputElement).value; }}
                        @blur=${() => this._validateField('authToken')}
                        ?disabled=${this.loading}
                    />
                    <div class="field-error ${this.errors.authToken ? 'visible' : ''}">${this.errors.authToken || ''}</div>
                </div>
                <button
                    class="btn btn-secondary btn-full"
                    ?disabled=${!this.controllerUrl || !this.authToken || this.testRunning}
                    @click=${() => this._handleTestConnection()}
                    style="margin-bottom: var(--space-sm);"
                >
                    ${this.testRunning ? html`<span class="spinner spinner-on-light"></span>` : 'Test Connection'}
                </button>
            </div>
            <div class="btn-row">
                <button class="btn btn-secondary" @click=${() => { this.currentStep = 2; }}>← Back</button>
                <button
                    class="btn btn-primary"
                    ?disabled=${!this.testPassed || this.loading}
                    @click=${() => this._submitSetup()}
                >
                    ${this.loading ? html`<span class="spinner"></span>` : 'Finish Setup'}
                </button>
            </div>
        `;
    }

    private _renderTestModal() {
        return html`
            <zt-modal .open=${this.testModalOpen} heading="Connection Test">
                <div>
                    ${this.testSteps.map(step => html`
                        <div class="test-step">
                            <span class="test-icon ${step.status}">
                                ${step.status === 'pass' ? '✓' : step.status === 'fail' ? '✕' : ''}
                            </span>
                            <span>${step.label}</span>
                        </div>
                    `)}
                    ${this.testSummary ? html`
                        <div class="test-summary ${this.testSuccess ? 'success' : 'error'}">
                            ${this.testSummary}
                        </div>
                    ` : nothing}
                </div>
                <div slot="footer">
                    <button
                        class="btn btn-secondary"
                        ?disabled=${this.testRunning}
                        @click=${() => { this.testModalOpen = false; }}
                    >Close</button>
                </div>
            </zt-modal>
        `;
    }

    private async _handleTestConnection(): Promise<void> {
        this.testModalOpen = true;
        this.testRunning = true;
        this.testSummary = '';
        this.testSuccess = false;
        this.testSteps = [
            { name: 'connect', label: 'Connecting to controller...', status: 'running' },
            { name: 'authenticate', label: 'Authenticating...', status: 'pending' },
            { name: 'nodeStatus', label: 'Retrieving node status...', status: 'pending' },
        ];

        try {
            const res = await fetch('/api/setup/test-connection', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken,
                },
                body: JSON.stringify({ url: this.controllerUrl, token: this.authToken }),
            });

            const data = await res.json() as { success: boolean; steps: Array<{ name: string; status: 'pass' | 'fail'; error?: string }> };

            for (const responseStep of data.steps) {
                const idx = this.testSteps.findIndex(s => s.name === responseStep.name);
                if (idx === -1) continue;

                const updated = [...this.testSteps];
                updated[idx] = {
                    ...updated[idx],
                    status: responseStep.status,
                    label: responseStep.status === 'pass'
                        ? this._passLabel(responseStep.name)
                        : (responseStep.error || this._failLabel(responseStep.name)),
                };
                // Set next step to running if current passed
                if (responseStep.status === 'pass' && idx + 1 < updated.length) {
                    updated[idx + 1] = { ...updated[idx + 1], status: 'running' };
                }
                this.testSteps = updated;
                await new Promise(r => setTimeout(r, 500));
            }

            if (data.success) {
                this.testSummary = 'All checks passed. Your ZeroTier controller is ready.';
                this.testSuccess = true;
                this.testPassed = true;
            } else {
                const failedStep = data.steps.find(s => s.status === 'fail');
                if (failedStep?.name === 'connect') {
                    this.testSummary = 'Could not reach the controller. Verify the URL and that ZeroTier is running.';
                } else if (failedStep?.name === 'authenticate') {
                    this.testSummary = 'Connection OK but authentication failed. Check the auth token (sudo cat /var/lib/zerotier-one/authtoken.secret).';
                } else {
                    this.testSummary = failedStep?.error || 'Unexpected response from the controller.';
                }
                this.testSuccess = false;
            }
        } catch {
            this.testSteps = [
                { name: 'connect', label: 'Could not reach controller', status: 'fail' },
                ...this.testSteps.slice(1),
            ];
            this.testSummary = 'Could not reach the controller. Verify the URL and that ZeroTier is running.';
            this.testSuccess = false;
        } finally {
            this.testRunning = false;
        }
    }

    private _passLabel(name: string): string {
        switch (name) {
            case 'connect': return 'Connected to controller';
            case 'authenticate': return 'Authentication successful';
            case 'nodeStatus': return 'Node status retrieved';
            default: return 'Passed';
        }
    }

    private _failLabel(name: string): string {
        switch (name) {
            case 'connect': return 'Could not reach controller';
            case 'authenticate': return 'Authentication failed';
            case 'nodeStatus': return 'Invalid node status response';
            default: return 'Failed';
        }
    }

    private async _submitSetup(): Promise<void> {
        this.loading = true;

        try {
            // Step 1: Create admin
            const adminRes = await fetch('/api/setup/admin', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.csrfToken,
                },
                body: JSON.stringify({ username: this.username, password: this.password }),
            });

            if (!adminRes.ok) {
                const err = await adminRes.json() as { error: string };
                toastService.error('Setup failed', err.error || 'Could not create admin account.');
                this.loading = false;
                return;
            }

            // Step 2: Save ZT config (skip if env vars configured)
            if (!this.ztConfigured) {
                const ztRes = await fetch('/api/setup/zt-config', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-Token': this.csrfToken,
                    },
                    body: JSON.stringify({ url: this.controllerUrl, token: this.authToken }),
                });

                if (!ztRes.ok) {
                    toastService.error('Setup failed', 'Could not save ZeroTier configuration.');
                    this.loading = false;
                    return;
                }
            }

            toastService.success('Setup complete!', 'Redirecting to login...');
            setTimeout(() => { window.location.href = '/login'; }, 1500);
        } catch {
            toastService.error('Setup failed', 'Unable to connect to server. Please try again.');
            this.loading = false;
        }
    }

    private _validateField(field: string): void {
        const errs = { ...this.errors };
        switch (field) {
            case 'username':
                if (!this.username) errs.username = 'Username is required';
                else if (this.username.length < 3) errs.username = 'Username must be at least 3 characters';
                else if (!/^[a-zA-Z0-9_]+$/.test(this.username)) errs.username = 'Only letters, numbers, and underscores allowed';
                else delete errs.username;
                break;
            case 'password':
                if (!this.password) errs.password = 'Password is required';
                else if (this._getPasswordStrength().count < 4 || this.password.length < 8)
                    errs.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
                else delete errs.password;
                break;
            case 'confirmPassword':
                if (!this.confirmPassword) errs.confirmPassword = 'Please confirm your password';
                else if (this.confirmPassword !== this.password) errs.confirmPassword = 'Passwords do not match';
                else delete errs.confirmPassword;
                break;
            case 'controllerUrl':
                if (!this.controllerUrl) errs.controllerUrl = 'Controller URL is required';
                else if (!this.controllerUrl.startsWith('http://') && !this.controllerUrl.startsWith('https://'))
                    errs.controllerUrl = 'Enter a valid URL starting with http:// or https://';
                else delete errs.controllerUrl;
                break;
            case 'authToken':
                if (!this.authToken) errs.authToken = 'Auth token is required';
                else delete errs.authToken;
                break;
        }
        this.errors = errs;
    }

    private _isStep2Valid(): boolean {
        return (
            this.username.length >= 3 &&
            /^[a-zA-Z0-9_]+$/.test(this.username) &&
            this._getPasswordStrength().count >= 4 &&
            this.password.length >= 8 &&
            this.confirmPassword === this.password &&
            this.confirmPassword.length > 0
        );
    }

    private _handleStep2Continue(): void {
        this._validateField('username');
        this._validateField('password');
        this._validateField('confirmPassword');
        if (!this._isStep2Valid()) return;

        if (this.ztConfigured) {
            this._submitSetup();
        } else {
            this.currentStep = 3;
            this.updateComplete.then(() => this._focusCurrentStep());
        }
    }

    private _getPasswordStrength(): { level: string; count: number; width: string; color: string } {
        const hasUpper = /[A-Z]/.test(this.password);
        const hasLower = /[a-z]/.test(this.password);
        const hasNumber = /\d/.test(this.password);
        const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;':",.\/<>?]/.test(this.password);
        const count = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

        if (count === 0) return { level: '', count: 0, width: '0%', color: '' };
        if (count <= 2) return { level: 'Weak', count, width: '33%', color: 'var(--color-error)' };
        if (count === 3) return { level: 'Fair', count, width: '66%', color: 'var(--color-warning)' };
        return { level: 'Strong', count, width: '100%', color: 'var(--color-success)' };
    }

    private _focusCurrentStep(): void {
        if (this.currentStep === 1) {
            this.shadowRoot?.querySelector<HTMLElement>('.btn-primary')?.focus();
        } else if (this.currentStep === 2) {
            this.shadowRoot?.getElementById('username')?.focus();
        } else if (this.currentStep === 3) {
            this.shadowRoot?.getElementById('controller-url')?.focus();
        }
    }

    private _handleKeydown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            if (this.currentStep === 2 && this._isStep2Valid()) {
                this._handleStep2Continue();
            } else if (this.currentStep === 3 && this.testPassed && !this.loading) {
                this._submitSetup();
            }
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'zt-setup-page': ZtSetupPage;
    }
}
