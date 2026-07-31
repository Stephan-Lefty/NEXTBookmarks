[Deutsch](PRIVACY.md) | [English](PRIVACY.en.md)

# Privacy Policy – NEXTBookmarks

This policy applies to the "NEXTBookmarks" browser extension.

## What data is processed

- **Bookmarks** (title, URL, folder structure): synced with the Nextcloud
  instance you configure yourself in the settings.
- **Credentials** (Nextcloud server URL, username, app password): entered
  to establish the connection to your Nextcloud.

## Where this data is stored and sent

- **Locally in the browser**: bookmarks already live locally (the
  browser's own bookmark manager). Credentials are stored via the
  browser's own `storage.sync` API – the same mechanism used e.g. to sync
  Chrome/Firefox settings between your own devices, controlled by your
  Google/Firefox account, not by NEXTBookmarks.
- **Nextcloud server**: bookmarks and (for authentication) the credentials
  are sent exclusively to the Nextcloud address **you enter yourself**
  (via REST API or WebDAV, see README). There is no intermediary server
  operated by the developers.
- **No other third parties**: there is no transmission to the NEXTBookmarks
  developers, to analytics/tracking services, or to any other third party.
  The extension contains no analytics, tracking, or telemetry whatsoever.

## Permissions

- **Bookmarks**: to read and write your browser bookmarks (the extension's
  core function).
- **Storage**: to store settings and sync state locally.
- **Alarms**: for the periodic background sync (every 15 minutes).
- **Website access (optional, per domain)**: only requested once you enter
  and save a Nextcloud URL in the settings – and then only for that exact
  domain, not for "all websites".

## Control over your data

- You decide which Nextcloud instance to sync with.
- The "Export backup" button lets you create a local copy of all your
  bookmarks at any time.
- If you remove the extension, the locally stored credentials and sync
  state are removed with it; bookmarks stored on your Nextcloud remain
  untouched there (you manage them directly in your Nextcloud).

## Contact

Questions or concerns about privacy: please file an issue on the GitHub
repository –
[github.com/Stephan-Lefty/nextbookmarks/issues](https://github.com/Stephan-Lefty/nextbookmarks/issues).
