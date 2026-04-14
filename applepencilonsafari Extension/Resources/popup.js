const SETTINGS_KEY = "magicPencilSettings";
const DEFAULT_SETTINGS = Object.freeze({
    persistence: "volatile",
    enabled: true,
    ttlMs: 30000,
    fadeMs: 1400,
    strokeWidth: 3.2,
    color: "#111111"
});

const elements = {
    clearButton: document.getElementById("clear-button"),
    colorButtons: Array.from(document.querySelectorAll(".color-button")),
    enabledToggle: document.getElementById("enabled-toggle"),
    modeButtons: Array.from(document.querySelectorAll(".mode-button")),
    status: document.getElementById("status-message"),
    ttlPanel: document.getElementById("ttl-panel"),
    ttlButtons: Array.from(document.querySelectorAll(".ttl-button"))
};

let settings = { ...DEFAULT_SETTINGS };

async function loadSettings() {
    const stored = await browser.storage.local.get(SETTINGS_KEY);
    settings = { ...DEFAULT_SETTINGS, ...(stored?.[SETTINGS_KEY] ?? {}) };
    await browser.storage.local.set({ [SETTINGS_KEY]: settings });
    render();
}

function render() {
    elements.enabledToggle.checked = settings.enabled;
    elements.ttlPanel.classList.toggle("is-disabled", settings.persistence === "session");

    for (const button of elements.modeButtons) {
        const isSelected = button.dataset.persistence === settings.persistence;
        button.classList.toggle("is-selected", isSelected);
    }

    for (const button of elements.ttlButtons) {
        const isSelected = Number(button.dataset.ttlMs) === settings.ttlMs;
        button.classList.toggle("is-selected", isSelected);
    }

    for (const button of elements.colorButtons) {
        const isSelected = button.dataset.color === settings.color;
        button.classList.toggle("is-selected", isSelected);
    }
}

async function saveSettings(nextSettings) {
    settings = { ...settings, ...nextSettings };
    await browser.storage.local.set({ [SETTINGS_KEY]: settings });
    render();
}

async function getActiveTabId() {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id ?? null;
}

async function sendToActiveTab(message) {
    const tabId = await getActiveTabId();

    if (!tabId) {
        return { ok: false, reason: "No active Safari tab was found." };
    }

    try {
        const response = await browser.tabs.sendMessage(tabId, message);
        return response ?? { ok: true };
    } catch (error) {
        return { ok: false, reason: "Reload the page once, then try again on a normal website." };
    }
}

function setStatus(message) {
    elements.status.textContent = message;
}

async function initializeStatus() {
    const response = await sendToActiveTab({ type: "magic-pencil:ping" });

    if (!response.ok) {
        setStatus(response.reason);
        return;
    }

    setStatus(settings.enabled
        ? (settings.persistence === "session"
            ? "Session ink stays until reload, navigation, or Safari closes."
            : "Volatile ink is ready on this page.")
        : "Ink is paused.");
}

async function handleToggleChange() {
    await saveSettings({ enabled: elements.enabledToggle.checked });
    setStatus(settings.enabled ? "Ink enabled for open pages." : "Ink disabled and current strokes hidden.");
}

async function handleModeClick(event) {
    const persistence = event.currentTarget.dataset.persistence;
    await saveSettings({ persistence });
    setStatus(persistence === "session"
        ? "Session ink stays until reload, navigation, or Safari closes."
        : `Volatile ink fades after ${Math.round(settings.ttlMs / 1000)} seconds.`);
}

async function handleTtlClick(event) {
    const ttlMs = Number(event.currentTarget.dataset.ttlMs);
    await saveSettings({ ttlMs });
    setStatus(`Ink now fades after ${Math.round(ttlMs / 1000)} seconds.`);
}

async function handleClearClick() {
    const response = await sendToActiveTab({ type: "magic-pencil:clear" });

    if (!response.ok) {
        setStatus(response.reason);
        return;
    }

    setStatus("Cleared the current page.");
}

async function handleColorClick(event) {
    const color = event.currentTarget.dataset.color;
    await saveSettings({ color });
    setStatus(color === "#ffffff" ? "Ink color set to white." : "Ink color set to black.");
}

async function bootstrap() {
    await loadSettings();
    await initializeStatus();

    elements.enabledToggle.addEventListener("change", handleToggleChange);
    elements.clearButton.addEventListener("click", handleClearClick);

    for (const button of elements.modeButtons) {
        button.addEventListener("click", handleModeClick);
    }

    for (const button of elements.ttlButtons) {
        button.addEventListener("click", handleTtlClick);
    }

    for (const button of elements.colorButtons) {
        button.addEventListener("click", handleColorClick);
    }
}

bootstrap();
