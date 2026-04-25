export type ReferenceStatus = 'implemented' | 'mock-simulation' | 'partial' | 'conceptual';

export interface ReferenceSourceAnchor {
  label: string;
  path: string;
  note: string;
}

export interface ReferenceSection {
  title: string;
  summary: string;
  bullets: string[];
}

export interface ReferenceGraphNode {
  x: number;
  y: number;
  links: string[];
}

export interface ReferenceDoc {
  slug: string;
  order: number;
  title: string;
  route: string;
  status: ReferenceStatus;
  summary: string;
  graph: ReferenceGraphNode;
  sources: ReferenceSourceAnchor[];
  sections: ReferenceSection[];
  related: string[];
}

function makeDoc(doc: Omit<ReferenceDoc, 'route'>): ReferenceDoc {
  return {
    ...doc,
    route: `/reference/${doc.slug}`,
  };
}

export const REFERENCE_DOCS: ReferenceDoc[] = [
  makeDoc({
    slug: '00-index',
    order: 0,
    title: 'Documentation Backbone',
    status: 'conceptual',
    summary: 'The index page that defines the docs backbone, publication stance, and safety framing for the BDT reference graph.',
    graph: { x: 560, y: 120, links: ['01-product-overview', '03-information-architecture', '10-deployment-operations', '11-known-gaps-roadmap', '12-documentation-style-guide'] },
    sources: [
      { label: 'README', path: 'README.md', note: 'Current repo description and scope framing.' },
      { label: 'Feature pack', path: 'bdt_merged_feature_knowledge_pack/00-index.md', note: 'Repo-grounded implementation pack index.' },
      { label: 'App routes', path: 'src/app/app.routes.ts', note: 'Current route surface that the docs should describe truthfully.' },
    ],
    sections: [
      {
        title: 'Purpose',
        summary: 'This page is the contract for the documentation system: describe BDT from the code outward, not from aspirational architecture inward.',
        bullets: [
          'Use the app shell, stores, services, and route surfaces as the source of truth.',
          'Keep the BDT docs graph aligned with the actual Angular/SSR repo structure.',
          'Treat mismatches with the boreal-info-arch backbone as status downgrades, not as implementation claims.',
        ],
      },
      {
        title: 'Publication stance',
        summary: 'The docs use four labels so readers can tell implemented behavior from seeded simulation and concept work.',
        bullets: [
          'Implemented: present in routes, stores, services, or server logic.',
          'Mock-simulation: present but backed by synthetic or seed data.',
          'Partial: real code exists, but the full flow is not end-to-end.',
          'Conceptual: useful framing only, with no direct runtime equivalent.',
        ],
      },
      {
        title: 'Safety and accuracy',
        summary: 'BDT should be documented as a decision-support prototype, not as a verified operational command system.',
        bullets: [
          'Avoid claiming real-world Swedish system parity unless the repo explicitly maps it.',
          'Document the limits of mock state, in-memory flows, and fallback logic.',
          'Prefer exact route names, types, and files over broad capability claims.',
        ],
      },
    ],
    related: ['01-product-overview', '03-information-architecture', '11-known-gaps-roadmap'],
    }),
    makeDoc({
    slug: '01-product-overview',
    order: 1,
    title: 'Product Overview',
    status: 'partial',
    summary: 'A truthful summary of BDT as a routed Angular SSR command-surface with strong UI, signal-backed state, and still-partial backend execution.',
    graph: { x: 240, y: 250, links: ['00-index', '02-feature-catalog', '04-system-architecture'] },
    sources: [
      { label: 'README', path: 'README.md', note: 'Current product framing and scope language.' },
      { label: 'Mission overview', path: 'src/app/features/mission-overview.ts', note: 'Current overview surface in the app.' },
      { label: 'App shell', path: 'src/app/app.html', note: 'Global chrome that wraps every route.' },
    ],
    sections: [
      {
        title: 'What BDT is',
        summary: 'BDT is already more than a mockup: it has real routes, a shared shell, Signal-based stores, and live-style decision surfaces.',
        bullets: [
          'Angular 21 + SSR + Express app shell.',
          'Operational views for overview, tactical, commander, readiness, logistics, robustness, governance, demo, and KGSA.',
          'Stateful flows for tracks, bases, policies, COAs, audit logs, and scenario control.',
        ],
      },
      {
        title: 'What BDT is not',
        summary: 'The repo is not a fully validated operational C2 system and not a full real-world order-of-battle simulator.',
        bullets: [
          'Several backend seams are still partial or fallback-driven.',
          'Some routes are strong UI but still rely on seed data or local heuristics.',
          'Abstract capability classes are intentional and should not be renamed into verified platform claims.',
        ],
      },
      {
        title: 'Primary users',
        summary: 'The product story already supports the roles the app surfaces in the chrome and route names.',
        bullets: [
          'Commander and decision authority.',
          'Tactical operator and engagement reviewer.',
          'Readiness, logistics, analyst, and governance users.',
        ],
      },
    ],
    related: ['02-feature-catalog', '04-system-architecture', '10-deployment-operations'],
  }),
  makeDoc({
    slug: '02-feature-catalog',
    order: 2,
    title: 'Feature Catalog',
    status: 'partial',
    summary: 'A route-by-route catalog of what is already built, what is mock-backed, and what is still thin in the BDT app.',
    graph: { x: 180, y: 430, links: ['01-product-overview', '03-information-architecture', '05-domain-models', '06-math-logic'] },
    sources: [
      { label: 'App routes', path: 'src/app/app.routes.ts', note: 'Actual route table in the app.' },
      { label: 'Nav rail', path: 'src/app/shared/ui/nav-rail.ts', note: 'What the operator can actually reach from the chrome.' },
      { label: 'Command bar', path: 'src/app/shared/ui/command-bar.ts', note: 'Top-bar route edge into the resilience fabric.' },
      { label: 'Capability layer switch', path: 'src/app/shared/ui/capability-layer-switch.ts', note: 'Public capability remapping control in the command bar.' },
      { label: 'Capability layer store', path: 'src/app/core/state/capability-layer.store.ts', note: 'Cross-domain track remapping and audit logging.' },
      { label: 'C2 resilience lab', path: 'src/app/features/c2-resilience-lab.ts', note: 'Route-level resilience view backed by the decision fabric store.' },
      { label: 'Knowledge graph', path: 'src/app/features/knowledge-graph.ts', note: 'Route-level KGSA and platform-map surface.' },
      { label: 'Counterfactual lab', path: 'src/app/features/counterfactual-lab.ts', note: 'Policy perturbation lab with an external ML endpoint dependency.' },
      { label: 'Counterfactual lab store', path: 'src/app/core/ml/counterfactual-lab.store.ts', note: 'Local state for trajectory, trust, and perturbations.' },
      { label: 'Sensor feed store', path: 'src/app/core/state/sensor-feed.store.ts', note: 'Live/mock/replay theater feed adapter.' },
      { label: 'Audit logger', path: 'src/app/core/services/audit-logger.ts', note: 'Shared audit sink for route and store actions.' },
      { label: 'Sensor adapter', path: 'src/app/core/services/sensor-adapter.ts', note: 'Mock, replay, and live feed adapters.' },
      { label: 'Research plan', path: 'research/BDT_Master_Plan.md', note: 'Earlier implementation breakdown and feature intent.' },
    ],
    sections: [
      {
        title: 'Implemented route surfaces',
        summary: 'These views already exist as first-class route-level screens.',
        bullets: [
          'Mission overview, tactical, commander, readiness, governance, demo director, logistics, field, threat inspector, counterfactual lab, knowledge graph, and C2 resilience.',
          'App-level shell with nav rail, command bar, rationale drawer, and planned capability modal.',
          'Public capability remapping is available through the capability layer switch and is audit logged.',
          'Signal-backed stores for policy, tactical, readiness, orchestration, scenario, logistics, map layer, KGSA, and decision fabric.',
          'Chrome edges into `/knowledge-graph` and `/c2-resilience` are visible in the nav rail and command bar.',
        ],
      },
      {
        title: 'Partial or mock-backed behavior',
        summary: 'Several features are present but still rely on local heuristics, seed data, or back-end fallbacks.',
        bullets: [
          'Public capability layer is implemented as a live remapping switch over synthetic tracks and public-source cards.',
          'Knowledge graph situation awareness is now a first-class platform map with seed-backed data where the repo still needs it.',
          'Robustness lab and counterfactual flows are useful but not fully productionized.',
          'Counterfactual lab currently calls an ML endpoint, and the repo-root `api/ml` and `scripts/ml` trees provide inference, RunPod orchestration, training, and cleanup code.',
          'C2 resilience is a heuristic prototype that computes a score and collapse horizon from track and policy state.',
          'Solver, rationale, and sensor/feed seams exist but should be described conservatively.',
        ],
      },
      {
        title: 'Documentation rule',
        summary: 'The catalog should describe surfaces the repo can prove today, not just planned capability names.',
        bullets: [
          'Use route, store, and service names directly.',
          'Note when a feature is mock-simulation or partial.',
          'Avoid collapsing the whole repo into a single generic “command center” label.',
        ],
      },
    ],
    related: ['03-information-architecture', '05-domain-models', '08-sweden-risk-profile'],
  }),
  makeDoc({
    slug: '03-information-architecture',
    order: 3,
    title: 'Information Architecture',
    status: 'conceptual',
    summary: 'The original documentation site map is useful, but the actual app has a much flatter route tree than the backbone implies.',
    graph: { x: 320, y: 610, links: ['00-index', '02-feature-catalog', '04-system-architecture', '11-known-gaps-roadmap'] },
    sources: [
      { label: 'Nav rail', path: 'src/app/shared/ui/nav-rail.ts', note: 'Real operator navigation in the BDT shell.' },
      { label: 'Routes', path: 'src/app/app.routes.ts', note: 'Actual route tree exposed by the app.' },
      { label: 'Reference graph', path: 'src/app/features/reference/reference.routes.ts', note: 'This new docs subtree becomes the truthful IA for the docs themselves.' },
    ],
    sections: [
      {
        title: 'Current truth',
        summary: 'BDT has an operational route set, but not the broad multi-page documentation site described in the backbone.',
        bullets: [
          'The app has a real top-level shell and route list.',
          'The reference docs are now the place to describe route structure accurately.',
          'The information architecture in docs should reflect the built product, not the aspirational site map.',
        ],
      },
      {
        title: 'User journeys',
        summary: 'The intended journeys still help explain the product, even when the underlying surface is more compact.',
        bullets: [
          'Commander reviews policy, COAs, and published intent.',
          'Tactical operator inspects tracks and engages or escalates.',
          'Analyst pushes uncertain cases into the lab or KGSA.',
        ],
      },
      {
        title: 'Documentation rule',
        summary: 'Treat the backbone diagram as a navigation model for the docs, not as a claim about already shipped app routes.',
        bullets: [
          'Use it to structure the reference section.',
          'Do not infer extra route surfaces that are not in `app.routes.ts`.',
          'Prefer a graph of implemented surfaces plus conceptual appendices.',
        ],
      },
    ],
    related: ['00-index', '02-feature-catalog', '04-system-architecture'],
  }),
  makeDoc({
    slug: '04-system-architecture',
    order: 4,
    title: 'System Architecture',
    status: 'partial',
    summary: 'Angular SSR, Express, Signals, WebSocket state, and server-auth seams are real, but the full runtime story remains incomplete.',
    graph: { x: 530, y: 270, links: ['01-product-overview', '03-information-architecture', '05-domain-models', '10-deployment-operations'] },
    sources: [
      { label: 'Server', path: 'src/server.ts', note: 'Express + SSR + WebSocket entrypoint.' },
      { label: 'App config', path: 'src/app/app.config.ts', note: 'Browser-side providers and hydration setup.' },
      { label: 'API service', path: 'src/app/core/services/bdt-api.service.ts', note: 'REST seam expected by the client.' },
      { label: 'WebSocket service', path: 'src/app/core/services/theater-ws.service.ts', note: 'Theater feed client seam.' },
      { label: 'Capability layer store', path: 'src/app/core/state/capability-layer.store.ts', note: 'Synthetic-to-public track remapping and audit logging.' },
      { label: 'Capability layer switch', path: 'src/app/shared/ui/capability-layer-switch.ts', note: 'Command-bar control for public capability modes.' },
      { label: 'Decision fabric store', path: 'src/app/core/state/decision-fabric.store.ts', note: 'C2 resilience score and collapse horizon state.' },
      { label: 'Command friction engine', path: 'src/app/core/sim/command-friction-engine.ts', note: 'Pure heuristic engine for resilience and collapse projection.' },
      { label: 'C2 resilience gauge', path: 'src/app/shared/ui/c2-resilience-gauge.ts', note: 'Route-level gauge UI for the resilience cluster.' },
      { label: 'Counterfactual lab', path: 'src/app/features/counterfactual-lab.ts', note: 'Policy perturbation lab that currently calls an external ML endpoint.' },
      { label: 'Counterfactual lab store', path: 'src/app/core/ml/counterfactual-lab.store.ts', note: 'Trajectory and trust state for the counterfactual lab.' },
      { label: 'ML inference', path: '../../api/ml/inference.py', note: 'NumPy ensemble inference for predicted trajectories.' },
      { label: 'RunPod orchestrator', path: '../../api/ml/runpod_client.py', note: 'RunPod submission wrapper for deep sim and training jobs.' },
      { label: 'ML types', path: '../../api/ml/types.py', note: 'State-vector and trajectory types used by the pipeline.' },
      { label: 'ML models', path: '../../api/ml/models.py', note: 'State-vector and trajectory data models for inference.' },
      { label: 'Training worker', path: '../../scripts/ml/train_worker.py', note: 'GCS-backed LightGBM training worker with timeout watchdog.' },
      { label: 'Preemption cleanup', path: '../../scripts/ml/cleanup_preempted.py', note: 'SIGTERM cleanup path that flushes and uploads results.' },
      { label: 'KGSA store', path: 'src/app/core/state/kgsa.store.ts', note: 'In-memory graph store with nodes, edges, hypotheses, and weak signals.' },
      { label: 'KGSA domain', path: 'src/app/shared/domain/kgsa.ts', note: 'Typed graph model and seed data for situation awareness.' },
      { label: 'Sensor feed store', path: 'src/app/core/state/sensor-feed.store.ts', note: 'Adapter coordinator for live, mock, and replay theater frames.' },
      { label: 'Sensor adapter', path: 'src/app/core/services/sensor-adapter.ts', note: 'Concrete feed adapters behind the store.' },
      { label: 'Audit logger', path: 'src/app/core/services/audit-logger.ts', note: 'Shared event sink for operator and system actions.' },
      { label: 'ML inference', path: '../../api/ml/inference.py', note: 'NumPy ensemble inference for predicted trajectories.' },
      { label: 'RunPod orchestrator', path: '../../api/ml/runpod_client.py', note: 'RunPod submission wrapper for deep sim and training jobs.' },
      { label: 'ML types', path: '../../api/ml/types.py', note: 'State-vector and trajectory types used by the pipeline.' },
      { label: 'ML models', path: '../../api/ml/models.py', note: 'State-vector and trajectory data models for inference.' },
      { label: 'Training worker', path: '../../scripts/ml/train_worker.py', note: 'GCS-backed LightGBM training worker with timeout watchdog.' },
      { label: 'Preemption cleanup', path: '../../scripts/ml/cleanup_preempted.py', note: 'SIGTERM cleanup path that flushes and uploads results.' },
    ],
    sections: [
      {
        title: 'Runtime layers',
        summary: 'The application is an SSR-first Angular app with signal stores feeding route-level consoles and service seams.',
        bullets: [
          'Browser UI -> route components -> signal stores -> services -> SSR server.',
          'REST contracts for twin, policy, solver, lab, logistics, and rationale flows.',
          'WebSocket feed for theater updates and live base/tracks deltas.',
          'Route-level clusters for KGSA and C2 resilience sit beside the tactical and commander consoles.',
          'The public capability layer remaps tracks onto public-source abstractions and lives in the shell chrome.',
          'Sensor feed adapters can run live, replay, or synthetic modes while keeping the store contract stable.',
          'The ML pipeline spans frontend counterfactual orchestration plus repo-root Python modules for inference, orchestration, training, and cleanup.',
        ],
      },
      {
        title: 'State model',
        summary: 'Most of the product behavior lives in stores rather than in a deep service hierarchy.',
        bullets: [
          'Scenario, tactical, policy, readiness, logistics, lab, orchestration, and map-layer stores.',
          'In-memory and seed-backed flows are still important in the current build.',
          'The server and stores together form the execution spine for demo and prototype use.',
          'The KGSA store manages nodes, edges, hypotheses, and weak signals in memory, while the decision fabric store derives resilience from tactical and policy state.',
          'The capability layer store remaps tracks to public-source cards and logs every mode or override change.',
          'The sensor feed store arbitrates the live/mock/replay adapters that feed tactical state and scenario time.',
          'The audit logger captures the important state transitions used by tactical, policy, KGSA, and decision fabric flows.',
          'The Python ML workers support the counterfactual lab and deep-sim pipeline at the BDT root, not inside the Angular subrepo.',
        ],
      },
      {
        title: 'C2 and KGSA edges',
        summary: 'Two recent clusters make the route graph more concrete: resilience and knowledge graph awareness.',
        bullets: [
          '`/c2-resilience` -> `DecisionFabricStore` -> `CommandFrictionEngine` -> `C2ResilienceGaugeComponent`.',
          '`/knowledge-graph` -> `KgsaStore` -> `KgsaNode` / `KgsaEdge` / `KgsaHypothesis`.',
          '`SensorFeedStore` -> `TheaterWsService` / `SensorAdapter` -> `TacticalStore`.',
          '`AuditLogger` captures tactical, policy, KGSA, and feed-mode mutations.',
          'The command bar and nav rail both point to the new resilience surface.',
        ],
      },
      {
        title: 'Truth boundary',
        summary: 'Document the implementation as partial where the API and web-socket seams exist but not every production concern is fully solved.',
        bullets: [
          'Single-instance and demo-oriented assumptions remain relevant.',
          'Authentication and lock behavior are present in the server.',
          'State externalization and production hardening are not yet the same thing as runtime existence.',
        ],
      },
    ],
    related: ['05-domain-models', '06-math-logic', '10-deployment-operations'],
  }),
  makeDoc({
    slug: '05-domain-models',
    order: 5,
    title: 'Domain Models',
    status: 'partial',
    summary: 'The repo has a usable model layer, but it is split across several files and only some abstractions are fully wired into runtime behavior.',
    graph: { x: 760, y: 250, links: ['04-system-architecture', '06-math-logic', '07-swedish-doctrine-grounding', '09-simulated-forces-and-systems'] },
    sources: [
      { label: 'Core models', path: 'src/app/shared/domain/models.ts', note: 'Primary operational twins and map features.' },
      { label: 'Public capability layer', path: 'src/app/shared/domain/public-capability.ts', note: 'Public-facing abstraction mapping.' },
      { label: 'Public capability seed', path: 'src/app/shared/domain/public-capability.seed.ts', note: 'Saab, NATO, and archetype examples used by the switch.' },
      { label: 'Decision fabric', path: 'src/app/shared/domain/decision-fabric.ts', note: 'Resilience and friction model.' },
      { label: 'KGSA model', path: 'src/app/shared/domain/kgsa.ts', note: 'Knowledge graph schema and seed data.' },
      { label: 'Logistics ontology', path: 'src/app/shared/domain/logistics-ontology.ts', note: 'Supply and corridor model.' },
      { label: 'C2 resilience lab', path: 'src/app/features/c2-resilience-lab.ts', note: 'Consumer of the decision fabric twin.' },
      { label: 'Knowledge graph route', path: 'src/app/features/knowledge-graph.ts', note: 'Consumer of the KGSA graph model and platform manifest.' },
    ],
    sections: [
      {
        title: 'Core twins',
        summary: 'The main operational objects are already defined and used across the app.',
        bullets: [
          'ThreatTwin, BaseTwin, PolicyTwin, COATwin, EffectorTwin, SensorTwin, MapFeature, and ScenarioPhase.',
          'These models already carry the fields needed for the current routes and stores.',
          'The docs should call these out directly instead of collapsing them into generic simulation language.',
        ],
      },
      {
        title: 'Extended model surface',
        summary: 'The repo also contains documentation-friendly abstractions for public capability, decision fabric, KGSA, and logistics.',
        bullets: [
          'Public capability cards and layer modes, including Saab GlobalEye and Saab Giraffe 1X public mappings.',
          'Decision fabric resilience and friction pulses.',
          'Knowledge graph nodes, edges, hypotheses, and weak signals.',
          'The C2 resilience lab turns the decision fabric twin into a route-level operational display.',
          'The knowledge graph route turns the in-memory KGSA seed data and platform manifest into an analyst-facing graph view.',
        ],
      },
      {
        title: 'Documentation rule',
        summary: 'The model layer is real enough to document in detail, but should still be described as a prototype model, not as a production ontology.',
        bullets: [
          'Keep file-level model anchors visible.',
          'Note where objects are seed-backed or mock backed.',
          'Avoid implying a hidden database schema that is not present in the repo.',
        ],
      },
    ],
    related: ['04-system-architecture', '06-math-logic', '09-simulated-forces-and-systems'],
  }),
  makeDoc({
    slug: '06-math-logic',
    order: 6,
    title: 'Mathematics and Logic',
    status: 'partial',
    summary: 'BDT uses explainable heuristics, posterior-style intent estimation, and fallback-heavy solver logic rather than a fully formal optimizer.',
    graph: { x: 980, y: 420, links: ['05-domain-models', '07-swedish-doctrine-grounding', '08-sweden-risk-profile', '11-known-gaps-roadmap'] },
    sources: [
      { label: 'Intent estimator', path: 'src/app/core/services/intent-estimator.service.ts', note: 'Posterior update over track features.' },
      { label: 'Policy store', path: 'src/app/core/state/policy.store.ts', note: 'Debounced COA solve and fallback logic.' },
      { label: 'Lab store', path: 'src/app/core/state/lab.store.ts', note: 'Robustness result storage and heatmap.' },
      { label: 'BDT API service', path: 'src/app/core/services/bdt-api.service.ts', note: 'Solver, lab, and rationale contracts.' },
      { label: 'Command friction engine', path: 'src/app/core/sim/command-friction-engine.ts', note: 'Resilience weighting and collapse projection heuristics.' },
    ],
    sections: [
      {
        title: 'Policy-weighted COA reasoning',
        summary: 'The commander policy already steers the COA choice through explicit weights and guardrails.',
        bullets: [
          'Safety, sustainability, and resilience are the primary weights.',
          'Guardrails shape what counts as an acceptable recommendation.',
          'The current implementation is explainable and useful, but not a formal optimization proof.',
        ],
      },
      {
        title: 'Intent estimation',
        summary: 'Track intent is updated with a lightweight posterior-style method driven by observable kinematics and confidence.',
        bullets: [
          'The estimator uses Gaussian-like scoring over velocity, time-to-target, and confidence.',
          'Backend-provided intent distributions override the local estimate when available.',
          'This is intentionally interpretable rather than mathematically maximal.',
        ],
      },
      {
        title: 'Robustness and lab heuristics',
        summary: 'The lab and its heatmap are useful decision aids, but the docs should distinguish synthetic sampling from validated Monte Carlo.',
        bullets: [
          'The lab stores fragility points, robustness scores, and failure heatmaps.',
          'Fallback COAs exist when the backend is unavailable.',
          'Document the heuristics plainly so the limitation is obvious to readers.',
          'The C2 resilience heuristic uses weighted trust, tempo, cognitive, and audit terms rather than a formal optimizer.',
        ],
      },
    ],
    related: ['05-domain-models', '08-sweden-risk-profile', '11-known-gaps-roadmap'],
  }),
  makeDoc({
    slug: '07-swedish-doctrine-grounding',
    order: 7,
    title: 'Swedish Doctrine Grounding',
    status: 'conceptual',
    summary: 'The repository supports Swedish functional doctrine mapping, but the wording belongs in a conceptual appendix rather than as a verified doctrine claim.',
    graph: { x: 920, y: 610, links: ['05-domain-models', '06-math-logic', '08-sweden-risk-profile', '09-simulated-forces-and-systems'] },
    sources: [
      { label: 'README', path: 'README.md', note: 'Safe framing and product language.' },
      { label: 'Doctrine mapping guidance', path: 'bdt_merged_feature_knowledge_pack/06-task-governance-safety-and-verification.md', note: 'Earlier review and wording constraints.' },
      { label: 'Knowledge graph seed', path: 'src/app/shared/domain/kgsa.ts', note: 'Conceptual doctrine terms show up as graph labels, not as operational doctrine enforcement.' },
    ],
    sections: [
      {
        title: 'Functional mapping',
        summary: 'The docs can map BDT to command, intelligence, protection, fires, movement, sustainment, and civil-military continuity.',
        bullets: [
          'Mission command and delegated execution.',
          'Total defence and resilience as a planning lens.',
          'Air defence as a detect-classify-decide-assign-explain chain.',
        ],
      },
      {
        title: 'Limits',
        summary: 'This is a documentation mapping, not an official Swedish Armed Forces doctrine package.',
        bullets: [
          'Do not claim verified doctrinal fidelity without external source review.',
          'Do not treat seed graph labels as doctrine enforcement.',
          'Keep the language calm, precise, and caveated.',
        ],
      },
    ],
    related: ['06-math-logic', '08-sweden-risk-profile', '12-documentation-style-guide'],
  }),
  makeDoc({
    slug: '08-sweden-risk-profile',
    order: 8,
    title: 'Sweden Risk Profile',
    status: 'conceptual',
    summary: 'The risk-profile page is a scenario and narrative guide for the kinds of threats BDT models, not a live intelligence assessment.',
    graph: { x: 1060, y: 760, links: ['02-feature-catalog', '06-math-logic', '09-simulated-forces-and-systems', '10-deployment-operations'] },
    sources: [
      { label: 'Scenario store', path: 'src/app/core/state/scenario.store.ts', note: 'Scenario phase and jamming state.' },
      { label: 'Tactical store', path: 'src/app/core/state/tactical.store.ts', note: 'Threat classes, track counts, and intent enrichment.' },
      { label: 'Logistics store', path: 'src/app/core/state/logistics.store.ts', note: 'Sustainment and corridor framing.' },
      { label: 'Mission overview', path: 'src/app/features/mission-overview.ts', note: 'Theater summary and readiness framing.' },
    ],
    sections: [
      {
        title: 'Threat families',
        summary: 'BDT already maps well to the main threat families the backbone described.',
        bullets: [
          'Air and missile threats.',
          'Drone, decoy, and saturation threats.',
          'Electronic warfare and degraded sensing.',
          'Infrastructure pressure and logistics constraints.',
        ],
      },
      {
        title: 'Why it stays conceptual',
        summary: 'The repo models synthetic threat classes and scenario flows, not live country risk intelligence.',
        bullets: [
          'The page should describe decision stress, not current classified posture.',
          'Use public, non-sensitive language.',
          'Call out synthetic behavior when the scenario is seeded rather than observed.',
        ],
      },
    ],
    related: ['02-feature-catalog', '07-swedish-doctrine-grounding', '09-simulated-forces-and-systems'],
  }),
  makeDoc({
    slug: '09-simulated-forces-and-systems',
    order: 9,
    title: 'Simulated Forces and Weapon-System Abstractions',
    status: 'mock-simulation',
    summary: 'BDT explicitly models abstract capability classes and seeded synthetic examples rather than verified real-world Swedish systems.',
    graph: { x: 760, y: 830, links: ['05-domain-models', '08-sweden-risk-profile', '10-deployment-operations', '11-known-gaps-roadmap'] },
    sources: [
      { label: 'Domain models', path: 'src/app/shared/domain/models.ts', note: 'Abstract classes for threats, bases, sensors, and effectors.' },
      { label: 'Map data', path: 'src/app/shared/domain/engagement-map.data.ts', note: 'Seeded locations and terrain for the theater map.' },
      { label: 'README', path: 'README.md', note: 'Explicit warning about abstract capability classes.' },
    ],
    sections: [
      {
        title: 'Blue-force abstractions',
        summary: 'The repo models capability families rather than named real-world platform instances.',
        bullets: [
          'Short, mid, and long interceptor inventory classes.',
          'Abstract sensor families such as radar, SIGINT, and EO/IR.',
          'Effector and base models that are useful for decision support.',
        ],
      },
      {
        title: 'Synthetic examples',
        summary: 'The repo includes seeded bases, terrain, and graph nodes that make the app readable in demo mode.',
        bullets: [
          'Bases and locations are synthetic or generalized.',
          'KGSA seed nodes and edges are illustrative.',
          'The docs should clearly say mock-simulation when that is what the repo actually ships.',
        ],
      },
    ],
    related: ['05-domain-models', '08-sweden-risk-profile', '10-deployment-operations'],
  }),
  makeDoc({
    slug: '10-deployment-operations',
    order: 10,
    title: 'Deployment and Operations',
    status: 'partial',
    summary: 'The repo has real deployment scaffolding, SSR, and same-origin assumptions, but still carries prototype constraints.',
    graph: { x: 530, y: 840, links: ['00-index', '04-system-architecture', '09-simulated-forces-and-systems', '11-known-gaps-roadmap', '12-documentation-style-guide'] },
    sources: [
      { label: 'Dockerfile', path: 'Dockerfile', note: 'Container runtime for the app.' },
      { label: 'GCP deploy script', path: 'deploy/gcp/deploy.sh', note: 'Cloud Run deployment scaffold.' },
      { label: 'GCP README', path: 'deploy/gcp/README.md', note: 'Operational notes for deployment.' },
      { label: 'Server', path: 'src/server.ts', note: 'SSR + lock/auth + WebSocket runtime entrypoint.' },
      { label: 'Package scripts', path: 'package.json', note: 'Start, dev, build, and SSR scripts.' },
    ],
    sections: [
      {
        title: 'Current baseline',
        summary: 'The app is designed for same-origin deployment with SSR and a single server boundary.',
        bullets: [
          'Angular SSR serves the app and the docs route tree.',
          'The server exposes lock and access behavior.',
          'WebSocket and API assumptions are visible in the app, even where some flows remain demo-oriented.',
        ],
      },
      {
        title: 'Operational caveat',
        summary: 'This is a solid deployment story for a prototype, not yet the final production hardening story.',
        bullets: [
          'State persistence and scale-out remain important future work.',
          'The docs should avoid claiming more operational maturity than the repo proves.',
          'Single-instance assumptions matter for correctness today.',
        ],
      },
    ],
    related: ['04-system-architecture', '11-known-gaps-roadmap', '12-documentation-style-guide'],
  }),
  makeDoc({
    slug: '11-known-gaps-roadmap',
    order: 11,
    title: 'Known Gaps and Roadmap',
    status: 'conceptual',
    summary: 'This page is the honest gap list: what is missing, what is partial, and what should be built next.',
    graph: { x: 260, y: 750, links: ['00-index', '04-system-architecture', '09-simulated-forces-and-systems', '12-documentation-style-guide'] },
    sources: [
      { label: 'README', path: 'README.md', note: 'Current repo-state narrative and limitations.' },
      { label: 'Master plan', path: 'research/BDT_Master_Plan.md', note: 'Older implementation plan and explicit gaps.' },
      { label: 'Scope cuts', path: 'research/files/BDT_Scope_Cuts.md', note: 'Deferred feature list and reasoning.' },
      { label: 'Counterfactual lab', path: 'src/app/features/counterfactual-lab.ts', note: 'Frontend lab that currently calls an external ML endpoint.' },
    ],
    sections: [
      {
        title: 'Current gaps',
        summary: 'The repo still has partial backend execution, thin gaps around some routes, and mock/synthetic layers that should remain clearly labeled.',
        bullets: [
          'Some flows are still fallback or seed-driven.',
          'The repo-root `api/ml` and `scripts/ml` trees now provide the counterfactual and training backend modules.',
          'Production durability and persistence are not yet the main truth of the system.',
          'KGSA and deployment deserve conservative wording unless the code proves otherwise.',
        ],
      },
      {
        title: 'Roadmap value',
        summary: 'This page is useful because it points directly to the next honest engineering steps.',
        bullets: [
          'State externalization and stronger runtime backing.',
          'Sharper solver and lab verification.',
          'More explicit route and graph integration if the docs surface evolves further.',
        ],
      },
    ],
    related: ['10-deployment-operations', '12-documentation-style-guide', '02-feature-catalog'],
  }),
  makeDoc({
    slug: '12-documentation-style-guide',
    order: 12,
    title: 'Documentation Style Guide',
    status: 'conceptual',
    summary: 'A compact style guide for keeping the BDT docs precise, calm, and honest about simulation boundaries.',
    graph: { x: 520, y: 760, links: ['00-index', '10-deployment-operations', '11-known-gaps-roadmap'] },
    sources: [
      { label: 'Style guide', path: 'boreal-info-arch/12-documentation-style-guide.md', note: 'Existing wording guide to preserve and refine.' },
      { label: 'README', path: 'README.md', note: 'Current product voice and limits.' },
      { label: 'Feature catalog', path: 'bdt_merged_feature_knowledge_pack/02-task-public-capability-layer.md', note: 'Earlier documentation style from the planning pack.' },
    ],
    sections: [
      {
        title: 'Voice',
        summary: 'Use precise, calm, operationally literate language.',
        bullets: [
          'Say what BDT models, exposes, or supports.',
          'Avoid hype, certainty theater, and claims of operational validation.',
          'State limitations directly when a flow is synthetic or partial.',
        ],
      },
      {
        title: 'Status labels',
        summary: 'The status label is part of the documentation contract, not a cosmetic badge.',
        bullets: [
          'Implemented, mock-simulation, partial, conceptual.',
          'Choose the label based on repo truth, not aspirational wording.',
          'Use the same labels across the graph, landing page, and article pages.',
        ],
      },
      {
        title: 'Feature page template',
        summary: 'The reference pages should stay structurally consistent, even when the content differs by status.',
        bullets: [
          'Status.',
          'Purpose.',
          'Inputs and outputs.',
          'Workflow.',
          'Data model.',
          'Math or logic.',
          'Doctrine mapping.',
          'Limitations and roadmap.',
        ],
      },
    ],
    related: ['00-index', '11-known-gaps-roadmap', '01-product-overview'],
  }),
];

export const REFERENCE_DOCS_BY_SLUG = new Map(REFERENCE_DOCS.map(doc => [doc.slug, doc] as const));

export const REFERENCE_STATUS_ORDER: ReferenceStatus[] = ['implemented', 'mock-simulation', 'partial', 'conceptual'];

export const REFERENCE_STATUS_LABELS: Record<ReferenceStatus, string> = {
  implemented: 'Implemented',
  'mock-simulation': 'Mock / Simulation',
  partial: 'Partial',
  conceptual: 'Conceptual',
};

export const REFERENCE_STATUS_CLASSES: Record<ReferenceStatus, string> = {
  implemented: 'border-boreal-green/30 bg-boreal-green/10 text-boreal-green',
  'mock-simulation': 'border-boreal-blue/30 bg-boreal-blue/10 text-boreal-blue',
  partial: 'border-boreal-amber/30 bg-boreal-amber/10 text-boreal-amber',
  conceptual: 'border-boreal-text-muted/30 bg-boreal-panel-muted/20 text-boreal-text-muted',
};

export function getReferenceDoc(slug: string): ReferenceDoc | undefined {
  return REFERENCE_DOCS_BY_SLUG.get(slug);
}

export function buildReferenceGraphEdges(docs: ReferenceDoc[]): Array<{ from: ReferenceDoc; to: ReferenceDoc }> {
  const seen = new Set<string>();
  const edges: Array<{ from: ReferenceDoc; to: ReferenceDoc }> = [];

  for (const doc of docs) {
    for (const linkedSlug of doc.graph.links) {
      const target = REFERENCE_DOCS_BY_SLUG.get(linkedSlug);
      if (!target) continue;
      const key = [doc.slug, target.slug].sort().join('::');
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from: doc, to: target });
    }
  }

  return edges;
}
