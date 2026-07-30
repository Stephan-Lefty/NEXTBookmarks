<?php
namespace OCA\Nextbookmark\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\IRequest;

/**
 * Liefert die Web-Oberfläche (das "Frontend") aus, die innerhalb von
 * Nextcloud angezeigt wird, wenn man links im Menü auf "Nextbookmark" klickt.
 */
class PageController extends Controller {
    public function __construct(string $appName, IRequest $request) {
        parent::__construct($appName, $request);
    }

    public function index(): TemplateResponse {
        // Rendert templates/main.php und bindet automatisch
        // die CSS/JS-Dateien aus css/ und js/ ein (siehe main.php)
        return new TemplateResponse('nextbookmark', 'main');
    }
}
