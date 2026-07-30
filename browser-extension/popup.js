document.getElementById('syncNow').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Synchronisiere...';

    // Schickt eine Nachricht an background.js, wo die eigentliche Sync-Logik läuft
    const result = await chrome.runtime.sendMessage({ action: 'sync' });

    statusEl.textContent = result?.success
        ? `Fertig (${result.created} neu, ${result.updated} aktualisiert, ${result.deleted} gelöscht).`
        : `Fehler: ${result?.error || 'unbekannt'}`;
});
