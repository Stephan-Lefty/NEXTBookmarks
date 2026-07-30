[Deutsch](README.md) | [English](README.en.md)

# NEXTBookmarks – Scaffold

A tool that keeps browser bookmarks in sync centrally through a self-hosted
Nextcloud – independent of browser and operating system.

This project was built in collaboration with [Claude](https://claude.com).

## How the two parts work together

```
Chrome/Firefox/Edge  --(REST API over HTTPS)-->  Nextcloud app "nextbookmarks"
 (browser-extension/)                             (nextcloud-app/, PHP)
                                                          |
                                                     Nextcloud database
```

- **nextcloud-app/**: Runs on your Nextcloud server. Stores all bookmarks in
  its own database table and exposes them via a REST API. It also shows a
  simple web UI inside Nextcloud.
- **browser-extension/**: Runs in the user's browser, reads the local
  bookmarks (`chrome.bookmarks` API, also supported by Firefox) and sends
  new bookmarks to the REST API.

Because the extension only uses standard web technologies (WebExtension API,
fetch), it runs unchanged or with minimal adjustments in Chrome, Firefox and
Edge. And because the app logic lives in Nextcloud, the server's operating
system doesn't matter.

## Folder structure

```
nextbookmarks/
├── nextcloud-app/
│   ├── appinfo/
│   │   ├── info.xml         # App metadata (name, version, ...)
│   │   └── routes.php       # URL -> controller mapping
│   ├── lib/
│   │   ├── AppInfo/Application.php   # App entry point
│   │   ├── Controller/
│   │   │   ├── BookmarkController.php  # REST API (for the extension)
│   │   │   └── PageController.php      # Web UI inside Nextcloud
│   │   ├── Db/
│   │   │   ├── Bookmark.php         # Data model
│   │   │   └── BookmarkMapper.php   # Database access
│   │   └── Migration/               # Creates the DB table
│   ├── templates/main.php    # HTML of the web UI
│   ├── js/app.js             # JS of the web UI
│   ├── css/style.css
│   └── composer.json
└── browser-extension/
    ├── manifest.json         # Extension configuration
    ├── background.js         # Sync logic (the core piece)
    ├── popup.html / popup.js # "Sync now" click button
    └── options.html / options.js  # Enter server URL & credentials
```

## Installing the Nextcloud app

The app itself is identical in both cases – the difference is only how much
access you have to the server Nextcloud runs on.

### A) Self-hosted Nextcloud (your own server or VPS)

This means any Nextcloud installation where you (or your admin) have full
file and terminal access to the server – whether it's your own hardware, a
Raspberry Pi at home, or a rented, unmanaged server (e.g. a "Hetzner Cloud
Server" on which you installed Nextcloud yourself).

1. Connect to the server via SFTP/SSH.
2. Rename the `nextcloud-app` folder to `nextbookmarks` and copy it into the
   `apps/` folder of your Nextcloud installation (typically
   `/var/www/nextcloud/apps/nextbookmarks`).
3. Set permissions so the web server user can read the files, e.g.:
   ```
   chown -R www-data:www-data /var/www/nextcloud/apps/nextbookmarks
   ```
   (the username may also be `apache` or similar depending on the server.)
4. Enable the app – either via the web UI (Settings → Apps →
   "Disabled apps" → enable "NEXTBookmarks") or via the console:
   ```
   sudo -u www-data php occ app:enable nextbookmarks
   ```
5. Under Nextcloud settings → Security, generate an **app password** (don't
   use your regular password!) – you'll need it in the browser extension in
   a moment.

### B) Nextcloud with a hosting provider (e.g. Hetzner Managed Nextcloud)

Many providers offer a **managed** Nextcloud instance (you only get a
Nextcloud account, no server/SSH access). There, usually **only the official
Nextcloud App Store** can be used via the web UI – custom, unpublished apps
like this one can't simply be installed with a click. Possible paths:

1. **Ask the provider**: Some hosting packages still include SFTP access to
   the `apps/` folder, or support will install a custom app on request.
   Worth a quick ask – if yes, just continue with the steps from section A.
   *Exception: with **Hetzner Storage Share** this is explicitly excluded –
   there is no SSH/root access at all, and only apps from the official
   Nextcloud App Store can be enabled. For Storage Share, jump straight to
   option 2 or 3 (see also section C below for a quick local test).*
2. **Switch to your own (unmanaged) server**: e.g. rent a "Hetzner Cloud
   Server" (VPS) instead of the managed Nextcloud product and install
   Nextcloud there yourself – then section A applies again with full
   access.
3. **Publish in the official App Store**: For long-term, broader use, you
   could submit NEXTBookmarks to [apps.nextcloud.com](https://apps.nextcloud.com)
   (including code signing and review by Nextcloud). That's only worth it
   once the app runs stably beyond testing – a step we can look at together
   later if needed.

In all cases: once the app is active, just enter the Nextcloud URL, your
username and an app password in the browser extension (see below) – the
extension doesn't care whether Nextcloud is self-hosted or with a provider.

### C) Quick test: local Nextcloud via Docker on your PC

If you (like with Hetzner Storage Share) don't have your own server but
still want to test, a local test instance via Docker is the fastest, free
way – completely independent of your production Hetzner cloud.

**Prerequisite**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
installed (Windows, Mac or Linux).

1. Open a terminal and start a test Nextcloud:
   ```
   docker run -d --name nextcloud-test -p 8080:80 -v nextcloud-test-data:/var/www/html nextcloud
   ```
2. Open `http://localhost:8080` in your browser and create an admin account.
3. Copy the app into the container and enable it:
   ```
   docker cp nextcloud-app nextcloud-test:/var/www/html/apps/nextbookmarks
   docker exec -u www-data nextcloud-test php occ app:enable nextbookmarks
   ```
   (If `chown` errors occur: `docker exec nextcloud-test chown -R www-data:www-data /var/www/html/apps/nextbookmarks`)
4. Under `http://localhost:8080` → Settings → Security, generate an app
   password.
5. In the browser extension, enter `http://localhost:8080` as the Nextcloud
   URL (the manifest specifically allows `http://localhost/*` for this,
   otherwise only `https://` is allowed by default).

The test instance runs completely isolated in Docker – it has nothing to do
with your real Hetzner cloud, and you can remove it any time with
`docker rm -f nextcloud-test`.

## Loading the browser extension for testing

1. Chrome/Edge: open `chrome://extensions` → enable "Developer mode" →
   "Load unpacked" → select the `browser-extension` folder.
2. In the extension settings, enter the Nextcloud URL, your username and
   the app password.
3. Click the extension icon → "Sync now".

## What already works

- **Two-way sync**: new bookmarks are transferred in both directions,
  changes (title, folder) as well, and deletions are propagated to the
  other side.
- **Conflict resolution** (deliberately kept simple): if a bookmark was
  changed on both sides since the last sync, the side with the newer
  timestamp wins. Since browsers don't provide a reliable, consistent
  "last modified" time for individual bookmarks, this is a pragmatic
  approximation – good enough for everyday use; for production use, a
  proper, versioned reconciliation would be the next step.
- **No central "master"**: Nextcloud isn't a preferred master that the
  browser blindly follows, but the shared store through which multiple
  devices reconcile with each other – changes flow in both directions,
  decided per bookmark (see conflict resolution above). This works because
  the sync doesn't just compare "local vs. server", but also takes into
  account the *last known state* from the previous sync (`syncState`, see
  the comment at the top of `background.js`). If you set up the extension
  on a new/empty device, every cloud bookmark is "new, never seen" for that
  device (since its `syncState` is empty) → it gets downloaded, not
  deleted. Something only gets deleted if a device actively remembers "I
  used to know this locally, now it's gone".
- **Folder structure**: the folder path (e.g. `Bookmarks Bar/Work`) is
  transferred as well; missing folders are created locally automatically
  when downloading.
- **Automatic sync**: runs every 15 minutes in the background
  (`browser.alarms`) and additionally shortly after every local change
  (debounced, 5 seconds). The "Sync now" button remains available for
  manual triggering.
- **Cross-browser compatibility**: `browser-polyfill-shim.js` ensures the
  same code runs in Chrome/Edge (only `chrome.*` available) and Firefox
  (native, promise-based `browser.*`). Publishing to the Firefox store
  would additionally require the regular signing/publishing process; the
  `gecko.id` in the manifest is already prepared for that.
- **Onboarding import prompt**: right after installation (or as soon as you
  save the Nextcloud credentials in the settings), `onboarding.html` opens
  automatically asking whether your existing local bookmarks should be
  imported.
  - **Yes** → immediately triggers a sync, all existing bookmarks are
    uploaded.
  - **No** → these bookmarks are permanently ignored by the sync (neither
    uploaded nor downloaded). You can catch up on this any time via the
    "Import skipped bookmarks now" button in the settings.
- **Icon**: `browser-extension/icons/` contains a blue icon in 16/48/128px
  (bookmark shape with sync arrows), generated from `icon-source.svg`. The
  same icon also lives under `nextcloud-app/img/` for the web UI.
- **Web UI** (inside Nextcloud, "NEXTBookmarks" menu item): bookmarks are
  displayed grouped by folder; clicking a folder expands the title (bold)
  and URL (clickable, opens in a new tab) of the contained bookmarks.
  Folders appear in the same order as in the browser's bookmark tree, trash
  folders are always sorted to the end. The text color automatically
  adapts to the active Nextcloud theme (light/dark).

## Development / testing local changes

If you're continuing to work on the code and want to check via the Docker
test instance (see section C above) whether a change works:

1. Copy the changed file into the running container, e.g.:
   ```
   docker cp nextcloud-app/js/app.js nextcloud-test:/var/www/html/apps/nextbookmarks/js/app.js
   docker exec nextcloud-test chown www-data:www-data /var/www/html/apps/nextbookmarks/js/app.js
   ```
2. **Only for changes to a migration** (new/changed column in
   `lib/Migration/`), additionally disable/enable the app once so the
   migration runs:
   ```
   docker exec -u www-data nextcloud-test php occ app:disable nextbookmarks
   docker exec -u www-data nextcloud-test php occ app:enable nextbookmarks
   ```
3. **Watch out for browser caching**: Nextcloud serves `js/app.js` and
   `css/style.css` with a very long `Cache-Control` header (several
   months). After every change to these two files, make sure to hard-reload
   with **Ctrl+Shift+R**, otherwise it will look like nothing changed even
   though the server has long been serving the new version.
4. Changes to `browser-extension/*.js` don't affect the Nextcloud
   container, but the loaded extension itself: in `chrome://extensions` or
   `vivaldi://extensions`, click the reload arrow (⟳) next to NEXTBookmarks.

## Known limitations / possible next steps

- Conflict resolution is based on a simplification (see above) rather than
  true versioning.
- The sync state lives locally per browser profile
  (`browser.storage.local`), indexed by each bookmark's stable local
  browser ID (not the URL, since the same address can occur more than
  once). On a fresh install of the extension, this state is empty; the
  first sync after that automatically recognizes existing cloud bookmarks
  by URL+folder instead of duplicating them.
- For very large numbers of bookmarks (several thousand), a more efficient,
  incremental API (e.g. "only changes since timestamp X") would make sense
  instead of loading the complete list every time.

## Reporting bugs

The `<bugs>` address in `nextcloud-app/appinfo/info.xml` points to
[github.com/Stephan-Lefty/nextbookmarks/issues](https://github.com/Stephan-Lefty/nextbookmarks/issues) -
that's where bugs and ideas for next steps can be filed.
