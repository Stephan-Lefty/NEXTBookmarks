// Zeigt je nach gewählter Verbindungsart eine kurze Erklärung an.
function updateSyncModeHint() {
    const syncMode = document.getElementById('syncMode').value;
    document.getElementById('syncModeHint').textContent = chrome.i18n.getMessage(
        syncMode === 'webdav' ? 'optionsSyncModeWebdavHint' : 'optionsSyncModeRestHint'
    );
}
document.getElementById('syncMode').addEventListener('change', updateSyncModeHint);

// Lädt gespeicherte Werte beim Öffnen der Seite
document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.sync.get(['serverUrl', 'username', 'appPassword', 'syncMode']);
    document.getElementById('syncMode').value = data.syncMode || 'rest';
    document.getElementById('serverUrl').value = data.serverUrl || '';
    document.getElementById('username').value = data.username || '';
    document.getElementById('appPassword').value = data.appPassword || '';
    updateSyncModeHint();
});

// Speichert die Eingaben, wenn auf "Speichern" geklickt wird
document.getElementById('save').addEventListener('click', async () => {
    const syncMode = document.getElementById('syncMode').value;
    const serverUrl = document.getElementById('serverUrl').value.replace(/\/$/, '');
    const username = document.getElementById('username').value;
    const appPassword = document.getElementById('appPassword').value;

    await chrome.storage.sync.set({ serverUrl, username, appPassword, syncMode });
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
    // und hochgeladen werden. Pro Server+Konto getrennt (siehe
    // background.js/onboarding.js).
    const serverUrl = document.getElementById('serverUrl').value.replace(/\/$/, '');
    const username = document.getElementById('username').value;
    await chrome.storage.local.remove(`skippedUrls::${serverUrl}::${username}`);
    const result = await chrome.runtime.sendMessage({ action: 'sync' });

    importStatusEl.textContent = result?.success
        ? chrome.i18n.getMessage('importDoneStatus', [String(result.created)])
        : chrome.i18n.getMessage('genericError', [result?.error || chrome.i18n.getMessage('errorUnknown')]);
});

// Sicherungskopie exportieren - die eigentliche Logik steckt in der
// gemeinsam genutzten Datei export-backup.js (auch vom Popup verwendet).
document.getElementById('exportBackup').addEventListener('click', async () => {
    await exportBookmarksBackup();
    document.getElementById('backupStatus').textContent = chrome.i18n.getMessage('optionsBackupDoneStatus');
});
