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
    const tree = await chrome.bookmarks.getTree();
    return flattenTree(tree).map(n => n.url);
}

document.addEventListener('DOMContentLoaded', async () => {
    const urls = await getLocalBookmarkUrls();
    document.getElementById('count').textContent = urls.length;
});

document.getElementById('importYes').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Importiere...';

    // Löst denselben Sync aus wie der Button im Popup – lädt alle
    // vorhandenen lokalen Lesezeichen zur Nextcloud hoch.
    const result = await chrome.runtime.sendMessage({ action: 'sync' });
    await chrome.storage.local.set({ importDecisionPending: false });

    statusEl.textContent = result?.success
        ? `Fertig! ${result.created} Lesezeichen importiert. Dieses Fenster kannst du jetzt schließen.`
        : `Fehler beim Import: ${result?.error || 'unbekannt'}`;
});

document.getElementById('importNo').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');

    // Die aktuell vorhandenen Lesezeichen merken wir uns als "übersprungen":
    // Der Sync ignoriert diese URLs dauerhaft, bis du sie manuell importierst
    // (siehe Einstellungen). Neue Lesezeichen ab jetzt werden ganz normal
    // synchronisiert.
    const urls = await getLocalBookmarkUrls();
    await chrome.storage.local.set({ skippedUrls: urls, importDecisionPending: false });

    statusEl.textContent = 'Übersprungen – deine vorhandenen Lesezeichen bleiben unangetastet. Dieses Fenster kannst du jetzt schließen.';
});
