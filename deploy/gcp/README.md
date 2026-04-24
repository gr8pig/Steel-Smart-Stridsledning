# GCP Stockholm Deployment Scaffold

This scaffold is for deploying the Angular SSR app to **Google Cloud Run in `europe-north2`**.
`europe-north2` is the Stockholm region, so the service stays on Swedish infrastructure.

## What This Deploys

- One container running the SSR Node server from this repo
- Same-origin `/api/*` and `/ws/theater` endpoints
- A single Cloud Run instance by default

## Why One Instance

The app keeps simulation state in memory and uses WebSockets.
That works best with:

- `min-instances=1`
- `max-instances=1`
- `concurrency=1`
- `cpu-throttling` disabled

That keeps the service predictable and avoids multi-instance state drift.

## Files

- [`Dockerfile`](../../Dockerfile)
- [`deploy.sh`](./deploy.sh)

## Prerequisites

- `gcloud` authenticated and pointing at the right project
- A billing-enabled GCP project
- Cloud Run and Artifact Registry access in the project

## Deploy

```bash
cd Steel-Smart-Stridsledning
chmod +x deploy/gcp/deploy.sh
PROJECT_ID=your-project-id deploy/gcp/deploy.sh
```

If `PROJECT_ID` is already set in your local `gcloud` config, you can omit it.

## Optional Runtime Secrets

The app can use `OPENROUTER_API_KEY` for live rationale generation.
For production, add that through Secret Manager or a Cloud Run secret binding rather than baking it into the image.

The lock page uses `APP_LOCK_PASSWORD`. The server falls back to the built-in password in the app, but you can override it at deploy time by setting the environment variable explicitly.

## Notes

- Cloud Run supports WebSockets.
- The service listens on `PORT=8080` in the container.
- If you later want a second backend service for `api/`, we can scaffold that separately.
