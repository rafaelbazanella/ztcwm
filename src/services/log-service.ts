import type { LogEntry } from '../types/index.js';
import { generateId } from '../utils/helpers.js';

type LogListener = (entries: LogEntry[]) => void;

class LogService {
    private entries: LogEntry[] = [];
    private listeners: Set<LogListener> = new Set();
    private maxEntries = 500;

    log(level: LogEntry['level'], message: string, details?: string): void {
        const entry: LogEntry = {
            id: generateId(),
            timestamp: Date.now(),
            level,
            message,
            details,
        };
        this.entries.unshift(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
        this.notify();
    }

    info(message: string, details?: string): void {
        this.log('info', message, details);
    }

    warn(message: string, details?: string): void {
        this.log('warn', message, details);
    }

    error(message: string, details?: string): void {
        this.log('error', message, details);
    }

    debug(message: string, details?: string): void {
        this.log('debug', message, details);
    }

    getEntries(): LogEntry[] {
        return [...this.entries];
    }

    clear(): void {
        this.entries = [];
        this.notify();
    }

    subscribe(listener: LogListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        const snapshot = this.getEntries();
        this.listeners.forEach((fn) => fn(snapshot));
    }
}

export const logService = new LogService();
