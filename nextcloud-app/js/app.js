// Minimales Frontend ohne Framework, damit du siehst, wie die API angesprochen wird.
// Später kannst du das z.B. durch Vue.js ersetzen (Standard in Nextcloud-Apps).

document.addEventListener('DOMContentLoaded', () => {
    const listEl = document.getElementById('bookmark-list');

    // OC.generateUrl baut die korrekte, nextcloud-interne API-URL
    const apiUrl = OC.generateUrl('/apps/nextbookmark/api/bookmarks');

    fetch(apiUrl, {
        headers: { 'requesttoken': OC.requestToken }
    })
        .then(response => response.json())
        .then(bookmarks => {
            listEl.innerHTML = '';
            bookmarks.forEach(b => {
                const li = document.createElement('li');
                li.textContent = `${b.title || b.url} (${b.url})`;
                listEl.appendChild(li);
            });
        })
        .catch(err => console.error('Fehler beim Laden der Lesezeichen:', err));
});
