<?php
// Bindet unser CSS und JS in die Nextcloud-Seite ein
\OCP\Util::addStyle('nextbookmark', 'style');
\OCP\Util::addScript('nextbookmark', 'app');
?>
<div id="nextbookmark-app">
    <h2>Meine Lesezeichen</h2>
    <ul id="bookmark-list"><!-- wird per JS gefüllt --></ul>
</div>
