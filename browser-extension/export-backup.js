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

async function exportBookmarksBackup() {
    const tree = await chrome.bookmarks.getTree();
    const htmlContent = buildBookmarksHtml(tree);

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nextbookmarks-backup-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
}
