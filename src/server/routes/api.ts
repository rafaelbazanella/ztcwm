import type { FastifyPluginAsync } from 'fastify';
import type Database from 'better-sqlite3';

declare module 'fastify' {
    interface FastifyInstance {
        db: Database.Database;
    }
}

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
    // Health check — verifies server is running and database is accessible
    fastify.get('/health', async (_request, _reply) => {
        let dbOk = false;
        try {
            const result = fastify.db
                .prepare('SELECT 1 AS ok')
                .get() as { ok: number } | undefined;
            dbOk = result?.ok === 1;
        } catch {
            dbOk = false;
        }

        return {
            status: dbOk ? 'ok' : 'error',
            timestamp: new Date().toISOString(),
            database: dbOk ? 'connected' : 'disconnected',
        };
    });
};
