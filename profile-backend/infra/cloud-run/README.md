# Cloud Run deploy (hybrid mode)

Project `ssp-profile`, region `us-central1`, service `profile-backend` (matches the Firebase Hosting `/api/**` rewrite).
The API serves only gated `/api/resume`, `/api/me`, admin endpoints and `/api/health`. Publishing, notification worker, Redis cache and the contact API are OFF by default in the prod profile. Site content and the contact form are static in the UI (Web3Forms).

Run these yourself; nothing here has been executed.

```sh
export PROJECT=ssp-profile REGION=us-central1 SERVICE=profile-backend
export BUCKET=${PROJECT}-profile-private-media
gcloud config set project $PROJECT
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com storage.googleapis.com
```

## 1. Private media bucket (resume)

```sh
gcloud storage buckets create gs://$BUCKET --location=$REGION --uniform-bucket-level-access --public-access-prevention
gcloud storage cp /path/to/resume.pdf gs://$BUCKET/private/resume.pdf
```

Mount path is `/var/lib/profile/media`, so the app reads `/var/lib/profile/media/private/resume.pdf`.

## 2. Service account and access

```sh
gcloud iam service-accounts create profile-backend-sa --display-name="profile-backend runtime"
SA=profile-backend-sa@$PROJECT.iam.gserviceaccount.com
gcloud storage buckets add-iam-policy-binding gs://$BUCKET --member=serviceAccount:$SA --role=roles/storage.objectViewer
```

## 3. Secrets (Secret Manager)

```sh
openssl rand -hex 32 | gcloud secrets create inquiry-ip-salt --data-file=-
printf '%s' 'jdbc:postgresql://<host>:5432/postgres?sslmode=verify-full' | gcloud secrets create db-url --data-file=-
printf '%s' '<db user>' | gcloud secrets create db-username --data-file=-
printf '%s' '<db password>' | gcloud secrets create db-password --data-file=-
for s in inquiry-ip-salt db-url db-username db-password; do
  gcloud secrets add-iam-policy-binding $s --member=serviceAccount:$SA --role=roles/secretmanager.secretAccessor
done
```

`INQUIRY_IP_SALT` is only validated when `CONTACT_ENABLED=true`, but it is cheap to create now.

## 4. Build and deploy

```sh
gcloud run deploy $SERVICE --source . --region $REGION --service-account $SA \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --add-volume name=media,type=cloud-storage,bucket=$BUCKET,readonly=true \
  --add-volume-mount volume=media,mount-path=/var/lib/profile/media \
  --set-env-vars SPRING_PROFILES_ACTIVE=prod,PROFILE_MEDIA_ROOT=/var/lib/profile/media,AUTH_ISSUER=https://sravanastech.us.auth0.com/,AUTH_AUDIENCE=<your Auth0 API identifier>,PUBLISHING_ENABLED=false,NOTIFICATIONS_ENABLED=false,CACHE_ENABLED=false,CONTACT_ENABLED=false \
  --set-secrets DB_URL=db-url:latest,DB_USERNAME=db-username:latest,DB_PASSWORD=db-password:latest,INQUIRY_IP_SALT=inquiry-ip-salt:latest \
  --memory 768Mi --cpu 1 --min-instances 0 --max-instances 2
```

Notes
- `--allow-unauthenticated` is needed so Firebase Hosting can reach it; the app enforces Auth0 JWTs itself.
- Replace the issuer domain with your real Auth0 tenant (must end with `/`, must be https) and the audience with the API identifier used by the UI.
- The read-only volume must stay read-only: the app never writes in hybrid mode (capture/renderer paths are off).
- Flyway runs on startup with `baseline-on-migrate` at version 8. If the DB was created from `scripts/supabase_init.sql`, it is baselined at V8 and only V9+ apply. The DB user needs DDL rights for future migrations (or set `DB_MIGRATION_USERNAME` / `DB_MIGRATION_PASSWORD`).
- To update only config later: `gcloud run services update $SERVICE --region $REGION --update-env-vars KEY=VALUE`.

## 5. Verify

```sh
URL=$(gcloud run services describe $SERVICE --region $REGION --format='value(status.url)')
curl -s $URL/api/health
curl -si $URL/api/resume | head -1                 # expect 401
curl -si https://<your-hosting-domain>/api/health  # expect 200 through Firebase rewrite
```

Then sign in on the site and open the resume: expect 200 application/pdf (503 means the bucket object or mount is missing).

## Enabling contact API later (optional)

Set `CONTACT_ENABLED=true NOTIFICATIONS_ENABLED=true EMAIL_MODE=provider` plus `EMAIL_KEY`, `EMAIL_RECIPIENT`, `EMAIL_FROM` (secrets), and a verified sender. Startup fails if contact is enabled with capture mode, notifications off, or a salt shorter than 16 chars. Client IP is taken from `X-Forwarded-For` (`server.forward-headers-strategy=framework`).
