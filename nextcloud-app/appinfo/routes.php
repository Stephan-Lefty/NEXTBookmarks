<?php
// Diese Datei verbindet URLs (Routen) mit Funktionen in unseren Controllern.
// "page" = die Web-Oberfläche innerhalb von Nextcloud
// "api"  = die REST-Schnittstelle, die auch die Browser-Extension benutzt

return [
    'routes' => [
        // Web-UI: zeigt die Lesezeichen-Seite in Nextcloud an
        ['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
    ],
    'ocs' => [
        // REST-API unter /ocs/v2.php/apps/nextbookmarks/api/bookmarks
        // Diese Endpunkte ruft später die Browser-Extension auf.
        ['name' => 'bookmark#index',  'url' => '/api/bookmarks',      'verb' => 'GET'],
        ['name' => 'bookmark#create', 'url' => '/api/bookmarks',      'verb' => 'POST'],
        ['name' => 'bookmark#update', 'url' => '/api/bookmarks/{id}', 'verb' => 'PUT'],
        ['name' => 'bookmark#destroy','url' => '/api/bookmarks/{id}', 'verb' => 'DELETE'],
    ],
];
