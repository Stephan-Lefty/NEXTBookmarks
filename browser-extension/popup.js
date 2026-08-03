// Zeigt die aktuell installierte Versionsnummer an (aus manifest.json,
// muss also bei Versions-Updates nicht separat gepflegt werden).
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('version').textContent = 'v' + chrome.runtime.getManifest().version;
});

// Schließt das Popup automatisch nach 10 Sekunden Ruhe (Countdown neben
// dem Status sichtbar), damit man es nicht jedes Mal manuell schließen
// muss. Läuft nur, während gerade nichts passiert - jeder Klick bricht
// den Countdown sofort ab, nach Abschluss einer Aktion startet er neu,
// damit genug Zeit bleibt, das Ergebnis zu lesen.
const AUTO_CLOSE_SECONDS = 10;
let autoCloseTimer = null;

function startAutoCloseCountdown() {
    stopAutoCloseCountdown();
    let remaining = AUTO_CLOSE_SECONDS;
    const countdownEl = document.getElementById('closeCountdown');
    countdownEl.textContent = chrome.i18n.getMessage('popupAutoCloseCountdown', [String(remaining)]);

    autoCloseTimer = setInterval(() => {
        remaining--;
        if (remaining <= 0) {
            stopAutoCloseCountdown();
            window.close();
            return;
        }
        countdownEl.textContent = chrome.i18n.getMessage('popupAutoCloseCountdown', [String(remaining)]);
    }, 1000);
}

function stopAutoCloseCountdown() {
    if (autoCloseTimer) {
        clearInterval(autoCloseTimer);
        autoCloseTimer = null;
    }
    document.getElementById('closeCountdown').textContent = '';
}

document.addEventListener('DOMContentLoaded', startAutoCloseCountdown);

document.getElementById('syncNow').addEventListener('click', async () => {
    stopAutoCloseCountdown();
    const statusEl = document.getElementById('status');
    statusEl.textContent = chrome.i18n.getMessage('popupStatusSyncing');

    // Schickt eine Nachricht an background.js, wo die eigentliche Sync-Logik läuft
    const result = await browser.runtime.sendMessage({ action: 'sync' });

    statusEl.textContent = result?.success
        ? chrome.i18n.getMessage('popupStatusDone', [
            String(result.created), String(result.updated), String(result.deleted),
        ])
        : chrome.i18n.getMessage('genericError', [result?.error || chrome.i18n.getMessage('errorUnknown')]);
    startAutoCloseCountdown();
});

// Öffnet die Einstellungen als eigenes kleines Fenster statt als vollen
// Browser-Tab - dadurch sind sie direkt aus dem Popup heraus erreichbar,
// statt nur über den Umweg vivaldi://extensions -> Details.
document.getElementById('openSettings').addEventListener('click', () => {
    stopAutoCloseCountdown();
    browser.windows.create({
        url: browser.runtime.getURL('options.html'),
        type: 'popup',
        // Nur ein Startwert für den allerersten Frame, bevor das Fenster
        // sichtbar wird - options.js misst danach den tatsächlichen
        // Inhalt und ruft browser.windows.update() mit der exakt
        // passenden Größe auf (fitWindowToContent() dort). Muss also bei
        // künftigen Layout-Änderungen nicht mehr von Hand nachjustiert
        // werden.
        width: 600,
        height: 720,
    });
    startAutoCloseCountdown();
});

// Sicherungskopie exportieren - Logik in export-backup.js, auch von den
// Einstellungen aus genutzt.
document.getElementById('exportBackup').addEventListener('click', async () => {
    stopAutoCloseCountdown();
    const statusEl = document.getElementById('status');
    const result = await exportBookmarksBackup();
    statusEl.textContent = result.cloudUploaded
        ? chrome.i18n.getMessage('optionsBackupDoneCloudStatus')
        : chrome.i18n.getMessage('optionsBackupDoneLocalOnlyStatus');
    startAutoCloseCountdown();
});

// Sicherungskopie importieren - öffnet die Dateiauswahl, legt die
// gefundenen Lesezeichen in einem eigenen neuen Ordner an.
document.getElementById('importBackup').addEventListener('click', () => {
    stopAutoCloseCountdown();
    document.getElementById('importBackupFile').click();
});
document.getElementById('importBackupFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = ''; // dieselbe Datei später erneut auswählbar machen
    if (!file) {
        startAutoCloseCountdown();
        return;
    }

    const statusEl = document.getElementById('status');
    statusEl.textContent = chrome.i18n.getMessage('optionsBackupImportingStatus');

    const content = await file.text();
    const imported = await importBookmarksBackup(content);
    statusEl.textContent = chrome.i18n.getMessage('optionsBackupImportDoneStatus', [String(imported)]);
    startAutoCloseCountdown();
});
