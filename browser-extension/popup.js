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

// Sicherungskopie exportieren - Logik in export-backup.js, auch von den
// Einstellungen aus genutzt.
document.getElementById('exportBackup').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    const result = await exportBookmarksBackup();
    statusEl.textContent = result.cloudUploaded
        ? chrome.i18n.getMessage('optionsBackupDoneCloudStatus')
        : chrome.i18n.getMessage('optionsBackupDoneLocalOnlyStatus');
});

// Sicherungskopie importieren - öffnet die Dateiauswahl, legt die
// gefundenen Lesezeichen in einem eigenen neuen Ordner an.
document.getElementById('importBackup').addEventListener('click', () => {
    document.getElementById('importBackupFile').click();
});
document.getElementById('importBackupFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = ''; // dieselbe Datei später erneut auswählbar machen
    if (!file) return;

    const statusEl = document.getElementById('status');
    statusEl.textContent = chrome.i18n.getMessage('optionsBackupImportingStatus');

    const content = await file.text();
    const imported = await importBookmarksBackup(content);
    statusEl.textContent = chrome.i18n.getMessage('optionsBackupImportDoneStatus', [String(imported)]);
});
