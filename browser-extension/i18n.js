// Übersetzt alle Elemente mit data-i18n(-placeholder)-Attributen anhand der
// WebExtension-i18n-API (_locales/<sprache>/messages.json), passend zur
// UI-Sprache des Browsers. Wird in jeder HTML-Seite vor dem eigentlichen
// Seiten-Skript eingebunden.
document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = chrome.i18n.getUILanguage();

    document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.title = chrome.i18n.getMessage(el.dataset.i18nTitle);
    });
});
