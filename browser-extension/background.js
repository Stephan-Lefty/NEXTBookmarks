// Chrome/Edge laden den Hintergrund als echten Service Worker (MV3
// "service_worker") - dort ist importScripts() der einzige Weg, den Shim
// nachzuladen. Firefox nutzt für denselben Manifest-Eintrag stattdessen
// die MV3-Variante "background.scripts" (kein Service Worker, sondern
// eine klassische Hintergrundseite ohne importScripts) - dort wurde
// browser-polyfill-shim.js bereits vorher als eigener Eintrag im
// scripts-Array geladen, siehe manifest.json.
if (typeof importScripts === 'function') {
    importScripts('browser-polyfill-shim.js');
}

// =====================================================================
// NEXTBookmarks – Sync-Engine
// =====================================================================
// Diese Datei gleicht die lokalen Browser-Lesezeichen zweiseitig mit
// der Nextcloud-App ab. Um das nachvollziehbar zu halten, arbeitet sie
// mit einem einfachen Prinzip:
//
//   Wir merken uns nach jedem Sync den "letzten bekannten Stand" pro
//   Lesezeichen (URL, Titel, Ordner, Position, Zeitstempel) in `syncState`
//   (gespeichert in browser.storage.local), indiziert über die stabile
//   lokale Browser-ID des Lesezeichens (NICHT die URL - dieselbe URL
//   kann mehrfach vorkommen, z.B. dasselbe Lesezeichen in zwei
//   verschiedenen Ordnern, oder zwei Einträge mit identischer Adresse
//   im selben Ordner. Über die URL zu indizieren würde solche Duplikate
//   stillschweigend zu einem einzigen Eintrag zusammenfallen lassen).
//   Beim nächsten Sync vergleichen wir: aktueller lokaler Stand vs.
//   syncState vs. aktueller Stand auf dem Server. Daraus ergibt sich,
//   was sich geändert hat und wer "gewinnt", falls beide Seiten etwas
//   geändert haben (Konflikt).
//
// EINSCHRÄNKUNG (bewusst, für Anfänger transparent gemacht):
// Browser bieten keine zuverlässige, einheitliche "zuletzt geändert"-
// Zeit für einzelne Lesezeichen. Unsere Konfliktlösung ist daher ein
// einfaches, aber nachvollziehbares "Last-Write-Wins": Wenn beide
// Seiten sich seit dem letzten Sync geändert haben, gewinnt die Seite
// mit dem neueren Zeitstempel (auf Serverseite eindeutig, lokal wird
// der Sync-Zeitpunkt als Näherung verwendet). Für die meisten
// Alltagsfälle (man ändert selten dasselbe Lesezeichen gleichzeitig auf
// zwei Geräten) reicht das.
// =====================================================================

const SYNC_ALARM_NAME = 'nextbookmarks-auto-sync';
const SYNC_INTERVAL_MINUTES = 15;

// ---- Einstellungen & HTTP-Hilfsfunktionen -----------------------------

async function getSettings() {
    const { serverUrl, username, appPassword, syncMode } = await browser.storage.sync.get([
        'serverUrl', 'username', 'appPassword', 'syncMode'
    ]);
    if (!serverUrl || !username || !appPassword) {
        throw new Error(chrome.i18n.getMessage('errorMissingCredentials'));
    }
    return { serverUrl, username, appPassword, syncMode: syncMode || 'rest' };
}

function authHeader(username, appPassword) {
    return 'Basic ' + btoa(`${username}:${appPassword}`);
}

async function apiRequest(settings, path, options = {}) {
    const { serverUrl, username, appPassword } = settings;
    const response = await fetch(`${serverUrl}/ocs/v2.php/apps/nextbookmarks/api${path}`, {
        ...options,
        // Cookies bewusst nicht mitschicken: Ist derselbe Browser noch
        // parallel per Web-Login bei dieser Nextcloud eingeloggt (z.B. weil
        // man in den Dateien nachgeschaut hat), erkennt Nextcloud das
        // Sitzungs-Cookie und verlangt dann CSRF-Schutz - das App-Passwort
        // im Authorization-Header würde dabei ignoriert. "omit" erzwingt,
        // dass ausschließlich das App-Passwort zählt.
        credentials: 'omit',
        headers: {
            'Authorization': authHeader(username, appPassword),
            'OCS-APIRequest': 'true',
            'Accept': 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
        },
    });
    if (!response.ok) throw new Error(chrome.i18n.getMessage('errorServerResponse', [String(response.status), path]));
    if (response.status === 204) return null;
    return response.json();
}

// ---- Backend "Nextcloud-App": REST-API der eigenen Server-App ---------

const restBackend = {
    fetchRemoteBookmarks: (settings) => apiRequest(settings, '/bookmarks'),
    createRemoteBookmark: (settings, data) =>
        apiRequest(settings, '/bookmarks', { method: 'POST', body: JSON.stringify(data) }),
    updateRemoteBookmark: (settings, id, data) =>
        apiRequest(settings, `/bookmarks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteRemoteBookmark: (settings, id) =>
        apiRequest(settings, `/bookmarks/${id}`, { method: 'DELETE' }),
    // Jede REST-Anfrage speichert sofort - hier gibt es nichts nachzuholen.
    async commit() {},
};

// ---- Backend "WebDAV-Ordner": kein Server-App nötig --------------------
//
// Funktioniert auf jeder Nextcloud, auch bei eingeschränkten Hosting-
// Paketen ohne eigene Apps (z.B. Hetzner Storage Share), weil WebDAV zur
// Grundausstattung jeder Nextcloud gehört. Alle Lesezeichen liegen dabei
// als eine einzige JSON-Datei im Ordner "NEXTBookmarks" im Dateien-
// Bereich des Nutzers. Ein Sync lädt die Datei einmal komplett, sammelt
// alle Änderungen im Speicher und schreibt am Ende einmal die
// aktualisierte Datei zurück. Der zuletzt gelesene "Last-Modified"-
// Zeitstempel wird dabei als "If-Unmodified-Since"-Bedingung mitgeschickt:
// Hat ein anderes Gerät die Datei zwischenzeitlich geändert, schlägt das
// Schreiben ab, statt die fremde Änderung stillschweigend zu überschreiben.
// (Nicht der ETag, denn den darf JavaScript bei einer Cross-Origin-
// Anfrage aus der Extension heraus gar nicht auslesen - "ETag" gehört
// nicht zu den von fetch() standardmäßig freigegebenen Antwort-Headern,
// "Last-Modified" dagegen schon.)

const WEBDAV_FOLDER = 'NEXTBookmarks';
const WEBDAV_FILE = `${WEBDAV_FOLDER}/bookmarks.json`;

function webdavUrl(settings, path) {
    return `${settings.serverUrl}/remote.php/dav/files/${encodeURIComponent(settings.username)}/${path}`;
}

async function webdavRequest(settings, path, options = {}) {
    return fetch(webdavUrl(settings, path), {
        ...options,
        // Siehe Kommentar in apiRequest() - erzwingt Basic-Auth statt
        // eines eventuell vorhandenen Sitzungs-Cookies desselben Browsers.
        credentials: 'omit',
        headers: {
            'Authorization': authHeader(settings.username, settings.appPassword),
            ...options.headers,
        },
    });
}

async function webdavEnsureFolder(settings) {
    const response = await webdavRequest(settings, WEBDAV_FOLDER, { method: 'MKCOL' });
    // 201 = neu angelegt, 405 = existiert schon - beides in Ordnung.
    if (!response.ok && response.status !== 405) {
        throw new Error(chrome.i18n.getMessage('errorServerResponse', [String(response.status), WEBDAV_FOLDER]));
    }
}

// Lädt die Lesezeichen-Datei höchstens einmal pro Sync-Lauf und merkt
// sich das Ergebnis direkt am settings-Objekt, damit create/update/delete
// danach mit demselben Stand weiterarbeiten.
async function webdavLoad(settings) {
    if (settings._webdav) return settings._webdav;

    await webdavEnsureFolder(settings);
    const response = await webdavRequest(settings, WEBDAV_FILE);

    if (response.status === 404) {
        settings._webdav = { items: [], lastModified: null, dirty: false };
    } else if (response.ok) {
        settings._webdav = {
            items: await response.json(),
            lastModified: response.headers.get('Last-Modified'),
            dirty: false,
        };
    } else {
        throw new Error(chrome.i18n.getMessage('errorServerResponse', [String(response.status), WEBDAV_FILE]));
    }
    return settings._webdav;
}

async function webdavFetchRemoteBookmarks(settings) {
    return (await webdavLoad(settings)).items;
}

async function webdavCreateRemoteBookmark(settings, data) {
    const state = await webdavLoad(settings);
    const item = {
        id: crypto.randomUUID(),
        url: data.url, title: data.title, folder: data.folder, position: data.position,
        updatedAt: Math.floor(Date.now() / 1000),
    };
    state.items.push(item);
    state.dirty = true;
    return item;
}

async function webdavUpdateRemoteBookmark(settings, id, data) {
    const state = await webdavLoad(settings);
    const item = state.items.find(i => String(i.id) === String(id));
    if (!item) throw new Error(chrome.i18n.getMessage('errorServerResponse', ['404', WEBDAV_FILE]));
    Object.assign(item, data, { updatedAt: Math.floor(Date.now() / 1000) });
    state.dirty = true;
    return item;
}

async function webdavDeleteRemoteBookmark(settings, id) {
    const state = await webdavLoad(settings);
    state.items = state.items.filter(i => String(i.id) !== String(id));
    state.dirty = true;
}

async function webdavCommit(settings) {
    const state = settings._webdav;
    if (!state || !state.dirty) return; // nichts geändert -> nichts zu schreiben

    const headers = { 'Content-Type': 'application/json' };
    // Schreibschutz gegen gleichzeitige Änderungen von einem anderen
    // Gerät: Existiert die Datei schon, darf sie seit dem letzten Lesen
    // nicht verändert worden sein; existiert sie noch nicht, darf sie das
    // auch beim Schreiben immer noch nicht.
    if (state.lastModified) headers['If-Unmodified-Since'] = state.lastModified;
    else headers['If-None-Match'] = '*';

    const response = await webdavRequest(settings, WEBDAV_FILE, {
        method: 'PUT',
        headers,
        body: JSON.stringify(state.items),
    });

    if (!response.ok) {
        if (response.status === 412) {
            throw new Error(chrome.i18n.getMessage('errorWebdavConflict'));
        }
        throw new Error(chrome.i18n.getMessage('errorServerResponse', [String(response.status), WEBDAV_FILE]));
    }
}

const webdavBackend = {
    fetchRemoteBookmarks: webdavFetchRemoteBookmarks,
    createRemoteBookmark: webdavCreateRemoteBookmark,
    updateRemoteBookmark: webdavUpdateRemoteBookmark,
    deleteRemoteBookmark: webdavDeleteRemoteBookmark,
    commit: webdavCommit,
};

function getBackend(settings) {
    return settings.syncMode === 'webdav' ? webdavBackend : restBackend;
}

// ---- Lokale Lesezeichen lesen & schreiben (inkl. Ordner-Pfad) --------

// Baut aus dem Lesezeichen-Baum eine flache Liste, inkl. Ordner-Pfad
// (z.B. "Lesezeichenleiste/Arbeit") und der internen Browser-ID.
// "position" ist ein fortlaufender Zähler in der Reihenfolge, in der der
// Baum durchlaufen wird - das entspricht der tatsächlichen Anzeige-
// Reihenfolge im Browser (Ordner für Ordner, von oben nach unten).
async function getLocalBookmarksFlat() {
    const tree = await browser.bookmarks.getTree();
    const flat = [];
    let position = 0;

    function walk(nodes, pathParts) {
        for (const node of nodes) {
            if (node.url) {
                flat.push({
                    localId: node.id,
                    url: node.url,
                    title: node.title || node.url,
                    folder: pathParts.join('/'),
                    position: position++,
                });
            } else if (node.children) {
                const nextPath = node.title ? [...pathParts, node.title] : pathParts;
                walk(node.children, nextPath);
            }
        }
    }
    walk(tree, []);
    return flat;
}

// Findet (oder erstellt) die Ordner-ID für einen Pfad wie
// "Lesezeichenleiste/Arbeit/Projekte", ausgehend von der Wurzel.
const folderIdCache = new Map();

async function ensureLocalFolder(path) {
    if (!path) {
        return '2'; // Chrome: "Andere Lesezeichen"; Firefox legt es an anderer Stelle ab
    }
    if (folderIdCache.has(path)) return folderIdCache.get(path);

    const parts = path.split('/').filter(Boolean);
    let parentId = null;
    let currentPath = '';

    const tree = await browser.bookmarks.getTree();
    let currentNodes = tree[0].children;

    for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        let match = currentNodes.find(n => !n.url && n.title === part);

        if (!match) {
            // '1' = Lesezeichenleiste. Kein Fallback auf die Wurzel ('0')
            // verwenden - Chrome/Chromium verbieten das Anlegen von
            // Einträgen direkt unter der Wurzel ("Can't modify the root
            // bookmark folders.").
            match = await browser.bookmarks.create({
                parentId: parentId || '1',
                title: part,
            });
        }
        parentId = match.id;
        currentNodes = match.children || (await browser.bookmarks.getSubTree(match.id))[0].children || [];
    }

    folderIdCache.set(path, parentId);
    return parentId;
}

async function createLocalBookmark({ url, title, folder }) {
    const parentId = await ensureLocalFolder(folder);
    return browser.bookmarks.create({ parentId, title, url });
}

// ---- Sync-Status (letzter bekannter Stand pro lokaler Browser-ID) -----

// Der Sync-Zustand wird pro Server+Konto getrennt gespeichert (nicht
// unter einem einzigen festen Schlüssel). Sonst würde ein Wechsel der
// Nextcloud-URL/des Benutzernamens (z.B. von einer Test- auf die
// produktive Instanz) den alten Zustand einer komplett anderen Cloud
// weiterverwenden - und Schritt 1 von syncBookmarks() würde jedes lokal
// bekannte Lesezeichen als "auf dem (neuen) Server gelöscht" ansehen und
// es prompt auch lokal löschen. Mit einem eigenen Schlüssel pro Profil
// startet ein Wechsel zu einem neuen/anderen Server dagegen mit einem
// leeren, unbelasteten Zustand.
function profileStorageKey(settings, baseName) {
    return `${baseName}::${settings.serverUrl}::${settings.username}`;
}

async function loadSyncState(settings) {
    const key = profileStorageKey(settings, 'syncState');
    const data = await browser.storage.local.get([key]);
    return data[key] || {};
}

async function saveSyncState(settings, state) {
    const key = profileStorageKey(settings, 'syncState');
    await browser.storage.local.set({ [key]: state });
}

// Merkt sich pro Server+Konto, ob schon einmal erfolgreich synchronisiert
// wurde. Solange das nicht der Fall ist, laufen automatische Syncs
// (Timer, Änderungs-Trigger, "beim Schließen") nicht von selbst los - die
// allererste Synchronisation zu einer (neuen) Verbindung muss der Nutzer
// bewusst manuell anstoßen (Button im Popup oder "Ja" beim Onboarding).
async function hasCompletedFirstSync(settings) {
    const key = profileStorageKey(settings, 'firstSyncDone');
    const data = await browser.storage.local.get([key]);
    return !!data[key];
}

async function markFirstSyncDone(settings) {
    const key = profileStorageKey(settings, 'firstSyncDone');
    await browser.storage.local.set({ [key]: true });
}

// Prüft, ob ein automatischer Sync gerade erlaubt ist: Zugangsdaten
// müssen vorhanden sein, die Verbindung muss schon einmal manuell
// bestätigt worden sein, und der gewählte Auto-Sync-Modus muss zum
// Auslöser passen (requiredMode: 'onChange' oder 'onClose').
async function isAutoSyncAllowed(requiredMode) {
    const { serverUrl, username, appPassword, syncMode, autoSyncMode } = await browser.storage.sync.get([
        'serverUrl', 'username', 'appPassword', 'syncMode', 'autoSyncMode'
    ]);
    if (!serverUrl || !username || !appPassword) return false;
    if ((autoSyncMode || 'onChange') !== requiredMode) return false;
    return hasCompletedFirstSync({ serverUrl, username, appPassword, syncMode: syncMode || 'rest' });
}

// ---- Der eigentliche Zwei-Wege-Abgleich --------------------------------

// Verhindert, dass zwei Syncs gleichzeitig laufen: Das Herunterladen
// neuer Lesezeichen ruft browser.bookmarks.create() auf, was die
// onCreated-Ereignisse auslöst, auf die scheduleQuickSync() wiederum
// reagiert - ein Sync würde sich damit sonst selbst 5 Sekunden später
// nochmal anstoßen, während der erste eventuell noch läuft. Zwei
// gleichzeitig laufende Syncs würden sich beim WebDAV-Backend zudem
// gegenseitig die Konflikterkennung (Last-Modified) auslösen lassen.
let syncInProgress = false;

async function syncBookmarks() {
    if (syncInProgress) {
        return { success: true, created: 0, updated: 0, deleted: 0, conflicts: 0 };
    }
    syncInProgress = true;
    try {
        return await runSync();
    } finally {
        syncInProgress = false;
    }
}

async function runSync() {
    const settings = await getSettings();
    const backend = getBackend(settings);
    const skippedUrlsKey = profileStorageKey(settings, 'skippedUrls');
    const [remoteList, localListRaw, syncState, skippedData] = await Promise.all([
        backend.fetchRemoteBookmarks(settings),
        getLocalBookmarksFlat(),
        loadSyncState(settings),
        browser.storage.local.get([skippedUrlsKey]),
    ]);

    // Lesezeichen, die beim ersten Start bewusst NICHT importiert wurden,
    // werden komplett aus dem Abgleich herausgefiltert (weder hoch- noch
    // heruntergeladen, weder gelöscht noch aktualisiert).
    const skipSet = new Set(skippedData[skippedUrlsKey] || []);
    const localList = localListRaw.filter(b => !skipSet.has(b.url));

    const remoteById = new Map(remoteList.map(b => [String(b.id), b]));
    const newSyncState = {};
    // Merkt sich, welche Remote-IDs bereits einem lokalen Lesezeichen
    // zugeordnet wurden, damit Schritt 2 sie nicht nochmal anfasst.
    const handledRemoteIds = new Set();

    // Sicherheitsbremse: Ein fehlerhafter/veralteter Sync-Zustand (genau
    // das ist uns schon zweimal passiert, z.B. beim Wechsel auf einen
    // anderen Server) kann dazu führen, dass praktisch jedes lokal
    // bekannte Lesezeichen fälschlich als "auf dem Server gelöscht"
    // erscheint - der Sync würde dann massenhaft ECHTE Browser-
    // Lesezeichen löschen, die sich (anders als serverseitige Daten)
    // nicht ohne Weiteres wiederherstellen lassen. Bevor irgendetwas
    // gelöscht wird: einmal durchzählen, wie viele lokale Löschungen
    // anstehen würden, und bei einem verdächtig hohen Anteil den
    // kompletten Sync lieber mit einem Fehler abbrechen statt zu löschen.
    const localIdSet = new Set(localList.map(b => b.localId));
    const knownCount = Object.keys(syncState).length;
    const pendingLocalDeletes = Object.keys(syncState).filter(localId =>
        localIdSet.has(localId) && !remoteById.has(String(syncState[localId].remoteId))
    ).length;
    const MASS_DELETE_MIN = 5;
    const MASS_DELETE_RATIO = 0.5;
    if (knownCount >= MASS_DELETE_MIN && pendingLocalDeletes > knownCount * MASS_DELETE_RATIO) {
        throw new Error(chrome.i18n.getMessage('errorMassDeleteGuard', [String(pendingLocalDeletes), String(knownCount)]));
    }

    let created = 0, updated = 0, deleted = 0, conflicts = 0;

    // 1) Alle lokalen Lesezeichen anhand ihrer stabilen Browser-ID abgleichen.
    for (const local of localList) {
        let known = syncState[local.localId];
        let remote = known ? remoteById.get(String(known.remoteId)) : undefined;

        if (known && !remote) {
            // War bekannt, remote aber verschwunden -> auch lokal löschen
            await browser.bookmarks.remove(local.localId);
            deleted++;
            continue;
        }

        if (!known) {
            // Kein bekannter Verweis unter der Browser-ID. Das ist entweder
            // wirklich neu, oder ein Lesezeichen aus der Zeit, als der Sync
            // noch über die URL statt über die Browser-ID verknüpft hat
            // (siehe Kommentar oben). Erst prüfen, ob es dafür schon ein
            // noch nicht verknüpftes Remote-Lesezeichen mit exakt gleicher
            // URL+Ordner gibt und dieses übernehmen - sonst würde bei
            // jedem Nutzer mit altem Sync-Stand nach diesem Update alles
            // dupliziert.
            remote = remoteList.find(r =>
                r.url === local.url && r.folder === local.folder && !handledRemoteIds.has(String(r.id))
            );

            if (!remote) {
                const saved = await backend.createRemoteBookmark(settings, {
                    url: local.url, title: local.title, folder: local.folder, position: local.position,
                });
                newSyncState[local.localId] = {
                    remoteId: saved.id, url: local.url, title: local.title,
                    folder: local.folder, position: local.position, updatedAt: saved.updatedAt,
                };
                handledRemoteIds.add(String(saved.id));
                created++;
                continue;
            }
        }
        handledRemoteIds.add(String(remote.id));

        const localChanged = !known || local.url !== known.url || local.title !== known.title
            || local.folder !== known.folder || local.position !== known.position;
        const remoteChanged = known ? remote.updatedAt !== known.updatedAt : false;

        if (localChanged && remoteChanged) {
            conflicts++;
            if (remote.updatedAt > known.updatedAt) {
                await browser.bookmarks.update(local.localId, { title: remote.title, url: remote.url });
                newSyncState[local.localId] = {
                    remoteId: remote.id, url: remote.url, title: remote.title,
                    folder: remote.folder, position: remote.position, updatedAt: remote.updatedAt,
                };
            } else {
                const saved = await backend.updateRemoteBookmark(settings, remote.id, {
                    url: local.url, title: local.title, folder: local.folder, position: local.position,
                });
                newSyncState[local.localId] = {
                    remoteId: remote.id, url: local.url, title: local.title,
                    folder: local.folder, position: local.position, updatedAt: saved.updatedAt,
                };
            }
            updated++;
        } else if (localChanged) {
            const saved = await backend.updateRemoteBookmark(settings, remote.id, {
                url: local.url, title: local.title, folder: local.folder, position: local.position,
            });
            newSyncState[local.localId] = {
                remoteId: remote.id, url: local.url, title: local.title,
                folder: local.folder, position: local.position, updatedAt: saved.updatedAt,
            };
            updated++;
        } else if (remoteChanged) {
            await browser.bookmarks.update(local.localId, { title: remote.title, url: remote.url });
            newSyncState[local.localId] = {
                remoteId: remote.id, url: remote.url, title: remote.title,
                folder: remote.folder, position: remote.position, updatedAt: remote.updatedAt,
            };
            updated++;
        } else {
            newSyncState[local.localId] = known;
        }
    }

    // 2) Übrige Remote-Lesezeichen: entweder komplett neu (lokal anlegen)
    // oder ihr lokales Gegenstück wurde inzwischen gelöscht (remote auch
    // löschen).
    for (const remote of remoteList) {
        const remoteIdStr = String(remote.id);
        if (handledRemoteIds.has(remoteIdStr)) continue;

        const wasKnown = Object.values(syncState).some(s => String(s.remoteId) === remoteIdStr);
        if (wasKnown) {
            await backend.deleteRemoteBookmark(settings, remote.id);
            deleted++;
            continue;
        }

        const createdLocal = await createLocalBookmark({ url: remote.url, title: remote.title, folder: remote.folder });
        newSyncState[createdLocal.id] = {
            remoteId: remote.id, url: remote.url, title: remote.title,
            folder: remote.folder, position: remote.position, updatedAt: remote.updatedAt,
        };
        created++;
    }

    await backend.commit(settings);
    await saveSyncState(settings, newSyncState);
    await markFirstSyncDone(settings);
    return { success: true, created, updated, deleted, conflicts };
}

// ---- Auslöser: manueller Klick, Alarm (Timer) und Lesezeichen-Events --

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'sync') {
        syncBookmarks().then(sendResponse).catch(err => sendResponse({ success: false, error: err.message }));
        return true; // zeigt an: Antwort kommt asynchron
    }
    if (message.action === 'checkImportPrompt') {
        maybeShowOnboarding().then(() => sendResponse({ done: true }));
        return true;
    }
});

// ---- Onboarding: einmalige Frage "vorhandene Lesezeichen importieren?" --

// Direkt nach der Installation wissen wir noch nicht, ob schon
// Zugangsdaten hinterlegt sind (die trägt man erst in den Einstellungen
// ein). Wir merken uns daher nur "Frage steht noch aus" und prüfen dann
// zweimal, ob wir sie stellen können: beim nächsten Browserstart und
// direkt nachdem in den Einstellungen gespeichert wurde.
browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        await browser.storage.local.set({ importDecisionPending: true });
    }
});

browser.runtime.onStartup.addListener(() => {
    maybeShowOnboarding();
});

async function maybeShowOnboarding() {
    const { importDecisionPending } = await browser.storage.local.get(['importDecisionPending']);
    if (!importDecisionPending) return;

    // Ohne gespeicherte Zugangsdaten kann man noch nichts importieren -
    // dann einfach abwarten, bis die Einstellungen gespeichert wurden.
    const { serverUrl, username, appPassword } = await browser.storage.sync.get([
        'serverUrl', 'username', 'appPassword'
    ]);
    if (!serverUrl || !username || !appPassword) return;

    browser.tabs.create({ url: browser.runtime.getURL('onboarding.html') });
}

// Der periodische Timer läuft unabhängig vom gewählten Auto-Sync-Modus
// als grundsätzliches Sicherheitsnetz - aber genau wie die anderen
// automatischen Auslöser erst, nachdem einmal manuell synchronisiert
// wurde (siehe hasCompletedFirstSync).
browser.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
browser.alarms.onAlarm.addListener(async alarm => {
    if (alarm.name !== SYNC_ALARM_NAME) return;
    try {
        const settings = await getSettings();
        if (!(await hasCompletedFirstSync(settings))) return;
    } catch {
        return; // keine Zugangsdaten hinterlegt
    }
    syncBookmarks().catch(err => console.error('Automatischer Sync fehlgeschlagen:', err));
});

// Zusätzlich, je nach Einstellung ("Automatischer Sync" in den
// Einstellungen): kurz nach lokalen Änderungen synchronisieren (entprellt,
// damit nicht bei jeder einzelnen Änderung sofort ein Sync losläuft) ...
let debounceTimer = null;
function scheduleQuickSync() {
    // Läuft gerade schon ein Sync, kommt diese Änderung höchstwahrscheinlich
    // von ihm selbst (heruntergeladene Lesezeichen werden lokal angelegt,
    // was wiederum dieses Ereignis auslöst) - nicht nochmal einen Folge-
    // Sync einplanen. Eine tatsächliche, unabhängige Nutzeränderung
    // während eines laufenden Syncs wird spätestens beim nächsten
    // automatischen oder manuellen Sync erfasst.
    if (syncInProgress) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        if (!(await isAutoSyncAllowed('onChange'))) return;
        syncBookmarks().catch(err => console.error('Sync nach Änderung fehlgeschlagen:', err));
    }, 5000);
}
browser.bookmarks.onCreated.addListener(scheduleQuickSync);
browser.bookmarks.onRemoved.addListener(scheduleQuickSync);
browser.bookmarks.onChanged.addListener(scheduleQuickSync);
browser.bookmarks.onMoved.addListener(scheduleQuickSync);

// ... oder alternativ beim Schließen des Browsers (letztes Fenster
// geschlossen). EINSCHRÄNKUNG: Es gibt in Browser-Erweiterungen kein
// zuverlässiges "Browser wird jetzt beendet"-Ereignis - windows.onRemoved
// feuert zwar beim Schließen des letzten Fensters, aber der Netzwerk-
// Request läuft dann im Wettlauf gegen das tatsächliche Beenden des
// Browserprozesses und kann abgeschnitten werden, bevor er fertig ist.
// Bewusst als "so gut wie möglich", nicht als Garantie zu verstehen.
browser.windows.onRemoved.addListener(async () => {
    const remainingWindows = await browser.windows.getAll();
    if (remainingWindows.length > 0) return; // noch andere Fenster offen

    if (!(await isAutoSyncAllowed('onClose'))) return;
    syncBookmarks().catch(err => console.error('Sync beim Schließen fehlgeschlagen:', err));
});
