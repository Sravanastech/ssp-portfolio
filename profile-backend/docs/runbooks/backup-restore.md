# Backup and restore practice

Use synthetic data only until an approved production backup destination and key process exist. This runbook is a manual practice, not proof of a tested production recovery plan.

1. Set `DATABASE_URL` to the development database connection without printing it. Install PostgreSQL client tools and `age`.
2. Obtain an age **public** recipient from the backup owner, then run:

   ```sh
   test -n "$DATABASE_URL" && test -n "$AGE_RECIPIENT"
   pg_dump --format=custom --no-owner "$DATABASE_URL" | age --encrypt --recipient "$AGE_RECIPIENT" > "profile-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
   ```

3. Copy the encrypted archive to a separate approved storage location. Keep the age private identity separate from both the app host and backup files.
4. Create a new empty restore database. Do not overwrite the development or production database. Decrypt and restore:

   ```sh
   age --decrypt --identity "$AGE_IDENTITY_FILE" profile-YYYYMMDDTHHMMSSZ.dump.age | pg_restore --clean --if-exists --no-owner --dbname "$RESTORE_DATABASE_URL"
   ```

5. Confirm migrations, content revision counts, account/inquiry row counts, and a public API smoke check. Do not export or print private account or inquiry values.
6. Record restore duration, data timestamp, failures, and corrective actions. Remove the temporary restored database only after review.

Production rollout still needs scheduled off-host backups, retention and deletion policy, key rotation, access logging, restore automation, and an observed recovery-time/data-loss result.
