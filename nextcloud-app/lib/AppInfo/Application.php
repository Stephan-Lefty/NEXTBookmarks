<?php
namespace OCA\Nextbookmarks\AppInfo;

use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

// Jede Nextcloud-App braucht genau eine solche "Application"-Klasse.
// Nextcloud lädt sie beim Start und richtet darüber die App ein (Dependency Injection).
class Application extends App implements IBootstrap {
    public const APP_ID = 'nextbookmarks';

    public function __construct() {
        parent::__construct(self::APP_ID);
    }

    public function register(IRegistrationContext $context): void {
        // Hier könnten weitere Dienste registriert werden (z.B. Events, Middleware)
    }

    public function boot(IBootContext $context): void {
    }
}
