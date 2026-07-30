<?php
namespace OCA\Nextbookmark\Migration;

use Closure;
use OCP\DB\ISchemaWrapper;
use OCP\Migration\SimpleMigrationStep;
use OCP\Migration\IOutput;

/**
 * Ergänzt die Spalte "position", damit die Reihenfolge der Ordner/
 * Lesezeichen aus dem Browser-Lesezeichenbaum erhalten bleibt (statt
 * beim Sync verloren zu gehen).
 */
class Version000000Date20260730120000 extends SimpleMigrationStep {
    public function changeSchema(IOutput $output, Closure $schemaClosure, array $options): ?ISchemaWrapper {
        /** @var ISchemaWrapper $schema */
        $schema = $schemaClosure();

        $table = $schema->getTable('nextbookmark_bookmarks');
        if (!$table->hasColumn('position')) {
            $table->addColumn('position', 'integer', [
                'notnull' => true,
                'default' => 0,
            ]);
        }

        return $schema;
    }
}
