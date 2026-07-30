<?php
// Bindet unser CSS und JS in die Nextcloud-Seite ein
\OCP\Util::addStyle('nextbookmarks', 'style');
\OCP\Util::addScript('nextbookmarks', 'app');
// Lädt l10n/<sprache>.js, damit t('nextbookmarks', ...) in app.js übersetzt
\OCP\Util::addTranslations('nextbookmarks');
// $l wird von Nextcloud automatisch für dieses Template bereitgestellt
?>
<div id="nextbookmarks-app">
    <h2><?php p($l->t('My Bookmarks')); ?></h2>
    <ul id="bookmark-list"><!-- wird per JS gefüllt: Ordner, aufklappbar --></ul>
</div>
