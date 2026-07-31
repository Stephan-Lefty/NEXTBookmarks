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

document.addEventListener('DOMContentLoaded', async () => {
    const urls = await getLocalBookmarkUrls();
    document.getElementById('count').textContent = urls.length;
});

document.getElementById('importYes').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.textContent = chrome.i18n.getMessage('statusImporting');

    // Löst denselben Sync aus wie der Button im Popup – lädt alle
    // vorhandenen lokalen Lesezeichen zur Nextcloud hoch.
    const result = await browser.runtime.sendMessage({ action: 'sync' });
    await browser.storage.local.set({ importDecisionPending: false });

    statusEl.textContent = result?.success
        ? chrome.i18n.getMessage('onboardingImportDoneStatus', [String(result.created)])
        : chrome.i18n.getMessage('onboardingImportErrorStatus', [result?.error || chrome.i18n.getMessage('errorUnknown')]);
});

document.getElementById('importNo').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');

    // Die aktuell vorhandenen Lesezeichen merken wir uns als "übersprungen":
    // Der Sync ignoriert diese URLs dauerhaft, bis du sie manuell importierst
    // (siehe Einstellungen). Neue Lesezeichen ab jetzt werden ganz normal
    // synchronisiert. Pro Server+Konto getrennt gespeichert (siehe
    // background.js), damit ein späterer Wechsel der Nextcloud-Verbindung
    // nicht die Skip-Liste einer ganz anderen Cloud übernimmt.
    const { serverUrl, username } = await browser.storage.sync.get(['serverUrl', 'username']);
    const skippedUrlsKey = `skippedUrls::${serverUrl}::${username}`;
    const urls = await getLocalBookmarkUrls();
    await browser.storage.local.set({ [skippedUrlsKey]: urls, importDecisionPending: false });

    statusEl.textContent = chrome.i18n.getMessage('onboardingSkippedStatus');
});
