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
    const data = await chrome.storage.sync.get(['serverUrl', 'username', 'appPassword', 'syncMode', 'autoSyncMode']);
    document.getElementById('syncMode').value = data.syncMode || 'rest';
    document.getElementById('serverUrl').value = data.serverUrl || '';
    document.getElementById('username').value = data.username || '';
    document.getElementById('appPassword').value = data.appPassword || '';
    document.getElementById('autoSyncMode').value = data.autoSyncMode || 'onChange';
    updateSyncModeHint();
});

// Speichert die Eingaben, wenn auf "Speichern" geklickt wird
document.getElementById('save').addEventListener('click', async () => {
    const syncMode = document.getElementById('syncMode').value;
    const serverUrl = document.getElementById('serverUrl').value.replace(/\/$/, '');
    const username = document.getElementById('username').value;
    const appPassword = document.getElementById('appPassword').value;
    const autoSyncMode = document.getElementById('autoSyncMode').value;

    await chrome.storage.sync.set({ serverUrl, username, appPassword, syncMode, autoSyncMode });
    document.getElementById('status').textContent = chrome.i18n.getMessage('optionsSavedStatus');

    // Falls noch offen: jetzt, wo Zugangsdaten vorhanden sind, die
    // "vorhandene Lesezeichen importieren?"-Frage anzeigen.
    chrome.runtime.sendMessage({ action: 'checkImportPrompt' });
});

document.getElementById('closeSettings').addEventListener('click', () => {
    window.close();
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
    const result = await exportBookmarksBackup();
    document.getElementById('backupStatus').textContent = result.cloudUploaded
        ? chrome.i18n.getMessage('optionsBackupDoneCloudStatus')
        : chrome.i18n.getMessage('optionsBackupDoneLocalOnlyStatus');
});

// Sicherungskopie importieren - Logik ebenfalls in export-backup.js.
document.getElementById('importBackup').addEventListener('click', () => {
    document.getElementById('importBackupFile').click();
});
document.getElementById('importBackupFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const backupStatusEl = document.getElementById('backupStatus');
    backupStatusEl.textContent = chrome.i18n.getMessage('optionsBackupImportingStatus');

    const content = await file.text();
    const imported = await importBookmarksBackup(content);
    backupStatusEl.textContent = chrome.i18n.getMessage('optionsBackupImportDoneStatus', [String(imported)]);
});

// Passt die Fenstergröße nach dem Laden automatisch an den tatsächlichen
// Inhalt an, statt sich auf fest verdrahtete Pixelwerte in popup.js zu
// verlassen. Dadurch muss die Größe nicht mehr von Hand nachjustiert
// werden, wenn sich der Inhalt der Einstellungen künftig ändert.
async function fitWindowToContent() {
    // Zwei Frames abwarten, damit i18n.js die Texte gesetzt hat und das
    // Layout sich vollständig stabilisiert hat, bevor gemessen wird.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const contentWidth = document.documentElement.scrollWidth;
    const contentHeight = document.documentElement.scrollHeight;

    // Vivaldi zeigt bei "popup"-Fenstern trotzdem Titel-/Adressleiste an,
    // die zusätzlich zum reinen Seiteninhalt Platz frisst - wie viel genau,
    // lässt sich nicht vorhersehen, aber jetzt live aus der Differenz
    // zwischen Außen- und Innenmaßen des aktuellen Fensters berechnen.
    const chromeWidth = window.outerWidth - window.innerWidth;
    const chromeHeight = window.outerHeight - window.innerHeight;

    const win = await chrome.windows.getCurrent();
    await chrome.windows.update(win.id, {
        width: Math.round(contentWidth + chromeWidth),
        height: Math.round(contentHeight + chromeHeight),
    });
}

document.addEventListener('DOMContentLoaded', fitWindowToContent);
