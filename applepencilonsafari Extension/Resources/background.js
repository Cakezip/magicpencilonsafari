const SETTINGS_KEY = "magicPencilSettings";
const DEFAULT_SETTINGS = Object.freeze({
    persistence: "volatile",
    enabled: true,
    ttlMs: 30000,
    fadeMs: 1400,
    strokeWidth: 3.2,
    color: "#111111"
});

async function ensureDefaultSettings() {
    const stored = await browser.storage.local.get(SETTINGS_KEY);
    const nextSettings = { ...DEFAULT_SETTINGS, ...(stored?.[SETTINGS_KEY] ?? {}) };
    await browser.storage.local.set({ [SETTINGS_KEY]: nextSettings });
}

browser.runtime.onInstalled.addListener(() => {
    void ensureDefaultSettings();
});

void ensureDefaultSettings();
