package db.migration;

import com.sravanaparimi.profile.studio.ContentBlockImporter;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Splits the currently published content into Site Studio blocks. Logic lives in studio. */
public class V16__ImportContentBlocks extends BaseJavaMigration {
  @Override
  public void migrate(Context context) throws Exception {
    ContentBlockImporter.importPublished(context.getConnection());
  }
}
