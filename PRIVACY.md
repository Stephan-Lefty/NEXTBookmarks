[Deutsch](PRIVACY.md) | [English](PRIVACY.en.md)

# Datenschutzerklärung – NEXTBookmarks

Diese Erklärung gilt für die Browser-Erweiterung "NEXTBookmarks".

## Welche Daten verarbeitet werden

- **Lesezeichen** (Titel, URL, Ordnerstruktur): werden mit der Nextcloud
  synchronisiert, die du selbst in den Einstellungen einträgst.
- **Zugangsdaten** (Nextcloud-Server-URL, Benutzername, App-Passwort): werden
  eingegeben, um die Verbindung zu deiner Nextcloud herzustellen.

## Wo diese Daten gespeichert und hingeschickt werden

- **Lokal im Browser**: Lesezeichen liegen ohnehin lokal (Browser-eigene
  Lesezeichenverwaltung). Die Zugangsdaten werden über die Browser-eigene
  `storage.sync`-API gespeichert – das ist derselbe Mechanismus, über den
  z.B. auch Chrome/Firefox-Einstellungen zwischen deinen eigenen Geräten
  synchronisiert werden, gesteuert von deinem Google-/Firefox-Konto, nicht
  von NEXTBookmarks.
- **Nextcloud-Server**: Lesezeichen und (zur Anmeldung) die Zugangsdaten
  werden ausschließlich an die **von dir selbst eingetragene**
  Nextcloud-Adresse geschickt (per REST-API oder WebDAV, siehe README).
  Es gibt keinen von den Entwicklern betriebenen Zwischenserver.
- **Keine weiteren Dritten**: Es findet keine Übertragung an die Entwickler
  von NEXTBookmarks, an Analyse-/Tracking-Dienste oder sonstige Dritte
  statt. Die Erweiterung enthält keinerlei Analytics, Tracking oder
  Telemetrie.

## Berechtigungen

- **Lesezeichen**: um deine Browser-Lesezeichen lesen und schreiben zu
  können (Kernfunktion der Erweiterung).
- **Speicher**: um Einstellungen und den Sync-Zustand lokal abzulegen.
- **Alarme**: für den periodischen Hintergrund-Sync (alle 15 Minuten).
- **Website-Zugriff (optional, pro Domain)**: wird erst angefragt, wenn du
  in den Einstellungen eine Nextcloud-URL einträgst und speicherst – und
  dann nur für genau diese Domain, nicht für "alle Websites".

## Kontrolle über deine Daten

- Du bestimmst selbst, mit welcher Nextcloud synchronisiert wird.
- Über den Button "Sicherungskopie exportieren" kannst du jederzeit eine
  lokale Kopie all deiner Lesezeichen erstellen.
- Löschst du die Erweiterung, werden die lokal gespeicherten Zugangsdaten
  und der Sync-Zustand mit entfernt; auf deiner Nextcloud gespeicherte
  Lesezeichen bleiben dort unberührt (du verwaltest sie direkt in deiner
  Nextcloud).

## Kontakt

Fragen oder Anliegen zum Datenschutz: bitte als Issue im GitHub-Repository
einreichen –
[github.com/Stephan-Lefty/nextbookmarks/issues](https://github.com/Stephan-Lefty/nextbookmarks/issues).
