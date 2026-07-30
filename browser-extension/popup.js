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
