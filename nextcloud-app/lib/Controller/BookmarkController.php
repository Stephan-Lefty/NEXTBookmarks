<?php
namespace OCA\Nextbookmark\Controller;

use OCA\Nextbookmark\Db\Bookmark;
use OCA\Nextbookmark\Db\BookmarkMapper;
use OCP\AppFramework\ApiController;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Db\DoesNotExistException;
use OCP\IRequest;

/**
 * Dies ist die REST-API, die die Browser-Extension per HTTP anspricht.
 * ApiController kümmert sich automatisch um Dinge wie CORS und CSRF,
 * die für eine externe Extension wichtig sind.
 */
class BookmarkController extends ApiController {
    private BookmarkMapper $mapper;
    private string $userId;

    public function __construct(
        string $appName,
        IRequest $request,
        BookmarkMapper $mapper,
        string $userId
    ) {
        parent::__construct($appName, $request);
        $this->mapper = $mapper;
        $this->userId = $userId;
    }

    // GET /api/bookmarks -> alle Lesezeichen des eingeloggten Nutzers
    public function index(): DataResponse {
        return new DataResponse($this->mapper->findAllForUser($this->userId));
    }

    // POST /api/bookmarks -> neues Lesezeichen anlegen
    public function create(string $url, ?string $title = null, ?string $folder = null): DataResponse {
        $bookmark = new Bookmark();
        $bookmark->setUserId($this->userId);
        $bookmark->setUrl($url);
        $bookmark->setTitle($title ?? '');
        $bookmark->setFolder($folder ?? '');
        $bookmark->setUpdatedAt(time());

        $saved = $this->mapper->insert($bookmark);
        return new DataResponse($saved);
    }

    // PUT /api/bookmarks/{id} -> vorhandenes Lesezeichen aktualisieren
    public function update(int $id, ?string $url = null, ?string $title = null, ?string $folder = null): DataResponse {
        try {
            $bookmark = $this->mapper->findForUser($id, $this->userId);
        } catch (DoesNotExistException $e) {
            return new DataResponse(['error' => 'Nicht gefunden'], 404);
        }

        if ($url !== null) $bookmark->setUrl($url);
        if ($title !== null) $bookmark->setTitle($title);
        if ($folder !== null) $bookmark->setFolder($folder);
        $bookmark->setUpdatedAt(time());

        $saved = $this->mapper->update($bookmark);
        return new DataResponse($saved);
    }

    // DELETE /api/bookmarks/{id} -> Lesezeichen löschen
    public function destroy(int $id): DataResponse {
        try {
            $bookmark = $this->mapper->findForUser($id, $this->userId);
        } catch (DoesNotExistException $e) {
            return new DataResponse(['error' => 'Nicht gefunden'], 404);
        }

        $this->mapper->delete($bookmark);
        return new DataResponse(['deleted' => true]);
    }
}
