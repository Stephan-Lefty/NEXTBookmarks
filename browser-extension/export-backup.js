// Baut aus dem aktuellen, lokalen Lesezeichen-Baum eine Datei im
// Standard-Lesezeichen-Format (Netscape Bookmark File Format), das jeder
// Browser über "Lesezeichen importieren" wieder einlesen kann - eine vom
// Sync komplett unabhängige, lokale Sicherung. Wird sowohl vom Popup als
// auch von den Einstellungen aus verwendet.

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderBookmarkNodes(nodes, indent) {
    const pad = '    '.repeat(indent);
    let out = '';
    for (const node of nodes) {
        const addDate = Math.floor((node.dateAdded || Date.now()) / 1000);
        if (node.url) {
            out += `${pad}<DT><A HREF="${escapeHtml(node.url)}" ADD_DATE="${addDate}">${escapeHtml(node.title || node.url)}</A>\n`;
        } else if (node.children) {
            if (node.title) {
                out += `${pad}<DT><H3 ADD_DATE="${addDate}">${escapeHtml(node.title)}</H3>\n`;
                out += `${pad}<DL><p>\n`;
                out += renderBookmarkNodes(node.children, indent + 1);
                out += `${pad}</DL><p>\n`;
            } else {
                // Wurzel-Knoten ohne eigenen Titel - Kinder direkt einfügen
                out += renderBookmarkNodes(node.children, indent);
            }
        }
    }
    return out;
}

function buildBookmarksHtml(tree) {
    return [
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        '<TITLE>Bookmarks</TITLE>',
        '<H1>Bookmarks</H1>',
        '<DL><p>',
        renderBookmarkNodes(tree, 1).trimEnd(),
        '</DL><p>',
        '',
    ].join('\n');
}

// Lädt die Sicherung zusätzlich per WebDAV in den Ordner
// "NEXTBookmarks/backups/" in der Cloud hoch - unabhängig davon, welche
// Verbindungsart (Nextcloud-App/WebDAV) für den eigentlichen Lesezeichen-
// Sync gewählt ist, da WebDAV-Dateizugriff auf jeder Nextcloud verfügbar
// ist. Wirft einen Fehler, wenn keine Zugangsdaten hinterlegt sind oder
// der Upload fehlschlägt - der Aufrufer entscheidet, wie er das meldet.
async function uploadBackupToCloud(htmlContent) {
    const { serverUrl, username, appPassword } = await browser.storage.sync.get([
        'serverUrl', 'username', 'appPassword'
    ]);
    if (!serverUrl || !username || !appPassword) {
        throw new Error(chrome.i18n.getMessage('errorMissingCredentials'));
    }

    const authHeader = 'Basic ' + btoa(`${username}:${appPassword}`);
    const base = `${serverUrl}/remote.php/dav/files/${encodeURIComponent(username)}/`;

    async function davRequest(path, options = {}) {
        return fetch(base + path, {
            ...options,
            credentials: 'omit',
            headers: { 'Authorization': authHeader, ...options.headers },
        });
    }

    // Ordner sicherstellen - 405 ("existiert schon") ist in Ordnung.
    for (const folder of ['NEXTBookmarks', 'NEXTBookmarks/backups']) {
        const response = await davRequest(folder, { method: 'MKCOL' });
        if (!response.ok && response.status !== 405) {
            throw new Error(chrome.i18n.getMessage('errorServerResponse', [String(response.status), folder]));
        }
    }

    const filename = `nextbookmarks-backup-${new Date().toISOString().slice(0, 10)}.html`;
    const path = `NEXTBookmarks/backups/${encodeURIComponent(filename)}`;
    const response = await davRequest(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/html' },
        body: htmlContent,
    });
    if (!response.ok) {
        throw new Error(chrome.i18n.getMessage('errorServerResponse', [String(response.status), path]));
    }
}

// Lädt die Sicherung lokal herunter UND (falls Zugangsdaten hinterlegt
// sind) zusätzlich in die Cloud hoch. Der lokale Download klappt immer,
// auch wenn der Cloud-Upload fehlschlägt oder noch keine Verbindung
// eingerichtet ist.
async function exportBookmarksBackup() {
    const tree = await browser.bookmarks.getTree();
    const htmlContent = buildBookmarksHtml(tree);

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextbookmarks-backup-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);

    try {
        await uploadBackupToCloud(htmlContent);
        return { cloudUploaded: true };
    } catch (err) {
        console.error('Cloud-Upload der Sicherung fehlgeschlagen:', err);
        return { cloudUploaded: false, cloudError: err.message };
    }
}

// ---- Sicherungskopie importieren ---------------------------------------
// Liest eine Datei im Standard-Lesezeichen-Format (Netscape Bookmark File
// Format, wie von exportBookmarksBackup() erzeugt oder aus jedem anderen
// Browser exportiert) und legt die enthaltenen Lesezeichen an. Landet
// bewusst in einem eigenen, neuen Ordner statt in der bestehenden
// Struktur vermischt zu werden - so bleibt der Import überschaubar und
// nichts geht in bereits vorhandenen Lesezeichen unter.

function parseBookmarksHtml(htmlContent) {
    const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
    const items = [];

    function walk(container, path) {
        for (const child of container.children) {
            if (child.tagName === 'DT') {
                const a = child.querySelector(':scope > a');
                const h3 = child.querySelector(':scope > h3');
                const dl = child.querySelector(':scope > dl');
                if (a) {
                    const url = a.getAttribute('href') || '';
                    if (url) {
                        items.push({ url, title: a.textContent || url, folder: path.join('/') });
                    }
                } else if (dl) {
                    walk(dl, h3 ? [...path, h3.textContent] : path);
                }
            } else if (child.tagName === 'DL') {
                walk(child, path);
            }
        }
    }

    const rootDl = doc.querySelector('dl');
    if (rootDl) walk(rootDl, []);
    return items;
}

async function ensureImportFolder(cache, rootId, path) {
    if (!path) return rootId;
    const cacheKey = rootId + '|' + path;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const parts = path.split('/').filter(Boolean);
    let parentId = rootId;
    let currentPath = '';
    for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const partKey = rootId + '|' + currentPath;
        if (cache.has(partKey)) {
            parentId = cache.get(partKey);
            continue;
        }
        const children = await browser.bookmarks.getChildren(parentId);
        let match = children.find(c => !c.url && c.title === part);
        if (!match) {
            match = await browser.bookmarks.create({ parentId, title: part });
        }
        parentId = match.id;
        cache.set(partKey, parentId);
    }
    return parentId;
}

// Gibt die Anzahl importierter Lesezeichen zurück.
async function importBookmarksBackup(fileContent) {
    const items = parseBookmarksHtml(fileContent);

    const importRoot = await browser.bookmarks.create({
        parentId: '1', // Lesezeichenleiste
        title: `NEXTBookmarks-Import ${new Date().toISOString().slice(0, 10)}`,
    });

    const folderCache = new Map();
    let imported = 0;
    for (const item of items) {
        const parentId = await ensureImportFolder(folderCache, importRoot.id, item.folder);
        await browser.bookmarks.create({ parentId, title: item.title, url: item.url });
        imported++;
    }
    return imported;
}
