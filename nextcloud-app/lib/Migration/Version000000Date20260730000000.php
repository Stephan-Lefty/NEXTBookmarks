<?php
namespace OCA\Nextbookmark\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\SimpleMigrationStep;
use OCP\Migration\IOutput;

/**
 * Migrationen sind Nextclouds Art, Datenbank-Tabellen anzulegen/zu ändern.
 * Diese Datei wird automatisch beim Installieren/Aktivieren der App ausgeführt.
 */
class Version000000Date20260730000000 extends SimpleMigrationStep {
    public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
        /** @var ISchemaWrapper $schema */
        $schema = $schemaClosure();

        if (!$schema->hasTable('nextbookmark_bookmarks')) {
            $table = $schema->createTable('nextbookmark_bookmarks');
            $table->addColumn('id', 'integer', [
                'autoincrement' => true,
                'notnull' => true,
            ]);
            $table->addColumn('user_id', 'string', [
                'notnull' => true,
                'length' => 64,
            ]);
            $table->addColumn('url', 'string', [
                'notnull' => true,
                'length' => 2048,
            ]);
            $table->addColumn('title', 'string', [
                'notnull' => false,
                'length' => 512,
            ]);
            $table->addColumn('folder', 'string', [
                'notnull' => false,
                'length' => 512,
            ]);
            $table->addColumn('updated_at', 'integer', [
                'notnull' => true,
            ]);
            $table->setPrimaryKey(['id']);
            $table->addIndex(['user_id'], 'nextbookmark_user_idx');
        }

        return $schema;
    }
}
