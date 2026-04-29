import type { AppConfig } from '../types/index.js';

const THEME_KEY = 'zt-theme';

const DEFAULT_CONFIG: AppConfig = {
    theme: 'dark',
};

let configCache: AppConfig | null = null;

export function getConfig(): AppConfig {
    if (!configCache) {
        // One-time cleanup of legacy encrypted config
        localStorage.removeItem('ztcwm-config');

        const stored = localStorage.getItem(THEME_KEY);
        configCache = {
            theme: (stored === 'light' || stored === 'dark' || stored === 'system')
                ? stored
                : DEFAULT_CONFIG.theme,
        };
    }
    return configCache;
}

export function saveConfig(config: Partial<AppConfig>): void {
    configCache = { ...getConfig(), ...config };
    if (configCache.theme === 'system') {
        localStorage.removeItem(THEME_KEY);
    } else {
        localStorage.setItem(THEME_KEY, configCache.theme);
    }
}

export function clearConfig(): void {
    localStorage.removeItem(THEME_KEY);
    configCache = null;
}
