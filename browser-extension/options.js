// Lädt gespeicherte Werte beim Öffnen der Seite
document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.sync.get(['serverUrl', 'username', 'appPassword']);
    document.getElementById('serverUrl').value = data.serverUrl || '';
    document.getElementById('username').value = data.username || '';
    document.getElementById('appPassword').value = data.appPassword || '';
});

// Speichert die Eingaben, wenn auf "Speichern" geklickt wird
document.getElementById('save').addEventListener('click', async () => {
    const serverUrl = document.getElementById('serverUrl').value.replace(/\/$/, '');
    const username = document.getElementById('username').value;
    const appPassword = document.getElementById('appPassword').value;

    await chrome.storage.sync.set({ serverUrl, username, appPassword });
    document.getElementById('status').textContent = chrome.i18n.getMessage('optionsSavedStatus');

    // Falls noch offen: jetzt, wo Zugangsdaten vorhanden sind, die
    // "vorhandene Lesezeichen importieren?"-Frage anzeigen.
    chrome.runtime.sendMessage({ action: 'checkImportPrompt' });
});

document.getElementById('importSkipped').addEventListener('click', async () => {
    const importStatusEl = document.getElementById('importStatus');
    importStatusEl.textContent = chrome.i18n.getMessage('statusImporting');

    // Skip-Liste leeren, damit die zuvor übersprungenen Lesezeichen beim
    // nächsten Sync ganz normal wie neue lokale Lesezeichen behandelt
    // und hochgeladen werden.
    await chrome.storage.local.remove('skippedUrls');
    const result = await chrome.runtime.sendMessage({ action: 'sync' });

    importStatusEl.textContent = result?.success
        ? chrome.i18n.getMessage('importDoneStatus', [String(result.created)])
        : chrome.i18n.getMessage('genericError', [result?.error || chrome.i18n.getMessage('errorUnknown')]);
});
