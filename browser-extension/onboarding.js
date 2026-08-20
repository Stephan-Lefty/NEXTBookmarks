// Liest alle lokalen Lesezeichen als flache Liste (nur URL wird hier
// gebraucht, die volle Sync-Logik übernimmt background.js).
function flattenTree(nodes) {
    const flat = [];
    function walk(list) {
        for (const node of list) {
            if (node.url) flat.push(node);
            if (node.children) walk(node.children);
        }
    }
    walk(nodes);
    return flat;
}

async function getLocalBookmarkUrls() {
    const tree = await browser.bookmarks.getTree();
    return flattenTree(tree).map(n => n.url);
}

// Löst einen normalen (beidseitigen) Sync aus - unabhängig davon, ob die
// Frage "aus der Cloud importieren" oder "in die Cloud hochladen" mit Ja
// beantwortet wurde, ist das technisch derselbe Vorgang: background.js
// gleicht in einem Durchlauf immer in beide Richtungen ab.
async function runSyncAndShowResult() {
    const statusEl = document.getElementById('status');
    statusEl.textContent = chrome.i18n.getMessage('statusImporting');

    const result = await browser.runtime.sendMessage({ action: 'sync' });
    await browser.storage.local.set({ importDecisionPending: false });

    statusEl.textContent = result?.success
        ? chrome.i18n.getMessage('onboardingImportDoneStatus', [String(result.created)])
        : chrome.i18n.getMessage('onboardingImportErrorStatus', [result?.error || chrome.i18n.getMessage('errorUnknown')]);
}

// Schritt 1: "Aus der Cloud importieren?"
document.getElementById('importFromCloudYes').addEventListener('click', runSyncAndShowResult);

document.getElementById('importFromCloudNo').addEventListener('click', () => {
    document.getElementById('stepImport').hidden = true;
    document.getElementById('stepUpload').hidden = false;
});

// Schritt 2 (nur wenn Schritt 1 mit Nein beantwortet wurde): "In die Cloud hochladen?"
document.getElementById('uploadToCloudYes').addEventListener('click', runSyncAndShowResult);

document.getElementById('uploadToCloudNo').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');

    // Beide Fragen mit Nein beantwortet: Die aktuell vorhandenen lokalen
    // Lesezeichen merken wir uns als "übersprungen" - der Sync ignoriert
    // diese URLs dauerhaft, bis du sie manuell importierst (siehe
    // Einstellungen). Neue Lesezeichen ab jetzt werden ganz normal
    // synchronisiert. Pro Server+Konto+Verbindungsart getrennt gespeichert
    // (siehe profileStorageKey() in background.js), damit ein späterer
    // Wechsel der Nextcloud-Verbindung oder der Verbindungsart nicht die
    // Skip-Liste eines ganz anderen Profils übernimmt.
    const { serverUrl, username, syncMode } = await browser.storage.sync.get(['serverUrl', 'username', 'syncMode']);
    const skippedUrlsKey = `skippedUrls::${serverUrl}::${username}::${syncMode || 'webdav'}`;
    const urls = await getLocalBookmarkUrls();
    await browser.storage.local.set({ [skippedUrlsKey]: urls, importDecisionPending: false });

    statusEl.textContent = chrome.i18n.getMessage('onboardingSkippedStatus');
});
