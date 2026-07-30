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
            },
        },
        runtime: {
            sendMessage: (...args) => chrome.runtime.sendMessage(...args),
            onMessage: chrome.runtime.onMessage,
        },
        alarms: {
            create: (name, info) => chrome.alarms.create(name, info),
            onAlarm: chrome.alarms.onAlarm,
        },
    };
}
