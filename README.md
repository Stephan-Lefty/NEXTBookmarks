# Nextbookmark – Grundgerüst

Ein Tool, das Browser-Lesezeichen zentral über eine selbst gehostete Nextcloud
synchron hält – unabhängig von Browser und Betriebssystem.

Dieses Projekt ist in Zusammenarbeit mit [Claude](https://claude.com) entstanden.

## Wie die beiden Teile zusammenspielen

```
Chrome/Firefox/Edge  --(REST-API über HTTPS)-->  Nextcloud-App "nextbookmark"
 (browser-extension/)                             (nextcloud-app/, PHP)
                                                          |
                                                     Nextcloud-Datenbank
```

- **nextcloud-app/**: Läuft auf deinem Nextcloud-Server. Speichert alle
  Lesezeichen in einer eigenen Datenbanktabelle und bietet sie über eine
  REST-API an. Zusätzlich zeigt sie eine einfache Web-Oberfläche innerhalb
  von Nextcloud.
- **browser-extension/**: Läuft im Browser des Nutzers, liest die lokalen
  Lesezeichen aus (`chrome.bookmarks`-API, die auch Firefox unterstützt)
  und schickt neue Lesezeichen an die REST-API.

Weil die Extension nur Standard-Web-Technologien (WebExtension-API, fetch)
nutzt, läuft sie unverändert oder mit minimalen Anpassungen in Chrome,
Firefox und Edge. Und weil die App-Logik in Nextcloud liegt, spielt das
Betriebssystem des Servers keine Rolle.

## Ordnerstruktur

```
nextbookmark/
├── nextcloud-app/
│   ├── appinfo/
│   │   ├── info.xml         # App-Metadaten (Name, Version, ...)
│   │   └── routes.php       # URL -> Controller-Zuordnung
│   ├── lib/
│   │   ├── AppInfo/Application.php   # Einstiegspunkt der App
│   │   ├── Controller/
│   │   │   ├── BookmarkController.php  # REST-API (für die Extension)
│   │   │   └── PageController.php      # Web-Oberfläche in Nextcloud
│   │   ├── Db/
│   │   │   ├── Bookmark.php         # Datenmodell
│   │   │   └── BookmarkMapper.php   # Datenbankzugriff
│   │   └── Migration/               # Legt die DB-Tabelle an
│   ├── templates/main.php    # HTML der Web-Oberfläche
│   ├── js/app.js             # JS der Web-Oberfläche
│   ├── css/style.css
│   └── composer.json
└── browser-extension/
    ├── manifest.json         # Extension-Konfiguration
    ├── background.js         # Sync-Logik (Kernstück)
    ├── popup.html / popup.js # Klick-Button "Jetzt synchronisieren"
    └── options.html / options.js  # Eintragen von Server-URL & Zugangsdaten
```

## Nextcloud-App installieren

Die App selbst ist in beiden Fällen identisch – der Unterschied liegt nur
darin, wie viel Zugriff du auf den Server hast, auf dem Nextcloud läuft.

### A) Selbst gehostete Nextcloud (eigener Server oder eigene VPS)

Gemeint ist jede Nextcloud-Installation, bei der du (oder dein Admin) vollen
Datei- und Terminalzugriff auf den Server habt – egal ob eigene Hardware,
ein Raspberry Pi zuhause oder ein gemieteter, unverwalteter Server
(z.B. ein "Hetzner Cloud Server", auf dem du Nextcloud selbst installiert hast).

1. Per SFTP/SSH auf den Server verbinden.
2. Ordner `nextcloud-app` nach `nextbookmark` umbenennen und in den
   `apps/`-Ordner deiner Nextcloud-Installation kopieren
   (typischerweise `/var/www/nextcloud/apps/nextbookmark`).
3. Rechte setzen, damit der Webserver-Nutzer die Dateien lesen kann, z.B.:
   ```
   chown -R www-data:www-data /var/www/nextcloud/apps/nextbookmark
   ```
   (Nutzername kann je nach Server auch `apache` o.ä. sein.)
4. App aktivieren – entweder per Weboberfläche (Einstellungen → Apps →
   "Nicht aktivierte Apps" → "Nextbookmark" aktivieren) oder per Konsole:
   ```
   sudo -u www-data php occ app:enable nextbookmark
   ```
5. Unter Nextcloud-Einstellungen → Sicherheit ein **App-Passwort** erzeugen
   (nicht dein normales Passwort verwenden!) – das brauchst du gleich in
   der Browser-Extension.

### B) Nextcloud bei einem Hosting-Anbieter (z.B. Hetzner Managed Nextcloud)

Viele Anbieter stellen eine **verwaltete** Nextcloud-Instanz bereit (du
bekommst nur einen Nextcloud-Zugang, keinen Server-/SSH-Zugriff). Dort lässt
sich normalerweise **nur der offizielle Nextcloud App Store** über die
Weboberfläche nutzen – eigene, unveröffentlichte Apps wie diese hier lassen
sich nicht einfach per Klick installieren. Mögliche Wege:

1. **Beim Anbieter nachfragen**: Manche Hosting-Pakete enthalten trotzdem
   SFTP-Zugriff auf den `apps/`-Ordner, oder der Support installiert eine
   eigene App auf Anfrage. Kurz beim Anbieter nachfragen lohnt sich – falls
   ja, einfach mit den Schritten aus Bereich A weitermachen.
   *Ausnahme: Bei **Hetzner Storage Share** ist das explizit ausgeschlossen
   – dort gibt es keinerlei SSH-/Root-Zugriff und es lassen sich nur Apps
   aus dem offiziellen Nextcloud App Store aktivieren. Für Storage Share
   direkt zu Option 2 oder 3 springen (siehe auch Bereich C weiter unten
   für einen schnellen, lokalen Test).*
2. **Auf einen eigenen (unverwalteten) Server wechseln**: z.B. einen
   "Hetzner Cloud Server" (VPS) statt des Managed-Nextcloud-Produkts mieten
   und Nextcloud dort selbst installieren – dann greift wieder Bereich A
   mit vollem Zugriff.
3. **App im offiziellen App Store veröffentlichen**: Für den dauerhaften,
   breiteren Einsatz könnte man Nextbookmark bei
   [apps.nextcloud.com](https://apps.nextcloud.com) einreichen (inkl.
   Code-Signierung und Review durch Nextcloud). Das lohnt sich erst, wenn
   die App über das Testen hinaus stabil laufen soll – ein Schritt, den wir
   uns bei Bedarf später gemeinsam anschauen können.

In allen Fällen gilt: Sobald die App aktiv ist, richtest du in der
Browser-Extension einfach die Nextcloud-URL, deinen Benutzernamen und ein
App-Passwort ein (siehe unten) – die Extension merkt nicht, ob die
Nextcloud selbst gehostet oder bei einem Anbieter läuft.

### C) Schnelltest: lokale Nextcloud per Docker auf deinem PC

Wenn du (wie bei Hetzner Storage Share) keinen eigenen Server hast, aber
trotzdem testen willst, ist eine lokale Test-Instanz per Docker der
schnellste, kostenlose Weg – komplett unabhängig von deiner produktiven
Hetzner-Cloud.

**Voraussetzung**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
installiert (Windows, Mac oder Linux).

1. Terminal öffnen und eine Test-Nextcloud starten:
   ```
   docker run -d --name nextcloud-test -p 8080:80 -v nextcloud-test-data:/var/www/html nextcloud
   ```
2. Im Browser `http://localhost:8080` öffnen und ein Admin-Konto anlegen.
3. Die App in den Container kopieren und aktivieren:
   ```
   docker cp nextcloud-app nextcloud-test:/var/www/html/apps/nextbookmark
   docker exec -u www-data nextcloud-test php occ app:enable nextbookmark
   ```
   (Falls `chown`-Fehler auftreten: `docker exec nextcloud-test chown -R www-data:www-data /var/www/html/apps/nextbookmark`)
4. Unter `http://localhost:8080` → Einstellungen → Sicherheit ein
   App-Passwort erzeugen.
5. In der Browser-Extension als Nextcloud-URL `http://localhost:8080`
   eintragen (das Manifest erlaubt dafür extra `http://localhost/*`,
   sonst ist standardmäßig nur `https://` zugelassen).

Die Test-Instanz läuft komplett isoliert in Docker – sie hat nichts mit
deiner echten Hetzner-Cloud zu tun, und du kannst sie jederzeit mit
`docker rm -f nextcloud-test` wieder entfernen.

## Browser-Extension zum Testen laden

1. Chrome/Edge: `chrome://extensions` öffnen → "Entwicklermodus" aktivieren
   → "Entpackte Erweiterung laden" → Ordner `browser-extension` auswählen.
2. In den Extension-Einstellungen die Nextcloud-URL, deinen Benutzernamen
   und das App-Passwort eintragen.
3. Über das Extension-Icon → "Jetzt synchronisieren" klicken.

## Was jetzt bereits funktioniert

- **Zwei-Wege-Sync**: neue Lesezeichen werden in beide Richtungen übertragen,
  Änderungen (Titel, Ordner) ebenso, und Löschungen werden auf der jeweils
  anderen Seite nachvollzogen.
- **Konfliktlösung** (bewusst einfach gehalten): Wurde ein Lesezeichen auf
  beiden Seiten seit dem letzten Abgleich verändert, gewinnt die Seite mit
  dem neueren Zeitstempel. Da Browser für einzelne Lesezeichen keine
  zuverlässige "zuletzt geändert"-Zeit liefern, ist das eine pragmatische
  Näherung – für den Alltag reicht sie, für einen produktiven Einsatz wäre
  ein sauberer, revisionierter Abgleich der nächste Ausbauschritt.
- **Kein zentraler "Master"**: Nextcloud ist kein bevorzugter Master, dem
  der Browser blind folgt, sondern die gemeinsame Ablage, über die sich
  mehrere Geräte gegenseitig abgleichen – Änderungen laufen in beide
  Richtungen, entschieden wird pro Lesezeichen (siehe Konfliktlösung
  oben). Möglich wird das, weil der Abgleich nicht nur "lokal vs. Server"
  vergleicht, sondern zusätzlich den *letzten bekannten Stand* aus dem
  vorherigen Sync mit einbezieht (`syncState`, siehe Kommentar am Anfang
  von `background.js`). Richtest du die Extension auf einem neuen/leeren
  Gerät ein, ist für dieses Gerät (dessen `syncState` ja leer ist) jedes
  Cloud-Lesezeichen "neu, nie gesehen" → es wird heruntergeladen, nicht
  gelöscht. Gelöscht wird nur, wenn ein Gerät sich aktiv erinnert "das
  kannte ich früher lokal, jetzt ist es weg".
- **Ordnerstruktur**: Der Ordnerpfad (z.B. `Lesezeichenleiste/Arbeit`) wird
  mit übertragen; beim Herunterladen werden fehlende Ordner lokal automatisch
  angelegt.
- **Automatischer Sync**: läuft alle 15 Minuten im Hintergrund (`browser.alarms`)
  und zusätzlich kurz nach jeder lokalen Änderung (entprellt, 5 Sekunden).
  Der Button "Jetzt synchronisieren" bleibt für manuelles Auslösen erhalten.
- **Cross-Browser-Kompatibilität**: `browser-polyfill-shim.js` sorgt dafür,
  dass derselbe Code in Chrome/Edge (nur `chrome.*` vorhanden) und Firefox
  (natives, promise-basiertes `browser.*`) läuft. Für den Firefox-Store wäre
  zusätzlich die reguläre Signierung/Veröffentlichung nötig; die
  `gecko.id` im Manifest ist dafür schon vorbereitet.
- **Onboarding-Import-Abfrage**: Direkt nach der Installation (bzw. sobald
  du die Nextcloud-Zugangsdaten in den Einstellungen gespeichert hast)
  öffnet sich automatisch `onboarding.html` mit der Frage, ob deine
  vorhandenen lokalen Lesezeichen importiert werden sollen.
  - **Ja** → löst sofort einen Sync aus, alle vorhandenen Lesezeichen
    werden hochgeladen.
  - **Nein** → diese Lesezeichen werden dauerhaft vom Sync ignoriert
    (weder hoch- noch heruntergeladen). Über den Button "Übersprungene
    Lesezeichen jetzt importieren" in den Einstellungen kannst du das
    jederzeit nachholen.
- **Icon**: `browser-extension/icons/` enthält ein blaues Icon in 16/48/128px
  (Lesezeichen-Form mit Sync-Pfeilen), erzeugt aus `icon-source.svg`.
  Dasselbe Icon liegt auch unter `nextcloud-app/img/` für die Web-Oberfläche.

## Bekannte Grenzen / mögliche nächste Schritte

- Konfliktlösung basiert auf einer Vereinfachung (siehe oben) statt echter
  Versionierung.
- Der Sync-Zustand liegt lokal je Browser-Profil (`browser.storage.local`),
  indiziert über die stabile lokale Browser-ID jedes Lesezeichens (nicht
  die URL, da dieselbe Adresse mehrfach vorkommen kann). Bei einer
  Neuinstallation der Extension ist dieser Zustand leer; der erste Sync
  danach erkennt bereits vorhandene Cloud-Lesezeichen anhand von
  URL+Ordner automatisch wieder, statt sie zu duplizieren.
- Für sehr viele Lesezeichen (mehrere Tausend) wäre eine effizientere,
  inkrementelle API (z.B. "nur Änderungen seit Zeitpunkt X") sinnvoll statt
  jedes Mal die komplette Liste zu laden.
