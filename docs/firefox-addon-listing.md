# Firefox Add-ons (AMO) – Listing-Texte

Zum Kopieren beim Einreichen im [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).
Anders als beim Chrome Web Store ist die Registrierung bei Mozilla
kostenlos (Mozilla-Konto genügt).

## Deutsch

**Zusammenfassung** (kurz, erscheint in der Ergebnisliste):

```
Synchronisiert deine Browser-Lesezeichen mit deiner eigenen Nextcloud – ohne Zwischenserver, per App oder WebDAV.
```

**Ausführliche Beschreibung**: identisch zur Chrome-Web-Store-Version, siehe
[chrome-web-store-listing.md](chrome-web-store-listing.md) (Abschnitt
"Deutsch" → "Ausführliche Beschreibung") – einfach von dort übernehmen.

## Englisch

**Summary**:

```
Sync your browser bookmarks with your own Nextcloud – no middleman server, via app or WebDAV.
```

**Detailed description**: identical to the Chrome Web Store version, see
[chrome-web-store-listing.md](chrome-web-store-listing.md) (English section
→ "Detailed description") – reuse from there.

## Weitere Angaben im Formular

- **Kategorie**: Productivity (Produktivität)
- **Lizenz**: MIT, siehe [`LICENSE`](../LICENSE) im Repository
- **Datenschutzerklärung**: Text aus [`PRIVACY.md`](../PRIVACY.md) bzw.
  [`PRIVACY.en.md`](../PRIVACY.en.md) einfügen, oder als Link:
  `https://github.com/Stephan-Lefty/nextbookmarks/blob/main/PRIVACY.md`
- **Icon**: `browser-extension/icons/icon128.png` (bereits vorhanden)
- **Screenshot**: derselbe wie beim Chrome Web Store lässt sich
  wiederverwenden: [`chrome-web-store/screenshot-de.png`](chrome-web-store/screenshot-de.png)
- **Sichtbarkeit**: "Listed" (öffentlich im Store auffindbar) - wie
  gewünscht
- **Berechtigungen**: AMO fragt beim Hochladen ggf. ebenfalls nach kurzen
  Begründungen je Berechtigung - dieselben Texte wie in
  [chrome-web-store-listing.md](chrome-web-store-listing.md) unter
  "Berechtigungsbegründungen" verwenden.

## Quellcode-Einreichung

Firefox verlangt bei manchen Reviews zusätzlich den **unveränderten
Quellcode** zum Abgleich mit dem hochgeladenen Paket (v.a. wenn ein
Build-Schritt/Minifizierung erkannt wird). Da diese Erweiterung ohne
Build-Prozess auskommt (reines, unverändertes JS/HTML/CSS), sollte das
hier normalerweise nicht nötig sein - falls AMO trotzdem danach fragt,
reicht ein ZIP desselben `browser-extension`-Ordners.
