# Vobiz incoming calls: Phase 1

This change only returns a greeting and acknowledges hangup callbacks. There is no audio bridge, recording, database write, or telephone AI conversation.

## Provider configuration

In Vobiz, associate incoming number `+918064261743` with `VoiceAI-Incoming`:

- Answer URL: `https://voiceai.keylines.in/api/vobiz/answer`, method POST.
- Hangup URL: `https://voiceai.keylines.in/api/vobiz/hangup`, method POST.

The answer is HTTP 200, `application/xml`, with a `Response` root and a `Speak` element using `voice="WOMAN"` and `language="en-US"`. It speaks the requested greeting once. See the [official Speak specification](https://www.vobiz.ai/docs/xml/speak) and [XML lifecycle](https://www.vobiz.ai/docs/xml/overview/how-it-works).

## Signing configuration

Set these in **backend/.env**, not frontend or Python:

```dotenv
VOBIZ_VERIFY_SIGNATURES=true
VOBIZ_AUTH_TOKEN=YOUR_ACCOUNT_AUTH_TOKEN
VOBIZ_WEBHOOK_BASE_URL=https://voiceai.keylines.in/api/vobiz
```

Obtain the Auth Token from the Vobiz console for the account owning the application. Configure auth credentials on both callback URLs in Vobiz so it emits signature headers, and verify V3 delivery for both callback types with Vobiz if needed. This application expects the ordinary account V3 header; parent-account MA headers and V1/V2 fallback are deliberately not enabled.

Per the [official callback validation specification](https://www.vobiz.ai/docs/concepts/validating-callbacks), verification compares `X-Vobiz-Signature-V3` against base64(HMAC-SHA256(account Auth Token, public callback URL without query + "." + `X-Vobiz-Signature-V3-Nonce`)), using constant-time comparison. The nonce must have the documented 20-digit format. The configured public base URL avoids proxy scheme/host reconstruction errors; its exact path must match the URL in Vobiz. No Nginx change is needed.

Verification is required by default: missing token or invalid URL configuration returns 503; missing or invalid V3 headers return 403. Valid callbacks return 200. No live signing credentials or real signed callbacks have been verified by this implementation task.

If signing is not yet available and you explicitly want the Phase 1 greeting connectivity test, set `VOBIZ_VERIFY_SIGNATURES=false` temporarily and rebuild the config cache. In this mode **callbacks are unauthenticated**. Each acceptance logs that fact. Re-enable verification when provider signing is configured.

Vobiz's signature covers the URL and nonce, **not the body or query parameters**. Payload integrity and nonce replay prevention are not provided by this implementation. Retries are harmless in Phase 1 because these handlers do not persist or trigger actions. Do not use this implementation as authorization for future billing, call-record updates, or Phase 2 actions without revisiting these limits.

Only fixed endpoint names and verification outcomes are logged. Request bodies, call identifiers, IP addresses, phone numbers, names, headers, nonces, and secrets are never included in controller logs.

## Tests

From the repository root, with PHP 8.2+ and backend Composer dev dependencies installed:

```bash
cd backend
php artisan test --filter='VobizTest|ExotelTest'
```

The Vobiz tests use no database. Exotel tests use the existing PHPUnit in-memory SQLite configuration. Never run database-refreshing feature tests against a production database.

## Deploy manually from GitHub

Commit and push the reviewed changes to your GitHub deployment branch first. No deployment has been performed. The server username/IP and checkout path were not supplied; replace the two placeholders below with the existing server login and repository path. Run as the existing deployment user, using the existing PHP/Composer installation. These commands pull the currently checked-out branch from its configured GitHub upstream, and stop if the checkout is dirty or the update cannot fast-forward.

```bash
ssh DEPLOY_USER@DROPLET_IP
```

Then on the server:

```bash
set -eu
cd /ABSOLUTE/PATH/TO/ai-voice-agent
test -z "$(git status --porcelain)"
git remote get-url origin
git branch --show-current
git pull --ff-only
cd backend
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
nano .env
```

In the editor, add/update the three Vobiz settings above. Keep existing production settings, APP_KEY, and other provider credentials. Save and exit, then run:

```bash
php artisan config:cache
php artisan route:cache
php artisan route:list --path=api/vobiz
```

No migration, frontend build, FastAPI restart, or Nginx change is required. If the existing PHP-FPM deployment disables OPcache timestamp validation, reload the **existing** PHP-FPM service using your normal deployment procedure (service name was not supplied).

With verification enabled, an unsigned smoke request should return 403:

```bash
curl --silent --show-error --include --request POST https://voiceai.keylines.in/api/vobiz/answer
curl --silent --show-error --include --request POST https://voiceai.keylines.in/api/vobiz/hangup
```

If verification is explicitly disabled for connectivity testing, the same requests return 200 (answer XML / hangup JSON); this does not prove provider authentication. To complete the actual incoming-call test, call `+918064261743`, confirm the full greeting is audible, end the call, and confirm a hangup acceptance in `backend/storage/logs/laravel.log` (or the configured log destination). In signed mode both should report `signature verified`. A successful local feature test alone does not establish live Vobiz connectivity.
