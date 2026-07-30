<?php
// Bindet unser CSS und JS in die Nextcloud-Seite ein
\OCP\Util::addStyle('nextbookmarks', 'style');
\OCP\Util::addScript('nextbookmarks', 'app');
?>
<div id="nextbookmarks-app">
    <h2>Meine Lesezeichen</h2>
    <ul id="bookmark-list"><!-- wird per JS gefüllt: Ordner, aufklappbar --></ul>
</div>
