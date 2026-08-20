<?php
// Bindet unser CSS und JS in die Nextcloud-Seite ein
\OCP\Util::addStyle('nextbookmarks', 'style');
\OCP\Util::addScript('nextbookmarks', 'app');
// Lädt l10n/<sprache>.js, damit t('nextbookmarks', ...) in app.js übersetzt
\OCP\Util::addTranslations('nextbookmarks');
// $l wird von Nextcloud automatisch für dieses Template bereitgestellt
?>
<div id="nextbookmarks-app">
    <!-- Überschrift und Liste liegen gemeinsam auf einer Fläche mit eigenem
         Hintergrund: Zeigt das Nextcloud-Theme ein Hintergrundbild, wäre
         Text direkt darauf je nach Bild kaum lesbar (siehe css/style.css). -->
    <div class="nextbookmarks-card">
        <h2><?php p($l->t('My Bookmarks')); ?></h2>
        <ul id="bookmark-list"><!-- wird per JS gefüllt: Ordner, aufklappbar --></ul>
    </div>
</div>
