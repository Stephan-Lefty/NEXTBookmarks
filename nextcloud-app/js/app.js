// Minimales Frontend ohne Framework, damit du siehst, wie die API angesprochen wird.
// Später kannst du das z.B. durch Vue.js ersetzen (Standard in Nextcloud-Apps).

document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('bookmark-list');

    // Die API ist in appinfo/routes.php im 'ocs'-Block registriert, nicht im
    // 'routes'-Block - dafür braucht es OC.linkToOCS statt OC.generateUrl
    // (das nur URLs aus dem 'routes'-Block erzeugt und hier ins Leere,
    // sprich einen 404, laufen würde).
    const apiUrl = OC.linkToOCS('apps/nextbookmark/api', 2) + 'bookmarks';

    fetch(apiUrl, {
        headers: { 'requesttoken': OC.requestToken }
    })
        .then(response => response.json())
        .then(bookmarks => {
            const byFolder = new Map();
            bookmarks.forEach(b => {
                const folder = b.folder || '(ohne Ordner)';
                if (!byFolder.has(folder)) byFolder.set(folder, []);
                byFolder.get(folder).push(b);
            });

            // Die API liefert die Lesezeichen bereits nach 'position' sortiert
            // (siehe BookmarkMapper::findAllForUser) - die Reihenfolge, in der
            // Ordner hier zum ersten Mal auftauchen, entspricht daher der
            // tatsächlichen Reihenfolge im Browser. Map behält die
            // Einfüge-Reihenfolge bei, daher hier bewusst keine eigene
            // (z.B. alphabetische) Sortierung mehr - außer für "Papierkorb"-
            // Ordner, die auf Wunsch immer ans Ende sollen.
            const isTrash = (folder) => folder.split('/').pop() === 'Papierkorb';
            const orderedFolders = [...byFolder.keys()];
            const normalFolders = orderedFolders.filter(f => !isTrash(f));
            const trashFolders = orderedFolders.filter(isTrash);

            listEl.innerHTML = '';
            [...normalFolders, ...trashFolders].forEach(folder => {
                const folderBookmarks = byFolder.get(folder);

                const folderLi = document.createElement('li');
                folderLi.className = 'folder-item';

                const folderHeader = document.createElement('button');
                folderHeader.type = 'button';
                folderHeader.className = 'folder-header';
                folderHeader.textContent = `${folder} (${folderBookmarks.length})`;
                folderLi.appendChild(folderHeader);

                const bookmarkList = document.createElement('ul');
                bookmarkList.className = 'folder-bookmarks';
                bookmarkList.hidden = true;
                folderBookmarks.forEach(b => {
                    const li = document.createElement('li');

                    const strong = document.createElement('strong');
                    strong.textContent = b.title || b.url;
                    li.appendChild(strong);
                    li.appendChild(document.createTextNode(' ('));

                    const link = document.createElement('a');
                    link.href = b.url;
                    link.textContent = b.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    li.appendChild(link);

                    li.appendChild(document.createTextNode(')'));
                    bookmarkList.appendChild(li);
                });
                folderLi.appendChild(bookmarkList);

                folderHeader.addEventListener('click', () => {
                    bookmarkList.hidden = !bookmarkList.hidden;
                });

                listEl.appendChild(folderLi);
            });
        })
        .catch(err => console.error('Fehler beim Laden der Lesezeichen:', err));
});
