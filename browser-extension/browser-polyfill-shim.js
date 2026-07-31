// Firefox stellt das promise-basierte "browser.*"-API global bereit.
// Chrome/Edge kennen nur "chrome.*", teilweise noch callback-basiert.
// Dieser kleine Shim sorgt dafür, dass der Rest des Codes einheitlich
// "browser.*" mit Promises verwenden kann – egal in welchem Browser.
// (Für ein "echtes" Projekt würde man stattdessen die fertige Bibliothek
// "webextension-polyfill" von Mozilla einbinden.)

if (typeof browser === 'undefined') {
    self.browser = {
        bookmarks: {
            getTree: () => new Promise(resolve => chrome.bookmarks.getTree(resolve)),
            getSubTree: (id) => new Promise(resolve => chrome.bookmarks.getSubTree(id, resolve)),
            getChildren: (id) => new Promise(resolve => chrome.bookmarks.getChildren(id, resolve)),
            search: (query) => new Promise(resolve => chrome.bookmarks.search(query, resolve)),
            create: (details) => new Promise(resolve => chrome.bookmarks.create(details, resolve)),
            update: (id, changes) => new Promise(resolve => chrome.bookmarks.update(id, changes, resolve)),
            remove: (id) => new Promise(resolve => chrome.bookmarks.remove(id, resolve)),
            removeTree: (id) => new Promise(resolve => chrome.bookmarks.removeTree(id, resolve)),
            onCreated: chrome.bookmarks.onCreated,
            onRemoved: chrome.bookmarks.onRemoved,
            onChanged: chrome.bookmarks.onChanged,
            onMoved: chrome.bookmarks.onMoved,
        },
        storage: {
            sync: {
                get: (keys) => new Promise(resolve => chrome.storage.sync.get(keys, resolve)),
                set: (items) => new Promise(resolve => chrome.storage.sync.set(items, resolve)),
            },
            local: {
                get: (keys) => new Promise(resolve => chrome.storage.local.get(keys, resolve)),
                set: (items) => new Promise(resolve => chrome.storage.local.set(items, resolve)),
                remove: (keys) => new Promise(resolve => chrome.storage.local.remove(keys, resolve)),
            },
        },
        runtime: {
            sendMessage: (...args) => chrome.runtime.sendMessage(...args),
            onMessage: chrome.runtime.onMessage,
            onInstalled: chrome.runtime.onInstalled,
            onStartup: chrome.runtime.onStartup,
            getURL: (path) => chrome.runtime.getURL(path),
        },
        alarms: {
            create: (name, info) => chrome.alarms.create(name, info),
            onAlarm: chrome.alarms.onAlarm,
        },
        windows: {
            create: (details) => new Promise(resolve => chrome.windows.create(details, resolve)),
            update: (id, info) => new Promise(resolve => chrome.windows.update(id, info, resolve)),
            getCurrent: () => new Promise(resolve => chrome.windows.getCurrent(resolve)),
            getAll: (info) => new Promise(resolve => chrome.windows.getAll(info, resolve)),
            onRemoved: chrome.windows.onRemoved,
        },
        tabs: {
            create: (details) => new Promise(resolve => chrome.tabs.create(details, resolve)),
        },
        permissions: {
            request: (perms) => new Promise(resolve => chrome.permissions.request(perms, resolve)),
            contains: (perms) => new Promise(resolve => chrome.permissions.contains(perms, resolve)),
        },
    };
}
