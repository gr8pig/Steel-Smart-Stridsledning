# Steel
**Smart Stridsledning | Command Support Fabric**

Steel is the production-ready decision support surface for the Steel Smart Stridsledning (SSS) environment. It provides a real-time, signal-based interface for complex air defense orchestration.

---

## Capabilities

* **Command Resilience Fabric**: Monitors cognitive load, authority friction, and decision trust—projecting potential failure horizons.
* **Stochastic Analysis Lab**: Stress-tests Courses of Action (COA) using Monte Carlo simulations and ML-surrogate outcome modeling.
* **Real-Time Theater Feed**: Low-latency, WebSocket-driven tactical updates.
* **Audit & Governance**: Comprehensive system-wide logging for every decision transition and authority override.

---

## Architecture & Data Flow

Steel utilizes a distributed architecture optimized for low-latency decision support:

* **Frontend**: Angular 21 (SSR) with Signal-based state management.
* **Backend**: Python FastAPI serving tactical simulation and ML inference workers.
* **Communication**: WebSocket protocol for real-time theaters.
* **Flow**: Browser UI → Angular Stores → REST/WebSocket Seams → SSR Server/FastAPI → Simulation/ML Workers.

---

## Setup & Deployment

### Development
```bash
npm install
cp .env.example .env
npm run dev
```

### Production Deployment
Steel is packaged for containerized deployment via Google Cloud Run:
```bash
# Execute GCP deployment script
./deploy/gcp/deploy.sh
```

### Environment Configuration
Secrets are managed via Cloud Run secret bindings or environment variables:
- `OPENROUTER_API_KEY`: Required for real-time rationale generation.
- `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID`: Required for remote lab inference.
- `APP_LOCK_PASSWORD`: Overrides the system lock password.
- `APP_LOCK_TOKEN_TTL_SECONDS`: Configures lock session lifetime.

---

## Operational Stance

* **State Persistence**: The application keeps state in-memory to ensure low-latency WebSocket performance. Horizontal scaling is not recommended.
* **Deployment Constraints**: Single-instance Cloud Run containers are required to prevent state drift.
* **Governance**: All resilience threshold shifts and authority changes are captured in the immutable audit log for operational review.
* **Production Caveat**: All system recommendations must be validated through authorized human-in-the-loop (HITL) procedures.

---

## Repository Layout

- `src/app/`: Angular frontend consoles, signal-based stores, and domain interfaces.
- `api/`: Python FastAPI service for simulation logic and ML workers.
- `deploy/`: Infrastructure-as-Code (IaC) and containerization scaffolds.
- `public/`: Branding, static assets, and favicon definitions.


