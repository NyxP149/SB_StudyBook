package com.jarvyx.studybook.note;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Backfills the note_folders join table (multi-folder membership) from the
 * now-unmapped legacy note.folder_id column, for notes assigned before that
 * change. Safe to run on every startup: only inserts rows not already
 * present. The legacy column itself is left in place (Hibernate's
 * ddl-auto=update never drops columns), unused going forward.
 */
@Component
public class LegacyFolderMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LegacyFolderMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public LegacyFolderMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int migrated = jdbcTemplate.update(
                    "insert into note_folders (note_id, folder_id) "
                            + "select id, folder_id from note "
                            + "where folder_id is not null "
                            + "and not exists ("
                            + "  select 1 from note_folders nf "
                            + "  where nf.note_id = note.id and nf.folder_id = note.folder_id)");
            if (migrated > 0) {
                log.info("Migre {} affectation(s) de dossier heritees vers note_folders", migrated);
            }
        } catch (DataAccessException e) {
            log.warn("Migration note.folder_id -> note_folders ignoree (colonne heritee absente ?) : {}", e.getMessage());
        }
    }
}
