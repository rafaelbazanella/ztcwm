import type { HttpClient as HttpClientType } from './http-client.js';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

function mockResponse(opts: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    body?: unknown;
    jsonThrows?: boolean;
}): Response {
    return {
        ok: opts.ok ?? true,
        status: opts.status ?? 200,
        statusText: opts.statusText ?? 'OK',
        json: opts.jsonThrows
            ? () => Promise.reject(new Error('no json'))
            : () => Promise.resolve(opts.body ?? {}),
    } as unknown as Response;
}

function urlRouter(routes: Record<string, () => Response>, fallback?: () => Response) {
    return async (url: string | URL | Request) => {
        const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
        for (const [pattern, handler] of Object.entries(routes)) {
            if (urlStr === pattern || urlStr.startsWith(pattern)) return handler();
        }
        return fallback ? fallback() : mockResponse({ ok: true, body: {} });
    };
}

describe('HttpClient', () => {
    let client: HttpClientType;

    beforeEach(async () => {
        vi.resetModules();
        fetchMock.mockReset();
        fetchMock.mockImplementation(urlRouter({
            '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
        }));
        const mod = await import('./http-client.js');
        client = new mod.HttpClient();
    });

    describe('error handling', () => {
        it('throws ApiError with status 401', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
            }, () => mockResponse({ ok: false, status: 401, statusText: 'Unauthorized', body: {} })));
            await expect(client.get('/test')).rejects.toMatchObject({ status: 401 });
        });

        it('throws ApiError with status 404', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
            }, () => mockResponse({ ok: false, status: 404, statusText: 'Not Found', body: {} })));
            await expect(client.get('/test')).rejects.toMatchObject({ status: 404 });
        });

        it('throws ApiError with status 500', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
            }, () => mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error', body: {} })));
            await expect(client.get('/test')).rejects.toMatchObject({ status: 500 });
        });

        it('uses message from JSON body when available', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
            }, () => mockResponse({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                body: { message: 'Custom error message' },
            })));
            await expect(client.get('/test')).rejects.toMatchObject({
                status: 400,
                message: 'Custom error message',
            });
        });

        it('falls back to statusText when no JSON message', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
            }, () => mockResponse({ ok: false, status: 502, statusText: 'Bad Gateway', body: {} })));
            await expect(client.get('/test')).rejects.toMatchObject({
                status: 502,
                message: 'Bad Gateway',
            });
        });

        it('falls back to HTTP status when json() throws', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
            }, () => mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error', jsonThrows: true })));
            await expect(client.get('/test')).rejects.toMatchObject({
                status: 500,
                message: 'Internal Server Error',
            });
        });
    });

    describe('network errors', () => {
        it('propagates TypeError on network failure', async () => {
            fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
            await expect(client.get('/test')).rejects.toThrow(TypeError);
        });
    });

    describe('successful requests', () => {
        it('GET returns parsed JSON', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
                '/api/zt/test': () => mockResponse({ body: { id: '1', name: 'test' } }),
            }));
            const result = await client.get('/test');
            expect(result).toEqual({ id: '1', name: 'test' });
            expect(fetchMock).toHaveBeenCalledWith(
                '/api/zt/test',
                expect.objectContaining({ credentials: 'include' })
            );
        });

        it('POST sends body and returns parsed JSON', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
                '/api/zt/test': () => mockResponse({ body: { created: true } }),
            }));
            const payload = { name: 'new-item' };
            const result = await client.post('/test', payload);
            expect(result).toEqual({ created: true });
            const postCall = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/zt/test');
            expect(postCall).toBeDefined();
            expect(postCall![1]).toEqual(expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(payload),
                credentials: 'include',
            }));
        });

        it('DELETE returns parsed JSON', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
                '/api/zt/test': () => mockResponse({ body: { deleted: true } }),
            }));
            const result = await client.delete('/test');
            expect(result).toEqual({ deleted: true });
            const deleteCall = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/zt/test');
            expect(deleteCall).toBeDefined();
            expect(deleteCall![1]).toEqual(expect.objectContaining({
                method: 'DELETE',
                credentials: 'include',
            }));
        });
    });

    describe('CSRF token', () => {
        it('sends X-CSRF-Token header on POST', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'csrf-123' } }),
                '/api/zt/test': () => mockResponse({ body: { ok: true } }),
            }));
            await client.post('/test', { data: 1 });
            const postCall = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/zt/test');
            expect(postCall).toBeDefined();
            expect(postCall![1].headers).toEqual(
                expect.objectContaining({ 'X-CSRF-Token': 'csrf-123' })
            );
        });

        it('sends X-CSRF-Token header on DELETE', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'csrf-456' } }),
                '/api/zt/test': () => mockResponse({ body: { ok: true } }),
            }));
            await client.delete('/test');
            const deleteCall = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/zt/test');
            expect(deleteCall).toBeDefined();
            expect(deleteCall![1].headers).toEqual(
                expect.objectContaining({ 'X-CSRF-Token': 'csrf-456' })
            );
        });

        it('does not send X-ZT1-Auth header', async () => {
            fetchMock.mockImplementation(urlRouter({
                '/api/csrf-token': () => mockResponse({ ok: true, body: { token: 'test-csrf' } }),
                '/api/zt/test': () => mockResponse({ body: {} }),
            }));
            await client.get('/test');
            const getCall = fetchMock.mock.calls.find((c: any[]) => c[0] === '/api/zt/test');
            expect(getCall).toBeDefined();
            expect(getCall![1].headers).not.toHaveProperty('X-ZT1-Auth');
        });
    });
});
