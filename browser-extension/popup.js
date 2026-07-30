document.getElementById('syncNow').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.textContent = chrome.i18n.getMessage('popupStatusSyncing');

    // Schickt eine Nachricht an background.js, wo die eigentliche Sync-Logik läuft
    const result = await chrome.runtime.sendMessage({ action: 'sync' });

    statusEl.textContent = result?.success
        ? chrome.i18n.getMessage('popupStatusDone', [
            String(result.created), String(result.updated), String(result.deleted),
        ])
        : chrome.i18n.getMessage('genericError', [result?.error || chrome.i18n.getMessage('errorUnknown')]);
});

// Öffnet die Einstellungen als eigenes kleines Fenster statt als vollen
// Browser-Tab - dadurch sind sie direkt aus dem Popup heraus erreichbar,
// statt nur über den Umweg vivaldi://extensions -> Details.
document.getElementById('openSettings').addEventListener('click', () => {
    chrome.windows.create({
        url: chrome.runtime.getURL('options.html'),
        type: 'popup',
        width: 420,
        height: 520,
    });
});
