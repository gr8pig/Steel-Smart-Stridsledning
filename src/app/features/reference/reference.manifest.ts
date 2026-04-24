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
    summary: 'The Steel reference graph contract: describe the repo from its actual routes, shell, and runtime seams.',
    graph: { x: 560, y: 120, links: ['01-product-overview', '02-feature-catalog', '06-deployment-operations'] },
    sources: [
      { label: 'README', path: 'README.md', note: 'Canonical repo overview and runtime notes.' },
      { label: 'Routes', path: 'src/app/app.routes.ts', note: 'Actual route tree exposed by the app.' },
      { label: 'App shell', path: 'src/app/app.html', note: 'Global shell that wraps every feature route.' },
    ],
    sections: [
      {
        title: 'Purpose',
        summary: 'This page is the contract for the documentation system: describe Steel from the code outward, not from a marketing backbone inward.',
        bullets: [
          'Use routes, stores, services, and the server entrypoint as the source of truth.',
          'Keep the docs graph aligned with the actual Angular/SSR repo structure.',
          'Treat mismatches as status downgrades, not implementation claims.',
        ],
      },
      {
        title: 'Publication stance',
        summary: 'The docs use four labels so readers can distinguish real runtime behavior from seed data and design work.',
        bullets: [
          'Implemented: present in routes, stores, services, or server logic.',
          'Mock-simulation: present but driven by synthetic or seed data.',
          'Partial: real code exists, but the full flow is not end-to-end.',
          'Conceptual: useful framing only, with no direct runtime equivalent.',
        ],
      },
      {
        title: 'Safety and accuracy',
        summary: 'Steel should be documented as a deployable decision-support prototype, not as a verified operational command system.',
        bullets: [
          'Avoid claims about live national systems unless the repo explicitly maps them.',
          'Document the limits of mock state, in-memory flows, and fallback logic.',
          'Prefer exact route names, types, and files over broad capability claims.',
        ],
      },
    ],
    related: ['01-product-overview', '02-feature-catalog', '06-deployment-operations'],
  }),
  makeDoc({
    slug: '01-product-overview',
    order: 1,
    title: 'Product Overview',
    status: 'partial',
    summary: 'Steel is a routed Angular SSR command-surface with real server logic, signal-backed state, and a growing set of lab and reference views.',
    graph: { x: 240, y: 250, links: ['00-index', '02-feature-catalog', '03-command-resilience-model'] },
    sources: [
      { label: 'README', path: 'README.md', note: 'Current product framing and scope language.' },
      { label: 'Mission overview', path: 'src/app/features/mission-overview.ts', note: 'Primary overview surface in the app.' },
      { label: 'Server', path: 'src/server.ts', note: 'SSR + API entrypoint and backend rationale path.' },
    ],
    sections: [
      {
        title: 'What Steel is',
        summary: 'Steel is already more than a mockup: it has real routes, a shared shell, signal-based stores, and server-backed rationale/lab endpoints.',
        bullets: [
          'Angular SSR app with Express server rendering.',
          'Operational views for overview, tactical, commander, readiness, logistics, governance, robustness, C2 resilience, counterfactual, and reference.',
          'Stateful flows for tracks, bases, policies, COAs, audit logs, scenario control, and public capability remapping.',
        ],
      },
      {
        title: 'What Steel is not',
        summary: 'The repo is not a fully validated operational C2 system and not a real-world order-of-battle simulator.',
        bullets: [
          'Several backend seams are still heuristic or fallback-driven.',
          'Some routes are strong UI but still rely on seed data or local logic.',
          'Abstract capability classes are intentional and should not be renamed into verified platform claims.',
        ],
      },
      {
        title: 'Primary users',
        summary: 'The product story supports the roles surfaced in the chrome and route names.',
        bullets: [
          'Commander and decision authority.',
          'Tactical operator and engagement reviewer.',
          'Analyst, resilience operator, logistics, and governance users.',
        ],
      },
    ],
    related: ['02-feature-catalog', '03-command-resilience-model', '06-deployment-operations'],
  }),
  makeDoc({
    slug: '02-feature-catalog',
    order: 2,
    title: 'Feature Catalog',
    status: 'partial',
    summary: 'A route-by-route catalog of what is already built, what is heuristic, and what is still thin in the Steel app.',
    graph: { x: 180, y: 430, links: ['01-product-overview', '03-command-resilience-model', '04-public-capability-layer', '05-counterfactual-lab'] },
    sources: [
      { label: 'App routes', path: 'src/app/app.routes.ts', note: 'Actual route table in the app.' },
      { label: 'Nav rail', path: 'src/app/shared/ui/nav-rail.ts', note: 'What the operator can reach from the chrome.' },
      { label: 'Command bar', path: 'src/app/shared/ui/command-bar.ts', note: 'Top-bar route edge into the resilience fabric.' },
      { label: 'C2 resilience lab', path: 'src/app/features/c2-resilience-lab.ts', note: 'Route-level resilience view backed by the decision fabric store.' },
      { label: 'Counterfactual lab', path: 'src/app/features/counterfactual-lab.ts', note: 'Policy perturbation lab with local trajectory simulation in Steel.' },
      { label: 'Robustness lab', path: 'src/app/features/robustness-lab.ts', note: 'Monte Carlo stress surface that uses the server-backed lab path.' },
      { label: 'Knowledge graph', path: 'src/app/features/knowledge-graph.ts', note: 'Route-level KGSA view behind the feature flag gate.' },
      { label: 'Reference subtree', path: 'src/app/features/reference/reference.routes.ts', note: 'Nested documentation surface added in the cut-over.' },
    ],
    sections: [
      {
        title: 'Implemented route surfaces',
        summary: 'These views already exist as first-class route-level screens.',
        bullets: [
          'Mission overview, tactical, commander, readiness, governance, robustness lab, C2 resilience, counterfactual lab, reference, logistics, field, threat inspector, authority, and demo director.',
          'App shell with nav rail, command bar, rationale drawer, and planned capability modal.',
          'Public capability remapping is available through the capability layer switch and is audit logged.',
          'Signal-backed stores exist for policy, tactical, readiness, orchestration, scenario, logistics, map layer, KGSA, and decision fabric.',
        ],
      },
      {
        title: 'Partial or mock-backed behavior',
        summary: 'Several features are present but still rely on local heuristics, seed data, or fallback logic.',
        bullets: [
          'Knowledge graph situation awareness is seeded.',
          'Counterfactual lab uses a local synthetic inference model in the Steel cut-over.',
          'Robustness lab uses the server-backed lab path with Runpod fallback when configured.',
          'C2 resilience is a heuristic prototype that computes a score and collapse horizon from track and policy state.',
        ],
      },
      {
        title: 'Documentation rule',
        summary: 'The catalog should describe surfaces the repo can prove today, not just planned capability names.',
        bullets: [
          'Use route, store, and service names directly.',
          'Note when a feature is mock-simulation or partial.',
          'Avoid collapsing the whole repo into a generic command-center label.',
        ],
      },
    ],
    related: ['03-command-resilience-model', '04-public-capability-layer', '05-counterfactual-lab'],
  }),
  makeDoc({
    slug: '03-command-resilience-model',
    order: 3,
    title: 'Command Resilience Model',
    status: 'implemented',
    summary: 'The decision fabric and command friction engine turn live theater state into a resilience score and collapse horizon.',
    graph: { x: 370, y: 610, links: ['02-feature-catalog', '04-public-capability-layer', '05-counterfactual-lab', '06-deployment-operations'] },
    sources: [
      { label: 'Decision fabric store', path: 'src/app/core/state/decision-fabric.store.ts', note: 'Calculates c2 resilience, status, and projected collapse.' },
      { label: 'Command friction engine', path: 'src/app/core/sim/command-friction-engine.ts', note: 'Pure heuristic engine for resilience and collapse projection.' },
      { label: 'C2 resilience gauge', path: 'src/app/shared/ui/c2-resilience-gauge.ts', note: 'Route-level gauge UI for the resilience cluster.' },
      { label: 'Lab store', path: 'src/app/core/state/lab.store.ts', note: 'Provides failure probability input for the resilience score.' },
      { label: 'Robustness lab', path: 'src/app/features/robustness-lab.ts', note: 'Feeds the lab result that influences the fabric score.' },
    ],
    sections: [
      {
        title: 'Model shape',
        summary: 'The resilience score is a weighted inverse-harmonic blend of trust, tempo, cognitive load, and audit confidence.',
        bullets: [
          'Trust degrades as supply health falls.',
          'Tempo degrades with manual authority and track density.',
          'Cognitive capacity degrades with the number of active threats.',
          'Audit confidence is reduced by lab failure probability.',
        ],
      },
      {
        title: 'Status mapping',
        summary: 'The model emits a coarse operator-facing state rather than a fully continuous health taxonomy.',
        bullets: [
          'Healthy above the upper threshold.',
          'Stressed between the upper and lower threshold.',
          'Collapsed below the lower threshold.',
          'The collapse horizon is computed from score velocity and lab failure probability.',
        ],
      },
      {
        title: 'Why it matters',
        summary: 'The score gives the command bar and the C2 resilience lab a shared, readable fabric indicator.',
        bullets: [
          'It ties tactical density to strategic load.',
          'It makes model uncertainty visible instead of hiding it behind a static health badge.',
          'It gives the commander and lab surfaces a common decision metric.',
        ],
      },
    ],
    related: ['02-feature-catalog', '04-public-capability-layer', '05-counterfactual-lab'],
  }),
  makeDoc({
    slug: '04-public-capability-layer',
    order: 4,
    title: 'Public Capability Layer',
    status: 'implemented',
    summary: 'Steel can remap synthetic tracks into public-source or archetype interpretations without changing the underlying tactical state.',
    graph: { x: 610, y: 290, links: ['02-feature-catalog', '03-command-resilience-model', '05-counterfactual-lab', '06-deployment-operations'] },
    sources: [
      { label: 'Capability layer store', path: 'src/app/core/state/capability-layer.store.ts', note: 'Synthetic-to-public track remapping and audit logging.' },
      { label: 'Public capability domain', path: 'src/app/shared/domain/public-capability.ts', note: 'Typed public capability card model.' },
      { label: 'Capability seed', path: 'src/app/shared/domain/public-capability.seed.ts', note: 'Public-source and archetype cards used by the remapper.' },
      { label: 'Capability switch', path: 'src/app/shared/ui/capability-layer-switch.ts', note: 'Top-bar control for toggling the remapping mode.' },
      { label: 'Commander orchestrator', path: 'src/app/features/commander-orchestrator.ts', note: 'Displays active archetypes when a public layer is active.' },
      { label: 'Map layer store', path: 'src/app/core/state/map-layer.store.ts', note: 'Visibility toggle for public capability overlays and badges.' },
    ],
    sections: [
      {
        title: 'How it works',
        summary: 'The store remaps visible threat tracks to public capability cards when a non-synthetic mode is active.',
        bullets: [
          'Synthetic mode passes through raw tracks.',
          'Public modes select the best-fit card from the current seed set.',
          'Manual overrides can pin a specific interpretation to a track.',
        ],
      },
      {
        title: 'Operator value',
        summary: 'The feature makes the commander and tactical views readable without asserting impossible fidelity.',
        bullets: [
          'It gives a human-name layer over synthetic tracks.',
          'It supports analyst workflows that need public-source abstraction.',
          'It is explicitly auditable, so changes leave a trace.',
        ],
      },
      {
        title: 'Safety posture',
        summary: 'The public layer is a translation aid, not a claim that the app knows real world platform internals.',
        bullets: [
          'Treat all cards as public-source abstraction.',
          'Keep the public-source banner and caveats visible.',
          'Do not conflate archetype mapping with verified order-of-battle data.',
        ],
      },
    ],
    related: ['02-feature-catalog', '03-command-resilience-model', '05-counterfactual-lab'],
  }),
  makeDoc({
    slug: '05-counterfactual-lab',
    order: 5,
    title: 'Counterfactual Lab',
    status: 'partial',
    summary: 'The counterfactual lab explores policy deltas on a Pareto frontier with a local synthetic trajectory model in Steel.',
    graph: { x: 790, y: 460, links: ['02-feature-catalog', '03-command-resilience-model', '04-public-capability-layer', '06-deployment-operations'] },
    sources: [
      { label: 'Counterfactual lab', path: 'src/app/features/counterfactual-lab.ts', note: 'Frontend lab that now runs a local synthetic trajectory model.' },
      { label: 'Counterfactual store', path: 'src/app/core/ml/counterfactual-lab.store.ts', note: 'Trajectory, trust, and perturbation state.' },
      { label: 'Frontier view', path: 'src/app/shared/ui/frontier-view.ts', note: 'Visualization of the Pareto frontier and active point.' },
    ],
    sections: [
      {
        title: 'What it shows',
        summary: 'The lab presents the same policy sliders and frontier geometry that the BDT work introduced for counterfactual exploration.',
        bullets: [
          'Two perturbation axes: safety and sustainability.',
          'A predicted trajectory with p10/p50/p90 bands.',
          'A trust indicator that moves as the deltas change.',
        ],
      },
      {
        title: 'Steel cut-over behavior',
        summary: 'The Steel version no longer depends on the old localhost ML endpoint and instead synthesizes the trajectory locally.',
        bullets: [
          'The UI remains responsive when no ML backend is configured.',
          'The deep-sim button still provides a visible worker-style activity pulse.',
          'The surface stays compatible with later backend wiring if needed.',
        ],
      },
      {
        title: 'Documentation rule',
        summary: 'Describe the lab as a counterfactual exploration surface, not as a validated forecasting product.',
        bullets: [
          'The frontier is a decision aid, not a guarantee.',
          'Trajectory values are heuristic in the current cut-over.',
          'Keep the distinction between synthetic and server-backed inference visible elsewhere in the app.',
        ],
      },
    ],
    related: ['02-feature-catalog', '03-command-resilience-model', '04-public-capability-layer'],
  }),
  makeDoc({
    slug: '06-deployment-operations',
    order: 6,
    title: 'Deployment Operations',
    status: 'partial',
    summary: 'Steel ships with Cloud Run deployment scaffolding, server-side rationale routing, and Runpod-backed lab inference fallback.',
    graph: { x: 520, y: 710, links: ['00-index', '01-product-overview', '03-command-resilience-model', '05-counterfactual-lab', '07-roadmap-gaps'] },
    sources: [
      { label: 'README', path: 'README.md', note: 'Primary deployment and runtime guidance.' },
      { label: 'Deploy README', path: 'deploy/gcp/README.md', note: 'Cloud Run-specific deployment notes.' },
      { label: 'Deploy script', path: 'deploy/gcp/deploy.sh', note: 'Build and deploy flow for Artifact Registry and Cloud Run.' },
      { label: 'Server', path: 'src/server.ts', note: 'Express SSR host plus rationale and lab endpoints.' },
      { label: 'Env example', path: '.env.example', note: 'Local environment and secret variable reference.' },
    ],
    sections: [
      {
        title: 'Runtime path',
        summary: 'The backend handles SSR, rationale requests, and lab execution in one server process.',
        bullets: [
          'OpenRouter credentials are read on the server, not in the browser.',
          'Runpod credentials enable remote lab inference when configured.',
          'The server falls back to local deterministic lab logic when the remote endpoint is unavailable.',
        ],
      },
      {
        title: 'Cloud Run profile',
        summary: 'The deploy script keeps the service single-instance but allows enough concurrency to avoid route-load pain.',
        bullets: [
          'Default deploy target is europe-north2.',
          'Maximum instance count remains one to preserve in-memory state.',
          'Concurrency is set above one so navigation and asset loads do not collapse under a single request slot.',
        ],
      },
      {
        title: 'Secrets handling',
        summary: 'Secrets should live in local env files or Cloud Run/Secret Manager bindings, not in source control.',
        bullets: [
          'OpenRouter key and model are backend env settings.',
          'Runpod key and endpoint ID are backend env settings.',
          'Lock password and token TTL are deploy-time config values.',
        ],
      },
    ],
    related: ['01-product-overview', '05-counterfactual-lab', '07-roadmap-gaps'],
  }),
  makeDoc({
    slug: '07-roadmap-gaps',
    order: 7,
    title: 'Known Gaps and Roadmap',
    status: 'conceptual',
    summary: 'This page captures the remaining rough edges so the docs do not overclaim what the current Steel repo can prove.',
    graph: { x: 760, y: 760, links: ['00-index', '02-feature-catalog', '03-command-resilience-model', '06-deployment-operations'] },
    sources: [
      { label: 'Governance', path: 'src/app/features/governance.ts', note: 'Still has the existing nullable-expression warning noted during build.' },
      { label: 'Robustness lab', path: 'src/app/features/robustness-lab.ts', note: 'Complex but still a heuristic surface around the server-backed lab path.' },
      { label: 'Planning note', path: 'docs/superpowers/plans/2025-05-22-domain-models.md', note: 'Domain model implementation note carried over from the BDT worktree and normalized for Steel.' },
    ],
    sections: [
      {
        title: 'Current limitations',
        summary: 'There are still some rough edges in the product and build output.',
        bullets: [
          'The governance feature still emits a nullable-coalescing warning.',
          'The app build can run close to the configured bundle budget.',
          'Several surfaces are intentionally heuristic rather than fully model-backed.',
        ],
      },
      {
        title: 'What stays deliberately conservative',
        summary: 'The docs should keep the distinction between live behavior, local simulation, and conceptual framing explicit.',
        bullets: [
          'Do not label heuristic labs as operational systems.',
          'Do not overstate public capability mappings beyond the seed cards.',
          'Keep Runpod and OpenRouter behavior documented as optional backend accelerators.',
        ],
      },
      {
        title: 'Near-term follow-up',
        summary: 'The remaining work is mostly polish, testing, and backend hardening.',
        bullets: [
          'Tighten route and docs smoke tests.',
          'Keep the deployment notes aligned with the actual deploy script.',
          'Remove stale research-only references as they appear.',
        ],
      },
    ],
    related: ['00-index', '03-command-resilience-model', '06-deployment-operations'],
  }),
];

export const REFERENCE_STATUS_ORDER: ReferenceStatus[] = ['implemented', 'partial', 'mock-simulation', 'conceptual'];

export const REFERENCE_STATUS_LABELS: Record<ReferenceStatus, string> = {
  implemented: 'Implemented',
  partial: 'Partial',
  'mock-simulation': 'Mock simulation',
  conceptual: 'Conceptual',
};

export const REFERENCE_STATUS_CLASSES: Record<ReferenceStatus, string> = {
  implemented: 'border-boreal-green bg-boreal-green/10 text-boreal-green',
  partial: 'border-boreal-amber bg-boreal-amber/10 text-boreal-amber',
  'mock-simulation': 'border-boreal-blue bg-boreal-blue/10 text-boreal-blue',
  conceptual: 'border-boreal-text-muted bg-boreal-panel-muted/20 text-boreal-text-muted',
};

export function getReferenceDoc(slug: string): ReferenceDoc | null {
  return REFERENCE_DOCS.find(doc => doc.slug === slug) ?? null;
}

export function buildReferenceGraphEdges(docs: ReferenceDoc[]): Array<{ from: ReferenceDoc; to: ReferenceDoc }> {
  const bySlug = new Map(docs.map(doc => [doc.slug, doc]));
  const edges: Array<{ from: ReferenceDoc; to: ReferenceDoc }> = [];

  for (const doc of docs) {
    for (const slug of doc.graph.links) {
      const target = bySlug.get(slug);
      if (target) {
        edges.push({ from: doc, to: target });
      }
    }
  }

  return edges;
}
