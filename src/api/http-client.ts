import type { ApiError } from '../types/index.js';

let csrfToken = '';

async function fetchCsrfToken(): Promise<string> {
    const res = await fetch('/api/csrf-token', { credentials: 'include' });
    if (res.ok) {
        const data = await res.json() as { token: string };
        csrfToken = data.token;
    }
    return csrfToken;
}

async function ensureCsrfToken(): Promise<string> {
    if (!csrfToken) {
        await fetchCsrfToken();
    }
    return csrfToken;
}

export class HttpClient {
    private baseUrl = '/api/zt';

    private async handleResponse<T>(response: Response): Promise<T> {
        if (!response.ok) {
            const error: ApiError = {
                status: response.status,
                message: response.statusText || `HTTP ${response.status}`,
            };
            try {
                const body = await response.json();
                error.body = body;
                if (body && typeof body === 'object') {
                    if (typeof (body as { message?: unknown }).message === 'string') {
                        error.message = (body as { message: string }).message;
                    } else if (typeof (body as { error?: unknown }).error === 'string') {
                        error.message = (body as { error: string }).error;
                    }
                }
            } catch {
                // no JSON body
            }
            throw error;
        }
        return response.json() as Promise<T>;
    }

    async get<T>(path: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
        });
        return this.handleResponse<T>(response);
    }

    async post<T>(path: string, body?: unknown): Promise<T> {
        const token = await ensureCsrfToken();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token,
            },
            credentials: 'include',
            body: body ? JSON.stringify(body) : undefined,
        });
        return this.handleResponse<T>(response);
    }

    async delete<T>(path: string): Promise<T> {
        const token = await ensureCsrfToken();
        const response = await fetch(`${this.baseUrl}${path}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': token,
            },
            credentials: 'include',
        });
        return this.handleResponse<T>(response);
    }
}

export const httpClient = new HttpClient();
