importScripts('browser-polyfill-shim.js');

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
    const { serverUrl, username, appPassword } = await browser.storage.sync.get([
        'serverUrl', 'username', 'appPassword'
    ]);
    if (!serverUrl || !username || !appPassword) {
        throw new Error('Bitte zuerst die Nextcloud-Zugangsdaten in den Einstellungen eintragen.');
    }
    return { serverUrl, username, appPassword };
}

function authHeader(username, appPassword) {
    return 'Basic ' + btoa(`${username}:${appPassword}`);
}

async function apiRequest(settings, path, options = {}) {
    const { serverUrl, username, appPassword } = settings;
    const response = await fetch(`${serverUrl}/ocs/v2.php/apps/nextbookmarks/api${path}`, {
        ...options,
        headers: {
            'Authorization': authHeader(username, appPassword),
            'OCS-APIRequest': 'true',
            'Accept': 'application/json',
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
        },
    });
    if (!response.ok) throw new Error(`Server antwortete mit ${response.status} bei ${path}`);
    if (response.status === 204) return null;
    return response.json();
}

const fetchRemoteBookmarks = (settings) => apiRequest(settings, '/bookmarks');
const createRemoteBookmark = (settings, data) =>
    apiRequest(settings, '/bookmarks', { method: 'POST', body: JSON.stringify(data) });
const updateRemoteBookmark = (settings, id, data) =>
    apiRequest(settings, `/bookmarks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
const deleteRemoteBookmark = (settings, id) =>
    apiRequest(settings, `/bookmarks/${id}`, { method: 'DELETE' });

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

async function loadSyncState() {
    const { syncState } = await browser.storage.local.get(['syncState']);
    return syncState || {};
}

async function saveSyncState(state) {
    await browser.storage.local.set({ syncState: state });
}

// ---- Der eigentliche Zwei-Wege-Abgleich --------------------------------

async function syncBookmarks() {
    const settings = await getSettings();
    const [remoteList, localListRaw, syncState, { skippedUrls }] = await Promise.all([
        fetchRemoteBookmarks(settings),
        getLocalBookmarksFlat(),
        loadSyncState(),
        browser.storage.local.get(['skippedUrls']),
    ]);

    // Lesezeichen, die beim ersten Start bewusst NICHT importiert wurden,
    // werden komplett aus dem Abgleich herausgefiltert (weder hoch- noch
    // heruntergeladen, weder gelöscht noch aktualisiert).
    const skipSet = new Set(skippedUrls || []);
    const localList = localListRaw.filter(b => !skipSet.has(b.url));

    const remoteById = new Map(remoteList.map(b => [String(b.id), b]));
    const newSyncState = {};
    // Merkt sich, welche Remote-IDs bereits einem lokalen Lesezeichen
    // zugeordnet wurden, damit Schritt 2 sie nicht nochmal anfasst.
    const handledRemoteIds = new Set();

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
                const saved = await createRemoteBookmark(settings, {
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
                const saved = await updateRemoteBookmark(settings, remote.id, {
                    url: local.url, title: local.title, folder: local.folder, position: local.position,
                });
                newSyncState[local.localId] = {
                    remoteId: remote.id, url: local.url, title: local.title,
                    folder: local.folder, position: local.position, updatedAt: saved.updatedAt,
                };
            }
            updated++;
        } else if (localChanged) {
            const saved = await updateRemoteBookmark(settings, remote.id, {
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
            await deleteRemoteBookmark(settings, remote.id);
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

    await saveSyncState(newSyncState);
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

    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
}

browser.alarms.create(SYNC_ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES });
browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === SYNC_ALARM_NAME) {
        syncBookmarks().catch(err => console.error('Automatischer Sync fehlgeschlagen:', err));
    }
});

// Zusätzlich: kurz nach lokalen Änderungen synchronisieren (entprellt,
// damit nicht bei jeder einzelnen Änderung sofort ein Sync losläuft)
let debounceTimer = null;
function scheduleQuickSync() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        syncBookmarks().catch(err => console.error('Sync nach Änderung fehlgeschlagen:', err));
    }, 5000);
}
browser.bookmarks.onCreated.addListener(scheduleQuickSync);
browser.bookmarks.onRemoved.addListener(scheduleQuickSync);
browser.bookmarks.onChanged.addListener(scheduleQuickSync);
browser.bookmarks.onMoved.addListener(scheduleQuickSync);
