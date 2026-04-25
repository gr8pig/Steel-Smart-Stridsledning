# Steel

**Smart Stridsledning | Command Support Fabric**

Steel is the production-ready decision support surface for the Boreal Decision Twin (BDT) environment. It provides a real-time, signal-based interface for complex air defense orchestration.

---

## Capabilities

* **Command Resilience Fabric**: Monitors cognitive load, authority friction, and decision trust—projecting potential failure horizons.
* **Stochastic Analysis Lab**: Stress-tests Courses of Action (COA) using Monte Carlo simulations and ML-surrogate outcome modeling.
* **Real-Time Theater Feed**: Low-latency, WebSocket-driven tactical updates.
* **Audit & Governance**: Comprehensive system-wide logging for every decision transition and authority override.

---

## Architecture

Steel utilizes a distributed architecture optimized for low-latency decision support:

* **Frontend**: Angular 21 (SSR) with Signal-based state management.
* **Backend**: Python FastAPI serving tactical simulation and ML inference workers.
* **Communication**: WebSocket protocol for real-time theaters.

---

## Setup & Deployment

### Development
```bash
npm install
cp .env.example .env
npm run dev
```

### Deployment
Steel is packaged for containerized deployment via Google Cloud Run.
```bash
./deploy/gcp/deploy.sh
```

---

## Governance
This system is an **operational support prototype**. While it integrates real-time theater state, all COA recommendations must be validated through authorized human-in-the-loop (HITL) procedures. System status shifts (e.g., resilience degradation) are captured in the immutable audit log for operational review.


