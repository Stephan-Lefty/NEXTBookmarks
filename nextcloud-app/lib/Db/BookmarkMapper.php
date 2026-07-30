<?php
namespace OCA\Nextbookmark\Db;

use OCP\AppFramework\Db\QBMapper;
use OCP\IDBConnection;

/**
 * Der Mapper ist die einzige Stelle, die direkt mit der Datenbank spricht.
 * Der Controller ruft nur diese Methoden auf und muss kein SQL kennen.
 */
class BookmarkMapper extends QBMapper {
    public function __construct(IDBConnection $db) {
        parent::__construct($db, 'nextbookmark_bookmarks', Bookmark::class);
    }

    // Alle Lesezeichen eines Nutzers
    public function findAllForUser(string $userId): array {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from($this->getTableName())
            ->where($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)))
            ->orderBy('position', 'ASC');
        return $this->findEntities($qb);
    }

    // Ein einzelnes Lesezeichen, aber nur wenn es dem Nutzer gehört
    public function findForUser(int $id, string $userId): Bookmark {
        $qb = $this->db->getQueryBuilder();
        $qb->select('*')
            ->from($this->getTableName())
            ->where($qb->expr()->eq('id', $qb->createNamedParameter($id)))
            ->andWhere($qb->expr()->eq('user_id', $qb->createNamedParameter($userId)));
        return $this->findEntity($qb);
    }
}
