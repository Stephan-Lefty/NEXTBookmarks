// Zeigt je nach gewählter Verbindungsart eine kurze Erklärung an. Die
// Option "Nextcloud-App (App Store)" ist im Dropdown ausgegraut/deaktiviert
// (siehe options.html), solange die App noch nicht im offiziellen Nextcloud
// App Store freigegeben ist - der rote Hinweistext dazu ist deshalb
// dauerhaft sichtbar, nicht nur bei ausgewählter Verbindungsart.
function updateSyncModeHint() {
    const syncMode = document.getElementById('syncMode').value;
    document.getElementById('syncModeHint').textContent = chrome.i18n.getMessage(
        syncMode === 'webdav' ? 'optionsSyncModeWebdavHint' : 'optionsSyncModeRestHint'
    );
}
document.getElementById('syncMode').addEventListener('change', updateSyncModeHint);

// Befüllt das "Ordnername überspringen"-Dropdown mit den tatsächlich
// vorhandenen obersten Ordnernamen dieses Browsers (direkt unter einem
// Wurzelordner, z.B. "Schnellwahl" bei Vivaldi) - Auswahl statt Freitext,
// damit kein Tippfehler zu einem stillschweigend wirkungslosen Eintrag
// führen kann. Übersprungen wird ohnehin nur auf dieser obersten Ebene
// (siehe getLocalBookmarksFlat() in background.js), das Dropdown zeigt
// deshalb auch nur genau diese Kandidaten an.
async function populateSkipFolderOptions(selectedValue) {
    const select = document.getElementById('skipFolderName');
    const tree = await browser.bookmarks.getTree();
    const topLevelNames = new Set();
    for (const root of tree[0].children) {
        for (const child of root.children || []) {
            if (!child.url && child.title) topLevelNames.add(child.title);
        }
    }
    // Falls der gespeicherte Wert aktuell gar nicht (mehr) existiert (z.B.
    // Ordner umbenannt/gelöscht), trotzdem als Option anbieten, statt die
    // Einstellung beim Öffnen stillschweigend zu verwerfen.
    if (selectedValue) topLevelNames.add(selectedValue);

    for (const name of topLevelNames) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        select.appendChild(option);
    }
    select.value = selectedValue || '';
}

// Lädt gespeicherte Werte beim Öffnen der Seite
document.addEventListener('DOMContentLoaded', async () => {
    const data = await browser.storage.sync.get(['serverUrl', 'username', 'appPassword', 'syncMode', 'autoSyncMode', 'skipFolderName']);
    document.getElementById('syncMode').value = data.syncMode || 'webdav';
    document.getElementById('serverUrl').value = data.serverUrl || '';
    document.getElementById('username').value = data.username || '';
    document.getElementById('appPassword').value = data.appPassword || '';
    document.getElementById('autoSyncMode').value = data.autoSyncMode || 'onChange';
    await populateSkipFolderOptions(data.skipFolderName || '');
    updateSyncModeHint();
});

// Liefert das Berechtigungsmuster (z.B. "https://cloud.example.com/*") für
// eine eingegebene Server-URL, oder null bei ungültiger URL.
function originPatternFor(serverUrl) {
    try {
        const url = new URL(serverUrl);
        return `${url.protocol}//${url.host}/*`;
    } catch {
        return null;
    }
}

// Speichert die Eingaben, wenn auf "Speichern" geklickt wird
document.getElementById('save').addEventListener('click', async () => {
    const syncMode = document.getElementById('syncMode').value;
    const serverUrl = document.getElementById('serverUrl').value.replace(/\/$/, '');
    const username = document.getElementById('username').value;
    const appPassword = document.getElementById('appPassword').value;
    const autoSyncMode = document.getElementById('autoSyncMode').value;
    const skipFolderName = document.getElementById('skipFolderName').value.trim();
    const statusEl = document.getElementById('status');

    // Statt pauschal beim Installieren Zugriff auf "alle Websites" zu
    // verlangen (schlecht für Store-Review und Privatsphäre), wird die
    // Berechtigung erst hier - gezielt für die eingetragene Nextcloud-
    // Domain - angefragt. Muss als direkte Reaktion auf den Klick
    // passieren, sonst blockiert der Browser den Dialog.
    const originPattern = originPatternFor(serverUrl);
    if (!originPattern) {
        statusEl.textContent = chrome.i18n.getMessage('errorInvalidServerUrl');
        return;
    }
    const granted = await browser.permissions.request({ origins: [originPattern] });
    if (!granted) {
        statusEl.textContent = chrome.i18n.getMessage('errorPermissionDenied');
        return;
    }

    await browser.storage.sync.set({ serverUrl, username, appPassword, syncMode, autoSyncMode, skipFolderName });
    statusEl.textContent = chrome.i18n.getMessage('optionsSavedStatus');

    // Falls noch offen: jetzt, wo Zugangsdaten vorhanden sind, die
    // "vorhandene Lesezeichen importieren?"-Frage anzeigen.
    browser.runtime.sendMessage({ action: 'checkImportPrompt' });
});

document.getElementById('closeSettings').addEventListener('click', () => {
    window.close();
});

document.getElementById('importSkipped').addEventListener('click', async () => {
    const importStatusEl = document.getElementById('importStatus');
    importStatusEl.textContent = chrome.i18n.getMessage('statusImporting');

    // Skip-Liste leeren, damit die zuvor übersprungenen Lesezeichen beim
    // nächsten Sync ganz normal wie neue lokale Lesezeichen behandelt
    // und hochgeladen werden. Pro Server+Konto+Verbindungsart getrennt
    // (siehe profileStorageKey() in background.js/onboarding.js).
    const syncMode = document.getElementById('syncMode').value;
    const serverUrl = document.getElementById('serverUrl').value.replace(/\/$/, '');
    const username = document.getElementById('username').value;
    await browser.storage.local.remove(`skippedUrls::${serverUrl}::${username}::${syncMode}`);
    const result = await browser.runtime.sendMessage({ action: 'sync' });

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

// Löscht den gemerkten Sync-Zustand ALLER Profile (Server+Konto+
// Verbindungsart, siehe profileStorageKey() in background.js). Nötig,
// wenn lokal alle Lesezeichen entfernt wurden: Ein zurückgebliebener
// Sync-Zustand würde die fehlenden Lesezeichen sonst als "gelöscht"
// interpretieren und die Löschung auf den Server übertragen.
async function clearAllSyncState() {
    const all = await browser.storage.local.get(null);
    const keys = Object.keys(all).filter(k => k.startsWith('syncState::') || k.startsWith('firstSyncDone::'));
    if (keys.length) await browser.storage.local.remove(keys);
}

// Sicherheitsabfrage für die Aktionen in der Gefahrenzone.
//
// Bewusst KEIN window.confirm(): Firefox zeigt solche modalen Dialoge in
// Erweiterungs-Fenstern nicht zuverlässig an - der Klick lief dort
// stillschweigend ins Leere, ohne Nachfrage und ohne Wirkung. Diese
// Variante fragt stattdessen direkt in der Seite nach: Der erste Klick
// zeigt die Warnung an und "schärft" den Button, erst der zweite Klick
// führt die Aktion aus. Passiert 10 Sekunden lang nichts, wird der
// Button wieder entschärft, damit er nicht dauerhaft scharf bleibt.
function setupDangerButton(buttonId, statusId, confirmMessageKey, action) {
    const button = document.getElementById(buttonId);
    const statusEl = document.getElementById(statusId);
    const originalLabel = () => chrome.i18n.getMessage(button.dataset.i18n);
    let armed = false;
    let disarmTimer = null;

    function disarm() {
        clearTimeout(disarmTimer);
        armed = false;
        button.textContent = originalLabel();
    }

    button.addEventListener('click', async () => {
        if (!armed) {
            armed = true;
            button.textContent = chrome.i18n.getMessage('optionsDangerConfirmAgainButton');
            statusEl.textContent = chrome.i18n.getMessage(confirmMessageKey);
            disarmTimer = setTimeout(() => {
                disarm();
                statusEl.textContent = '';
            }, 10000);
            return;
        }

        disarm();
        try {
            await action(statusEl);
        } catch (err) {
            // Ohne diese Anzeige würde ein Fehler (z.B. ein vom Browser
            // geschützter Ordner) nur stillschweigend in der Konsole landen.
            statusEl.textContent = chrome.i18n.getMessage('genericError', [err?.message || chrome.i18n.getMessage('errorUnknown')]);
        }
    });
}

// Alle lokalen Lesezeichen löschen - gedacht für den Einsatz direkt nach
// einer Neuinstallation des Browsers, bevor zum ersten Mal synchronisiert
// wird: Ohne das würden die vom Browser mitgelieferten Standard-
// Lesezeichen sonst dauerhaft mit in die Cloud hochgeladen.
setupDangerButton('deleteAllBookmarks', 'deleteAllStatus', 'optionsDeleteAllBookmarksConfirm', async (statusEl) => {
    statusEl.textContent = chrome.i18n.getMessage('optionsDeleteAllBookmarksInProgress');

    // Die Wurzelordner selbst ("Lesezeichenleiste", "Andere Lesezeichen"
    // usw.) lassen sich nicht löschen ("Can't modify the root bookmark
    // folders") - nur ihr Inhalt. Firefox hat zusätzlich unveränderliche
    // Sonderordner (z.B. den Tags-Bereich): Schlägt das Löschen eines
    // einzelnen Eintrags fehl, wird er übersprungen, statt den ganzen
    // Vorgang abzubrechen.
    const tree = await browser.bookmarks.getTree();
    let count = 0;
    let skipped = 0;
    for (const root of tree[0].children) {
        for (const child of root.children || []) {
            try {
                await browser.bookmarks.removeTree(child.id);
                count++;
            } catch (err) {
                console.warn('Lesezeichen-Ordner konnte nicht gelöscht werden:', child.title, err);
                skipped++;
            }
        }
    }

    // WICHTIG: Auch den gemerkten Sync-Zustand zurücksetzen. Sonst würde
    // der nächste Sync die eben gelöschten Lesezeichen für "vom Nutzer
    // gelöscht" halten (sie sind bekannt, aber lokal nicht mehr da) und
    // sie prompt auch auf dem SERVER löschen - also genau das Gegenteil
    // dessen, was dieser Button bezweckt. Mit leerem Sync-Zustand gelten
    // alle Server-Lesezeichen wieder als "neu, nie gesehen" und werden
    // beim nächsten Sync heruntergeladen.
    await clearAllSyncState();

    statusEl.textContent = skipped
        ? chrome.i18n.getMessage('optionsDeleteAllBookmarksDoneWithSkippedStatus', [String(count), String(skipped)])
        : chrome.i18n.getMessage('optionsDeleteAllBookmarksDoneStatus', [String(count)]);
});

// Zwischenmeldung vom Hintergrundprozess: Die Cloud ist geleert, das
// Hochladen läuft noch. Ohne diese Rückmeldung stünde bei vielen
// Lesezeichen minutenlang nur "Setze Cloud-Daten zurück…" da.
browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'resetCloudProgress' && message.stage === 'cleared') {
        document.getElementById('resetCloudStatus').textContent =
            chrome.i18n.getMessage('optionsResetCloudClearedStatus', [String(message.deletedCount)]);
    }
});

// Cloud-Daten komplett zurücksetzen und durch die Lesezeichen dieses
// Browsers ersetzen - gedacht als Reparatur-Werkzeug, falls die Cloud-
// Seite durch frühere Sync-Fehler durcheinandergeraten ist.
setupDangerButton('resetCloud', 'resetCloudStatus', 'optionsResetCloudConfirm', async (statusEl) => {
    statusEl.textContent = chrome.i18n.getMessage('optionsResetCloudInProgress');

    const result = await browser.runtime.sendMessage({ action: 'resetCloud' });

    statusEl.textContent = result?.success
        ? chrome.i18n.getMessage('popupStatusDone', [
            String(result.created), String(result.updated), String(result.deleted),
        ])
        : chrome.i18n.getMessage('genericError', [result?.error || chrome.i18n.getMessage('errorUnknown')]);
});

// Passt die Fenstergröße nach dem Laden automatisch an den tatsächlichen
// Inhalt an, statt sich auf fest verdrahtete Pixelwerte in popup.js zu
// verlassen. Dadurch muss die Größe nicht mehr von Hand nachjustiert
// werden, wenn sich der Inhalt der Einstellungen künftig ändert.
async function fitWindowToContent() {
    // Zwei Frames abwarten, damit i18n.js die Texte gesetzt hat und das
    // Layout sich vollständig stabilisiert hat, bevor gemessen wird.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    // getBoundingClientRect() statt scrollWidth/scrollHeight auf
    // document.documentElement: Bei Letzterem liefert der Browser laut
    // Spezifikation immer mindestens die Viewport-Größe zurück (auch wenn
    // der Inhalt kleiner ist), was hier zu falschen Werten führen kann.
    const contentRect = document.body.getBoundingClientRect();

    // Vivaldi zeigt bei "popup"-Fenstern trotzdem Titel-/Adressleiste an,
    // die zusätzlich zum reinen Seiteninhalt Platz frisst - wie viel genau,
    // lässt sich nicht vorhersehen, aber jetzt live aus der Differenz
    // zwischen Außen- und Innenmaßen des aktuellen Fensters berechnen.
    // Direkt nach dem Öffnen hat der Browser die Fenster-Dekoration
    // (Titel-/Adressleiste) manchmal noch nicht fertig eingerechnet, daher
    // hier auf einen stabilen (zweimal identischen) Messwert warten statt
    // blind der ersten Messung zu vertrauen.
    let chromeWidth = window.outerWidth - window.innerWidth;
    let chromeHeight = window.outerHeight - window.innerHeight;
    for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const newChromeWidth = window.outerWidth - window.innerWidth;
        const newChromeHeight = window.outerHeight - window.innerHeight;
        if (newChromeWidth === chromeWidth && newChromeHeight === chromeHeight) break;
        chromeWidth = newChromeWidth;
        chromeHeight = newChromeHeight;
    }

    // Etwas Puffer (Rundungsfehler, evtl. Scrollbar-Breite) - lieber ein
    // paar Pixel zu groß als dass wieder gescrollt werden muss.
    const BUFFER = 8;

    const win = await browser.windows.getCurrent();
    await browser.windows.update(win.id, {
        width: Math.round(contentRect.width + chromeWidth) + BUFFER,
        height: Math.round(contentRect.height + chromeHeight) + BUFFER,
    });
}

document.addEventListener('DOMContentLoaded', fitWindowToContent);
