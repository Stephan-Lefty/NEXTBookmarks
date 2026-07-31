# Chrome Web Store – Listing-Texte

Zum Kopieren in das [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
beim Anlegen des Eintrags. Zeichen-Limits sind vom Dashboard vorgegeben,
hier bereits geprüft.

## Deutsch

**Kurzbeschreibung** (max. 132 Zeichen, aktuell 113):

```
Synchronisiert deine Browser-Lesezeichen mit deiner eigenen Nextcloud – ohne Zwischenserver, per App oder WebDAV.
```

**Ausführliche Beschreibung**:

```
NEXTBookmarks synchronisiert deine Browser-Lesezeichen mit deiner eigenen,
selbst gehosteten Nextcloud – in beide Richtungen, ohne dass deine Daten
über einen Server der Entwickler laufen.

FUNKTIONEN
• Zwei-Wege-Sync: neue, geänderte und gelöschte Lesezeichen werden auf
  beiden Seiten nachvollzogen, inklusive Ordnerstruktur.
• Zwei Verbindungsarten: entweder über die optionale NEXTBookmarks-App auf
  deinem Nextcloud-Server (feingranular, mit Übersichtsseite), oder ganz
  ohne Server-App per WebDAV – funktioniert dann auf jeder Nextcloud, auch
  bei eingeschränkten Hosting-Paketen ohne Admin-Zugriff.
• Automatischer Sync, konfigurierbar: bei lokalen Änderungen im Browser
  oder beim Schließen des Browsers. Die erste Synchronisation läuft immer
  manuell an, damit du vorher prüfen kannst, ob wirklich der richtige
  Account eingetragen ist.
• Sicherungskopie: exportiert alle Lesezeichen als Standard-HTML-Datei
  (Netscape-Bookmark-Format, in jedem Browser importierbar) – lokal und
  zusätzlich automatisch in die Cloud.
• Sicherheitsnetz: bricht den Sync ab, statt versehentlich einen Großteil
  deiner Lesezeichen zu löschen, falls z.B. der falsche Account eingetragen
  wurde.
• Deutsch und Englisch.

KEINE ZWISCHENSERVER, KEIN TRACKING
Deine Lesezeichen und Zugangsdaten gehen ausschließlich an die Nextcloud,
die du selbst einträgst. Es gibt keine Analyse- oder Tracking-Funktionen.
Details siehe Datenschutzerklärung.

QUELLOFFEN
Der komplette Code (Erweiterung und optionale Nextcloud-App) ist auf
GitHub einsehbar: github.com/Stephan-Lefty/nextbookmarks
```

## Englisch

**Short description** (max. 132 characters, currently 93):

```
Sync your browser bookmarks with your own Nextcloud – no middleman server, via app or WebDAV.
```

**Detailed description**:

```
NEXTBookmarks syncs your browser bookmarks with your own, self-hosted
Nextcloud – in both directions, without your data passing through any
server run by the developers.

FEATURES
• Two-way sync: new, changed, and deleted bookmarks are reflected on both
  sides, including folder structure.
• Two connection types: either via the optional NEXTBookmarks app on your
  Nextcloud server (fine-grained, with an overview page), or with no
  server app at all via WebDAV – works on any Nextcloud, even restricted
  hosting plans without admin access.
• Configurable automatic sync: on local changes in the browser, or when
  closing the browser. The very first sync always starts manually, so you
  can check beforehand that the correct account is configured.
• Backup: exports all bookmarks as a standard HTML file (Netscape Bookmark
  format, importable into any browser) – locally and additionally
  uploaded to the cloud automatically.
• Safety net: aborts the sync instead of accidentally deleting most of
  your bookmarks, e.g. if the wrong account was entered.
• German and English.

NO MIDDLEMAN SERVER, NO TRACKING
Your bookmarks and credentials go exclusively to the Nextcloud instance
you configure yourself. There are no analytics or tracking features. See
the privacy policy for details.

OPEN SOURCE
The full code (extension and optional Nextcloud app) is available on
GitHub: github.com/Stephan-Lefty/nextbookmarks
```

## Weitere Store-Metadaten

- **Kategorie**: Produktivität (Productivity)
- **Datenschutzerklärung-URL**: `https://github.com/Stephan-Lefty/nextbookmarks/blob/main/PRIVACY.md`
  (bzw. `PRIVACY.en.md` für die englische Version)
- **Single-Purpose-Beschreibung** (falls im Dashboard verlangt): "Synchronisiert
  Browser-Lesezeichen mit einer vom Nutzer selbst konfigurierten Nextcloud-Instanz."
- **Berechtigungsbegründungen** (Permission justifications im Dashboard):
  - `bookmarks`: Kernfunktion – Lesezeichen lesen/schreiben.
  - `storage`: Einstellungen und Sync-Zustand lokal speichern.
  - `alarms`: periodischer Hintergrund-Sync alle 15 Minuten.
  - `optional_host_permissions` (https://*/*, http://localhost/*): wird
    erst zur Laufzeit für die vom Nutzer eingetragene Nextcloud-Domain
    angefragt, nicht pauschal beim Installieren – siehe Datenschutzerklärung.
- **Icon**: `browser-extension/icons/icon128.png` (bereits vorhanden)
- **Screenshots**: siehe `docs/chrome-web-store/` (1280x800px)
