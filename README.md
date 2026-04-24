<div align="center">
  <img width="1200" height="475" alt="Steel - Smart Stridsledning banner" src="./public/steel-banner.svg" />
</div>

# Steel - Smart Stridsledning

Steel - Smart Stridsledning is the deployment-ready Angular SSR command surface prepared from the prior workstream as a standalone repo for Cloud Run deployment. It keeps the decision-support UI, server entry points, and deploy scripts in one clean package.

## What’s Included

- Angular 21 SSR application with the existing operational surfaces
- Dockerfile for container builds
- Cloud Run deployment script for `europe-north2`
- Static assets and favicon in `public/`

## What’s Not Included

- Research notes, planning material, and other non-deployable artifacts
- Local secrets such as `.env`

## Deployment

### Prerequisites

- `gcloud` authenticated and pointing at the right project
- A billing-enabled GCP project
- Cloud Run and Artifact Registry access in that project

### Deploy

```bash
chmod +x deploy/gcp/deploy.sh
PROJECT_ID=your-project-id deploy/gcp/deploy.sh
```

If `PROJECT_ID` is already set in your local `gcloud` config, you can omit it.

## Local Development

```bash
npm install
npm run dev
```

The app starts on [http://localhost:3000](http://localhost:3000).

## Useful Scripts

```bash
npm run build
npm run test
npm run lint
npm run serve:ssr:app
```

## Notes

- The Cloud Run deployment is configured for a single instance with WebSocket support.
- Optional OpenRouter-backed rationale generation can be enabled with `OPENROUTER_API_KEY`.
- The live repo is intended to be copied into a fresh GitHub repository as-is.
