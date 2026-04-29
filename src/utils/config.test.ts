import { getConfig, saveConfig, clearConfig } from './config.js';

describe('config (theme-only)', () => {
    beforeEach(() => {
        localStorage.clear();
        // Reset module cache by clearing internal state
        clearConfig();
    });

    it('returns default theme dark when localStorage is empty', () => {
        const config = getConfig();
        expect(config.theme).toBe('dark');
    });

    it('reads theme from zt-theme localStorage key', () => {
        localStorage.setItem('zt-theme', 'light');
        const config = getConfig();
        expect(config.theme).toBe('light');
    });

    it('accepts system as valid theme value', () => {
        localStorage.setItem('zt-theme', 'system');
        const config = getConfig();
        expect(config.theme).toBe('system');
    });

    it('falls back to dark for invalid theme value', () => {
        localStorage.setItem('zt-theme', 'invalid-value');
        const config = getConfig();
        expect(config.theme).toBe('dark');
    });

    it('saveConfig persists theme to localStorage', () => {
        saveConfig({ theme: 'light' });
        expect(localStorage.getItem('zt-theme')).toBe('light');
        expect(getConfig().theme).toBe('light');
    });

    it('saveConfig removes zt-theme key when theme is system', () => {
        localStorage.setItem('zt-theme', 'dark');
        saveConfig({ theme: 'system' });
        expect(localStorage.getItem('zt-theme')).toBeNull();
        expect(getConfig().theme).toBe('system');
    });

    it('clearConfig removes key and resets cache', () => {
        saveConfig({ theme: 'light' });
        clearConfig();
        expect(localStorage.getItem('zt-theme')).toBeNull();
        // After clearing, next getConfig should return default
        const config = getConfig();
        expect(config.theme).toBe('dark');
    });

    it('removes legacy ztcwm-config key on first getConfig call', () => {
        localStorage.setItem('ztcwm-config', 'encrypted-legacy-data');
        getConfig();
        expect(localStorage.getItem('ztcwm-config')).toBeNull();
    });
});
