<?php
namespace OCA\Nextbookmark\Db;

use OCP\AppFramework\Db\Entity;

/**
 * Ein einzelnes Lesezeichen. Jede "get"/"set"-Methode wird von Nextcloud
 * automatisch erzeugt (über @method-Kommentare), wenn wir die Felder unten
 * im Konstruktor registrieren.
 *
 * @method string getUserId()
 * @method void setUserId(string $userId)
 * @method string getUrl()
 * @method void setUrl(string $url)
 * @method string getTitle()
 * @method void setTitle(string $title)
 * @method string getFolder()
 * @method void setFolder(string $folder)
 * @method int getUpdatedAt()
 * @method void setUpdatedAt(int $updatedAt)
 */
class Bookmark extends Entity {
    protected $userId;
    protected $url;
    protected $title;
    protected $folder;
    protected $updatedAt;

    public function __construct() {
        // Registriert die Felder, damit Nextcloud sie automatisch
        // aus/in die Datenbank konvertiert.
        $this->addType('id', 'integer');
        $this->addType('updatedAt', 'integer');
    }
}
