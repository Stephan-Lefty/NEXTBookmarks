<?php
namespace OCA\Nextbookmarks\Db;

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
 * @method int getPosition()
 * @method void setPosition(int $position)
 */
class Bookmark extends Entity implements \JsonSerializable {
    protected $userId;
    protected $url;
    protected $title;
    protected $folder;
    protected $updatedAt;
    protected $position;

    public function __construct() {
        // Registriert die Felder, damit Nextcloud sie automatisch
        // aus/in die Datenbank konvertiert.
        $this->addType('id', 'integer');
        $this->addType('updatedAt', 'integer');
        $this->addType('position', 'integer');
    }

    // Entity implementiert JsonSerializable nicht selbst und serialisiert
    // ohne dies nur die public-Property "id" - die Browser-Extension
    // braucht aber url/title/folder/updatedAt/position aus der API-Antwort.
    public function jsonSerialize(): array {
        return [
            'id' => $this->id,
            'url' => $this->url,
            'title' => $this->title,
            'folder' => $this->folder,
            'updatedAt' => $this->updatedAt,
            'position' => $this->position,
        ];
    }
}
