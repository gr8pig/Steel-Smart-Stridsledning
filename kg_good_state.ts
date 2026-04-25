' | 'DECISION' | 'LOGISTICS' | 'INTELLIGENCE' | 'GOVERNANCE' | 'SURFACE';
export type PlatformArea = 'runtime' | 'backend' | 'docs' | 'research' | 'scaffold';
export type FlowType = 'DATA' | 'MATERIAL' | 'CONTROL' | 'LOGICAL' | 'DOCTRINAL';
export type KnowledgeGraphStatus = 'implemented' | 'mock-simulation' | 'partial' | 'conceptual';
export type KnowledgeGraphViewMode = 'GRAPH' | 'TWIN';

export interface GraphEdge {
  id: string;

  id: string;
  label: string;
  category: NodeCategory;
  area?: PlatformArea;
  status?: KnowledgeGraphStatus;
  description: string;
  what?: string;
  why?: string;
  where?: string;
  who?: string;
  route?: string;
  sourcePath?: string;
  technicalSpecs: {
    inputs: string[];
    outputs: string[];
src/app/core/models/platform-knowledge-graph.data.ts
import { REFERENCE_DOCS } from '../../features/reference/reference.manifest';
import {
  NodeCategory,
  PlatformArea,
  TechNode,
} from './knowledge-graph.types';

export const PLATFORM_NODE_CATEGORIES: NodeCategory[] = [
  'CORE',
  'DECISION',
  'LOGISTICS',
  'INTELLIGENCE',
  'GOVERNANCE',
  'SURFACE',
];

export const PLATFORM_AREAS: PlatformArea[] = [
  'runtime',
  'backend',
  'docs',
  'research',
  'scaffold',
];

type NodeInit = Omit<TechNode, 'technicalSpecs'> & {
  technicalSpecs?: Partial<TechNode['technicalSpecs']>;
};

function node(def: NodeInit): TechNode {
  return {
    ...def,
    technicalSpecs: {
      inputs: [],
      outputs: [],
      ...def.technicalSpecs,
    },
  };
}

function refDocId(slug: string): string {
  return `REFDOC_${slug.replace(/[^a-z0-9]+/gi, '_').toUpperCase()}`;
}

const CORE_PLATFORM_NODES: TechNode[] = [
  node({
    id: 'PLAT_001',
    label: 'BOREAL_PLATFORM',
    category: 'CORE',
    area: 'scaffold',
    status: 'conceptual',
    description: 'Canonical root for the platform-wide knowledge graph.',
    what: 'A single editorial root that ties the live app, backend seams, docs, and research artifacts together.',
    why: 'Gives the graph one truth-first entry point instead of a set of disconnected feature islands.',
    where: 'Defined in `src/app/core/models/platform-knowledge-graph.data.ts`.',
    who: 'Architects, maintainers, and anyone reading the platform map.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/models/platform-knowledge-graph.data.ts',
    connectedTo: ['RUNTIME_001', 'BACKEND_001', 'DOCS_001', 'RESEARCH_001', 'SCAFFOLD_001', 'KGSA_001'],
    x: 620,
    y: 80,
    z: 0,
    technicalSpecs: {
      logic: 'The graph fans out from this node into runtime, backend, docs, research, and scaffold clusters.',
      verif: 'Manifest sanity check: every cluster is reachable from the root.',
    },
  }),
  node({
    id: 'RUNTIME_001',
    label: 'RUNTIME_SURFACE',
    category: 'SURFACE',
    area: 'runtime',
    status: 'implemented',
    description: 'Live Angular/SSR surfaces that the operator can actually reach.',
    what: 'The shell, navigation, route groups, and in-app decision surfaces.',
    why: 'Represents the visible application layer rather than hidden support code.',
    where: 'Routes, shell, navigation, and route-level feature components in `Steel-Smart-Stridsledning/src/app`.',
    who: 'Commander, tactical operator, analyst, and governance user.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/app.routes.ts',
    connectedTo: ['APP_001', 'NAV_001', 'ROUTES_001', 'OPER_001', 'ANALYTICS_001', 'GOVERNANCE_001', 'STATE_001', 'SERVICES_001', 'KGSA_001'],
    x: 290,
    y: 220,
    z: 0,
    technicalSpecs: {
      inputs: ['route activation', 'signal stores', 'feature flags'],
      outputs: ['operational screens', 'overlay panels', 'decision surfaces'],
    },
  }),
  node({
    id: 'BACKEND_001',
    label: 'BACKEND_SPINE',
    category: 'CORE',
    area: 'backend',
    status: 'partial',
    description: 'Python API, solver, lab, rationale, and WebSocket seams that support the platform.',
    what: 'The backend runtime and ML-adjacent execution spine that sits beside the Angular app.',
    why: 'Holds the parts of the platform that compute, seed, and broadcast state.',
    where: '`api/main.py`, `api/twin_engine.py`, `api/solver.py`, `api/lab.py`, `api/rationale.py`, `api/ws_manager.py`, `api/scenario_seed.py`.',
    who: 'Backend and simulation maintainers.',
    sourcePath: 'api/main.py',
    connectedTo: ['SERVICES_001', 'LABS_001', 'KGSA_001'],
    x: 980,
    y: 220,
    z: 0,
    technicalSpecs: {
      inputs: ['HTTP', 'WebSocket', 'seed state', 'solver requests'],
      outputs: ['campaign snapshots', 'COA solutions', 'lab results', 'rationale text'],
      logic: 'The backend tree is split across API, twin, solver, lab, rationale, and broadcast concerns.',
      verif: 'Presence check: the repo contains the backend files, but integration is still a separate concern.',
    },
  }),
  node({
    id: 'DOCS_001',
    label: 'REFERENCE_DOCS',
    category: 'SURFACE',
    area: 'docs',
    status: 'implemented',
    description: 'Steel reference docs and the truth-first docs shell.',
    what: 'The documentation graph for the Steel app, including the reference shell, manifest, routes, and pages.',
    why: 'Keeps the published docs aligned with the actual repo instead of the aspirational backbone.',
    where: '`Steel-Smart-Stridsledning/src/app/features/reference/*` and `boreal-info-arch/*.md` as source scaffolding.',
    who: 'Documentation readers, reviewers, and maintainers.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/reference/reference.manifest.ts',
    connectedTo: ['REFSHELL_001', 'RESEARCH_001', 'SCAFFOLD_001'],
    x: 290,
    y: 610,
    z: 0,
    technicalSpecs: {
      inputs: ['reference routes', 'repo truth', 'status labels'],
      outputs: ['doc pages', 'source anchors', 'related links'],
    },
  }),
  node({
    id: 'RESEARCH_001',
    label: 'RESEARCH_PACK',
    category: 'INTELLIGENCE',
    area: 'research',
    status: 'implemented',
    description: 'Research notes, build summaries, and design specs that explain the system.',
    what: 'The design and build artifact layer that explains why the platform looks the way it does.',
    why: 'Captures the reasoning behind the platform map and the current build choices.',
    where: '`docs/superpowers/specs/*`, `Boreal-Decision-Twin/research/*`, `bdt_merged_feature_knowledge_pack/*`.',
    who: 'Product, engineering, and review stakeholders.',
    sourcePath: 'docs/superpowers/specs/2026-04-24-bdt-logic-graph-design.md',
    connectedTo: ['DOCS_001', 'SCAFFOLD_001', 'BACKEND_001'],
    x: 980,
    y: 610,
    z: 0,
    technicalSpecs: {
      inputs: ['implementation plans', 'build summaries', 'scoped docs'],
      outputs: ['design rationale', 'knowledge pack', 'scope cuts'],
    },
  }),
  node({
    id: 'SCAFFOLD_001',
    label: 'BOREAL_INFO_ARCH',
    category: 'SURFACE',
    area: 'scaffold',
    status: 'implemented',
    description: 'The scaffold that inspired the broader graph experience.',
    what: 'A parallel knowledge-graph scaffold with its own docs, state, and graph prototype.',
    why: 'Provides the interaction model and structural cue for the platform-wide map.',
    where: '`boreal-info-arch/src/app/features/knowledge-graph/knowledge-graph.ts` and `boreal-info-arch/00-index.md`.',
    who: 'Platform designers and anyone comparing scaffold intent to ship state.',
    sourcePath: 'boreal-info-arch/src/app/features/knowledge-graph/knowledge-graph.ts',
    connectedTo: ['DOCS_001', 'RESEARCH_001', 'KGSA_001'],
    x: 620,
    y: 820,
    z: 0,
    technicalSpecs: {
      inputs: ['scaffold docs', 'knowledge graph prototype', 'domain models'],
      outputs: ['graph interaction model', 'documentation backbone', 'truth-first layout cues'],
    },
  }),
  node({
    id: 'KGSA_001',
    label: 'KNOWLEDGE_GRAPH',
    category: 'INTELLIGENCE',
    area: 'runtime',
    status: 'implemented',
    description: 'The current KGSA route and in-memory graph store.',
    what: 'The in-app situation-awareness graph that now serves as the visible platform map entry point.',
    why: 'Turns the platform-wide manifest into a navigable surface instead of a static document.',
    where: '`/knowledge-graph`, `Steel-Smart-Stridsledning/src/app/features/knowledge-graph.ts`, `Steel-Smart-Stridsledning/src/app/core/state/knowledge-graph.store.ts`, `Steel-Smart-Stridsledning/src/app/core/models/knowledge-graph.types.ts`.',
    who: 'Analysts and users exploring the platform map.',
    route: '/knowledge-graph',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/knowledge-graph.ts',
    connectedTo: ['RUNTIME_001', 'STATE_001', 'DOCS_001', 'SCAFFOLD_001'],
    x: 620,
    y: 430,
    z: 40,
    technicalSpecs: {
      inputs: ['node manifest', 'search query', 'category filters', 'area filters'],
      outputs: ['selected node', 'highlighted edges', 'twin view details'],
    },
  }),
];

const OPERATIONS_NODES: TechNode[] = [
  node({
    id: 'APP_001',
    label: 'APP_SHELL',
    category: 'CORE',
    area: 'runtime',
    status: 'implemented',
    description: 'Angular shell that frames every route.',
    what: 'The root application component, global canvas, and route outlet.',
    why: 'Provides the structural wrapper that makes the app feel like a single system.',
    where: '`Steel-Smart-Stridsledning/src/app/app.ts`, `app.html`, `app.css`.',
    who: 'Every user of the platform.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/app.ts',
    connectedTo: ['NAV_001', 'ROUTES_001', 'OPER_001', 'ANALYTICS_001', 'GOVERNANCE_001'],
    x: 100,
    y: 210,
    z: -20,
  }),
  node({
    id: 'NAV_001',
    label: 'NAV_RAIL',
    category: 'SURFACE',
    area: 'runtime',
    status: 'implemented',
    description: 'Primary navigation chrome and command strip.',
    what: 'The route launcher and context rail at the edge of the app.',
    why: 'Lets the user move between operational, analytical, and governance surfaces.',
    where: '`Steel-Smart-Stridsledning/src/app/shared/ui/nav-rail.ts`, `command-bar.ts`.',
    who: 'Operators and command staff.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/shared/ui/nav-rail.ts',
    connectedTo: ['ROUTES_001', 'OPER_001', 'ANALYTICS_001', 'GOVERNANCE_001', 'KGSA_001', 'SERVICES_001'],
    x: 180,
    y: 330,
    z: -10,
  }),
  node({
    id: 'ROUTES_001',
    label: 'APP_ROUTES',
    category: 'SURFACE',
    area: 'runtime',
    status: 'implemented',
    description: 'Route table for the Steel app.',
    what: 'The canonical route registry that exposes all major feature screens.',
    why: 'Turns the app into a real multi-surface decision environment.',
    where: '`Steel-Smart-Stridsledning/src/app/app.routes.ts`.',
    who: 'Developers and route readers.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/app.routes.ts',
    connectedTo: ['OPER_001', 'ANALYTICS_001', 'GOVERNANCE_001', 'KGSA_001'],
    x: 210,
    y: 450,
    z: -10,
  }),
  node({
    id: 'OPER_001',
    label: 'OPERATIONAL_SURFACES',
    category: 'DECISION',
    area: 'runtime',
    status: 'implemented',
    description: 'Core command surfaces for mission execution.',
    what: 'Overview, tactical, commander, readiness, logistics, and field-facing screens.',
    why: 'Represents the primary route group a user reaches when working the system.',
    where: '`mission-overview.ts`, `tactical-console.ts`, `commander-orchestrator.ts`, `readiness-console.ts`, `logistics-console.ts`, `field-console.ts`.',
    who: 'Commander, tactical operator, readiness officer, logistics officer.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/mission-overview.ts',
    connectedTo: ['APP_001', 'NAV_001', 'TACT_001', 'CMD_001', 'READ_001', 'LOG_001', 'FIELD_001'],
    x: 360,
    y: 270,
    z: 20,
    technicalSpecs: {
      inputs: ['tracks', 'base readiness', 'policy state', 'supply state'],
      outputs: ['mission overview', 'tactical judgments', 'command actions'],
    },
  }),
  node({
    id: 'ANALYTICS_001',
    label: 'ANALYTIC_LABS',
    category: 'INTELLIGENCE',
    area: 'runtime',
    status: 'partial',
    description: 'Threat, robustness, counterfactual, and resilience analysis surfaces.',
    what: 'Threat inspector, robustness lab, counterfactual lab, C2 resilience lab, drawing board, and demo director.',
    why: 'Lets the user stress the plan, inspect uncertainty, and explore tradeoffs before committing.',
    where: '`threat-inspector.ts`, `robustness-lab.ts`, `counterfactual-lab.ts`, `c2-resilience-lab.ts`, `drawing-board.ts`, `demo-director.ts`.',
    who: 'Analyst, red-team cell, and demo operator.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/threat-inspector.ts',
    connectedTo: ['APP_001', 'NAV_001', 'THR_001', 'ROB_001', 'CF_001', 'C2R_001', 'DRAW_001', 'DEM_001'],
    x: 360,
    y: 590,
    z: 20,
    technicalSpecs: {
      inputs: ['threat tracks', 'policy weights', 'fragility samples', 'counterfactual trials'],
      outputs: ['stress findings', 'rationale', 'projected collapse horizons'],
    },
  }),
  node({
    id: 'GOVERNANCE_001',
    label: 'GOVERNANCE',
    category: 'GOVERNANCE',
    area: 'runtime',
    status: 'implemented',
    description: 'Governance, authority, and audit surfaces.',
    what: 'Governance page, authority dashboard, and audit logger behavior.',
    why: 'Keeps commander decisions traceable and reviewable.',
    where: '`governance.ts`, `authority-dashboard.ts`, `audit-logger.ts`.',
    who: 'Governance reviewer and command authority.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/governance.ts',
    connectedTo: ['APP_001', 'NAV_001', 'GOV_001', 'AUTH_001', 'AUD_001', 'POL_001'],
    x: 360,
    y: 760,
    z: 10,
  }),
];

const STATE_AND_SERVICE_NODES: TechNode[] = [
  node({
    id: 'STATE_001',
    label: 'STATE_AND_MODELS',
    category: 'CORE',
    area: 'runtime',
    status: 'partial',
    description: 'Signal stores and shared models that feed the surfaces.',
    what: 'Policy, decision fabric, KGSA, sensor feed, map layer, lab, orchestration, and capability state.',
    why: 'Provides the reactive data backbone the screens and services consume.',
    where: '`core/state/*`, `core/models/*`, and `shared/domain/*`.',
    who: 'Frontend and platform maintainers.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/state/policy.store.ts',
    connectedTo: ['POL_001', 'FAB_001', 'KGSA_001', 'SENS_001', 'MAP_001', 'LABS_001', 'SERVICES_001', 'C2R_001'],
    x: 250,
    y: 870,
    z: 0,
    technicalSpecs: {
      inputs: ['route interactions', 'sensor streams', 'policy changes', 'orchestration triggers'],
      outputs: ['selected COA', 'graph state', 'sensor state', 'resilience score'],
    },
  }),
  node({
    id: 'SERVICES_001',
    label: 'SERVICE_LAYER',
    category: 'DECISION',
    area: 'runtime',
    status: 'partial',
    description: 'Client services that bridge UI, backend, and local heuristics.',
    what: 'BDT API, Steel API, LLM, intent estimation, theater WebSocket, sensor adapters, capability orchestration, and feature flags.',
    why: 'Concentrates the non-view logic that binds the app to runtime data and external seams.',
    where: '`core/services/*`.',
    who: 'Frontend engineers and integrators.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/services/bdt-api.service.ts',
    connectedTo: ['BDTAPI_001', 'STEELAPI_001', 'LLM_001', 'INTENT_001', 'THEATERWS_001', 'SENSORADAPTER_001', 'CAPORCH_001', 'FLAGS_001', 'BACKEND_001'],
    x: 520,
    y: 250,
    z: 30,
    technicalSpecs: {
      inputs: ['HTTP', 'WebSocket', 'signals', 'feature state'],
      outputs: ['API results', 'intent scores', 'broadcast frames', 'feature gates'],
    },
  }),
  node({
    id: 'POL_001',
    label: 'POLICY_AND_SOLVER',
    category: 'DECISION',
    area: 'runtime',
    status: 'implemented',
    description: 'Policy weights and COA solving behavior.',
    what: 'The policy store, guardrails, and COA solve trigger path.',
    why: 'Lets the commander tune the trade space between safety, sustainability, and resilience.',
    where: '`core/state/policy.store.ts`, `shared/domain/models.ts`, `core/services/bdt-api.service.ts`.',
    who: 'Commander and policy staff.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/state/policy.store.ts',
    connectedTo: ['STATE_001', 'SERVICES_001', 'BACKEND_001', 'C2R_001', 'GOVERNANCE_001'],
    x: 460,
    y: 980,
    z: 20,
    technicalSpecs: {
      inputs: ['weights', 'guardrails', 'readiness floors'],
      outputs: ['COA requests', 'selected COA', 'policy audit log'],
      logic: 'A debounced solve cycle re-runs when policy weights change.',
    },
  }),
  node({
    id: 'FAB_001',
    label: 'DECISION_FABRIC',
    category: 'CORE',
    area: 'runtime',
    status: 'implemented',
    description: 'The command-friction model that projects resilience.',
    what: 'Decision fabric state plus the command friction engine that derives resilience and collapse horizons.',
    why: 'Shows whether the operating concept still holds under pressure.',
    where: '`core/state/decision-fabric.store.ts`, `core/sim/command-friction-engine.ts`.',
    who: 'Commanders and governance reviewers.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/state/decision-fabric.store.ts',
    connectedTo: ['STATE_001', 'C2R_001', 'GOVERNANCE_001', 'BACKEND_001'],
    x: 620,
    y: 980,
    z: 10,
    technicalSpecs: {
      inputs: ['tracks', 'policy authority', 'logistics health', 'lab failure probability'],
      outputs: ['resilience score', 'collapse horizon', 'friction status'],
    },
  }),
  node({
    id: 'SENS_001',
    label: 'SENSOR_FEED',
    category: 'SURFACE',
    area: 'runtime',
    status: 'partial',
    description: 'Sensor feed, replay, and adapter coordination.',
    what: 'The live/mock/replay sensor feed layer and the adapter service behind it.',
    why: 'Keeps the tactical picture responsive without hard-coding a single input mode.',
    where: '`core/state/sensor-feed.store.ts`, `core/services/sensor-adapter.ts`, `core/services/theater-ws.service.ts`.',
    who: 'Tactical operator and platform integrator.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/state/sensor-feed.store.ts',
    connectedTo: ['STATE_001', 'SERVICES_001', 'TACT_001', 'THR_001', 'BACKEND_001'],
    x: 100,
    y: 980,
    z: 10,
    technicalSpecs: {
      inputs: ['live feed', 'replay feed', 'synthetic feed'],
      outputs: ['track deltas', 'sensor state', 'timing updates'],
    },
  }),
  node({
    id: 'MAP_001',
    label: 'MAP_LAYER',
    category: 'SURFACE',
    area: 'runtime',
    status: 'implemented',
    description: 'Map and rendering state for spatial surfaces.',
    what: 'The map layer store and related spatial rendering state.',
    why: 'Keeps tactical and logistics views aligned to the same spatial frame.',
    where: '`core/state/map-layer.store.ts`, `shared/domain/engagement-map.data.ts`.',
    who: 'Tactical operator and analyst.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/state/map-layer.store.ts',
    connectedTo: ['STATE_001', 'OPER_001', 'LOG_001', 'FIELD_001'],
    x: 100,
    y: 1130,
    z: 0,
  }),
  node({
    id: 'LABS_001',
    label: 'LAB_STATE',
    category: 'INTELLIGENCE',
    area: 'runtime',
    status: 'partial',
    description: 'Lab store and other analytical state surfaces.',
    what: 'Robustness, counterfactual, and lab-state data that backs the analytical routes.',
    why: 'Preserves experiment results and red-team findings across the app.',
    where: '`core/state/lab.store.ts`, `core/ml/counterfactual-lab.store.ts`, `features/robustness-lab.ts`, `features/counterfactual-lab.ts`.',
    who: 'Analyst and red-team cell.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/core/state/lab.store.ts',
    connectedTo: ['STATE_001', 'ANALYTICS_001', 'BACKEND_001'],
    x: 460,
    y: 1130,
    z: 0,
  }),
];

const ANALYTICAL_AND_ROUTE_NODES: TechNode[] = [
  node({
    id: 'TACT_001',
    label: 'TACTICAL_CONSOLE',
    category: 'DECISION',
    area: 'runtime',
    status: 'implemented',
    description: 'The tactical picture and engagement surface.',
    what: 'The tactical console, threat view, and engagement reasoning path.',
    why: 'Lets operators inspect tracks and make defensive decisions in context.',
    where: '`features/tactical-console.ts`, `features/threat-inspector.ts`, `core/state/tactical.store.ts`.',
    who: 'Tactical operator and air-defense coordinator.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/tactical-console.ts',
    connectedTo: ['OPER_001', 'SENS_001', 'POL_001', 'KGSA_001', 'THR_001'],
    x: 470,
    y: 330,
    z: 40,
  }),
  node({
    id: 'CMD_001',
    label: 'COMMANDER_ORCHESTRATOR',
    category: 'DECISION',
    area: 'runtime',
    status: 'implemented',
    description: 'Commander view and policy panel.',
    what: 'The commander orchestrator, header, frontier, outcome, and policy panels.',
    why: 'Makes the policy trade-offs explicit before a decision is locked in.',
    where: '`features/commander-orchestrator.ts`, `commander-header-panel.ts`, `commander-frontier-panel.ts`, `commander-outcome-panel.ts`, `commander-policy-panel.ts`.',
    who: 'Commander and decision authority.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/commander-orchestrator.ts',
    connectedTo: ['OPER_001', 'POL_001', 'GOVERNANCE_001', 'FAB_001'],
    x: 620,
    y: 330,
    z: 30,
  }),
  node({
    id: 'READ_001',
    label: 'READINESS_CONSOLE',
    category: 'CORE',
    area: 'runtime',
    status: 'implemented',
    description: 'Base readiness and sustainment surface.',
    what: 'The readiness console and projection logic for blue-force bases.',
    why: 'Shows the second-order effects of engaging now versus holding reserve.',
    where: '`features/readiness-console.ts`, `core/state/readiness.store.ts`, `shared/domain/models.ts`.',
    who: 'Readiness officer and commander.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/readiness-console.ts',
    connectedTo: ['OPER_001', 'LOG_001', 'POL_001', 'FAB_001'],
    x: 770,
    y: 330,
    z: 20,
  }),
  node({
    id: 'LOG_001',
    label: 'LOGISTICS_CONSOLE',
    category: 'LOGISTICS',
    area: 'runtime',
    status: 'implemented',
    description: 'Supply, sustainment, and logistics view.',
    what: 'The logistics console and sustainment model.',
    why: 'Keeps ammunition, fuel, and corridor health visible while planning decisions.',
    where: '`features/logistics-console.ts`, `core/state/logistics.store.ts`, `shared/domain/logistics-ontology.ts`.',
    who: 'Logistics officer.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/logistics-console.ts',
    connectedTo: ['OPER_001', 'READ_001', 'MAP_001', 'FAB_001'],
    x: 920,
    y: 330,
    z: 20,
  }),
  node({
    id: 'FIELD_001',
    label: 'FIELD_CONSOLE',
    category: 'SURFACE',
    area: 'runtime',
    status: 'implemented',
    description: 'Field-facing mobile command surface.',
    what: 'The field terminal and its operator-specific surface.',
    why: 'Represents the lower-friction on-the-move view of the platform.',
    where: '`features/field-console.ts`.',
    who: 'Field operator.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/field-console.ts',
    connectedTo: ['OPER_001', 'MAP_001', 'SENS_001'],
    x: 1080,
    y: 330,
    z: 10,
  }),
  node({
    id: 'THR_001',
    label: 'THREAT_INSPECTOR',
    category: 'INTELLIGENCE',
    area: 'runtime',
    status: 'implemented',
    description: 'Threat assessment and intent inspection surface.',
    what: 'The threat inspector route and its intent-estimation helpers.',
    why: 'Lets analysts read signal quality and intent uncertainty before recommending action.',
    where: '`features/threat-inspector.ts`, `core/services/intent-estimator.service.ts`.',
    who: 'Analyst and tactical operator.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/threat-inspector.ts',
    connectedTo: ['ANALYTICS_001', 'TACT_001', 'SENS_001', 'KGSA_001'],
    x: 470,
    y: 740,
    z: 40,
  }),
  node({
    id: 'ROB_001',
    label: 'ROBUSTNESS_LAB',
    category: 'INTELLIGENCE',
    area: 'runtime',
    status: 'implemented',
    description: 'Robustness stress-testing surface.',
    what: 'The robustness lab and its stress-running heuristics.',
    why: 'Tests whether the plan survives saturation, deception, and degradation.',
    where: '`features/robustness-lab.ts`, `core/state/lab.store.ts`, `core/sim/command-friction-engine.ts`.',
    who: 'Analyst and red-team cell.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/robustness-lab.ts',
    connectedTo: ['ANALYTICS_001', 'LABS_001', 'BACKEND_001'],
    x: 620,
    y: 740,
    z: 30,
  }),
  node({
    id: 'CF_001',
    label: 'COUNTERFACTUAL_LAB',
    category: 'INTELLIGENCE',
    area: 'runtime',
    status: 'partial',
    description: 'Counterfactual command and ML trial surface.',
    what: 'The counterfactual lab and its local ML state.',
    why: 'Explores how policy perturbations change projected outcomes.',
    where: '`features/counterfactual-lab.ts`, `core/ml/counterfactual-lab.store.ts`, `api/ml/*`, `scripts/ml/*`.',
    who: 'Analyst and machine-learning operator.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/counterfactual-lab.ts',
    connectedTo: ['ANALYTICS_001', 'LABS_001', 'BACKEND_001', 'SERVICES_001'],
    x: 770,
    y: 740,
    z: 20,
  }),
  node({
    id: 'C2R_001',
    label: 'C2_RESILIENCE',
    category: 'DECISION',
    area: 'runtime',
    status: 'implemented',
    description: 'Resilience projection and collapse horizon surface.',
    what: 'The C2 resilience lab and the command-friction scoring model.',
    why: 'Shows whether the system can keep functioning under load and uncertainty.',
    where: '`features/c2-resilience-lab.ts`, `core/state/decision-fabric.store.ts`, `core/sim/command-friction-engine.ts`.',
    who: 'Commander, governance reviewer, and analyst.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/c2-resilience-lab.ts',
    connectedTo: ['ANALYTICS_001', 'FAB_001', 'POL_001', 'GOVERNANCE_001'],
    x: 920,
    y: 740,
    z: 30,
  }),
  node({
    id: 'DEM_001',
    label: 'DEMO_DIRECTOR',
    category: 'SURFACE',
    area: 'runtime',
    status: 'implemented',
    description: 'Demo orchestration and scenario injection surface.',
    what: 'The operator that seeds or steers demonstration scenarios.',
    why: 'Makes the graph useful in live walkthroughs and feature demos.',
    where: '`features/demo-director.ts`.',
    who: 'Demo operator and presenter.',
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/demo-director.ts',
    connectedTo: ['ANALYTICS_001', 'OPER_001', 'SENS_001', 'BACKEND_001'],
    x: 1080,
    y: 740,
    z: 10,
  }),
];

const BACKEND_DETAIL_NODES: TechNode[] = [
  node({
    id: 'API_MAIN_001',
    label: 'API_MAIN',
    category: 'CORE',
    area: 'backend',
    status: 'implemented',
    description: 'FastAPI application entrypoint.',
    what: 'The backend application bootstrap and route registration point.',
    why: 'Provides the server root for the computational and broadcast seams.',
    where: '`api/main.py` and `api/__init__.py`.',
    who: 'Backend maintainers.',
    sourcePath: 'api/main.py',
    connectedTo: ['BACKEND_001', 'API_TWIN_001', 'API_SOLVER_001', 'API_LAB_001', 'API_RATIONALE_001', 'API_WS_001'],
    x: 820,
    y: 430,
    z: 20,
  }),
  node({
    id: 'API_TWIN_001',
    label: 'TWIN_ENGINE',
    category: 'CORE',
    area: 'backend',
    status: 'implemented',
    description: 'Digital twin state engine.',
    what: 'The backend twin model and state evolution layer.',
    why: 'Keeps the operational snapshot coherent across ticks.',
    where: '`api/twin_engine.py`.',
    who: 'Backend and simulation maintainers.',
    sourcePath: 'api/twin_engine.py',
    connectedTo: ['API_MAIN_001', 'API_SOLVER_001', 'API_SEED_001'],
    x: 1000,
    y: 430,
    z: 30,
  }),
  node({
    id: 'API_SOLVER_001',
    label: 'COA_SOLVER',
    category: 'DECISION',
    area: 'backend',
    status: 'implemented',
    description: 'Policy-weighted COA solver and reachability filter.',
    what: 'The backend solver that scores and selects candidate courses of action.',
    why: 'Converts policy weight changes into ranked plans.',
    where: '`api/solver.py`.',
    who: 'Backend and decision-support maintainers.',
    sourcePath: 'api/solver.py',
    connectedTo: ['API_MAIN_001', 'API_TWIN_001', 'API_LAB_001'],
    x: 1180,
    y: 430,
    z: 20,
  }),
  node({
    id: 'API_LAB_001',
    label: 'MONTE_CARLO_LAB',
    category: 'INTELLIGENCE',
    area: 'backend',
    status: 'implemented',
    description: 'Stochastic stress-test engine.',
    what: 'The backend lab that executes Monte Carlo-style robustness runs.',
    why: 'Quantifies how the plan behaves under red-force perturbations.',
    where: '`api/lab.py`.',
    who: 'Analyst and red-team operator.',
    sourcePath: 'api/lab.py',
    connectedTo: ['API_MAIN_001', 'API_SOLVER_001', 'API_RATIONALE_001'],
    x: 840,
    y: 560,
    z: 20,
  }),
  node({
    id: 'API_RATIONALE_001',
    label: 'RATIONALE',
    category: 'GOVERNANCE',
    area: 'backend',
    status: 'partial',
    description: 'LLM-backed rationale generation seam.',
    what: 'The backend rationale generator for explanations and summaries.',
    why: 'Turns solved outputs into plain-language decision support.',
    where: '`api/rationale.py`.',
    who: 'Commander and governance reviewer.',
    sourcePath: 'api/rationale.py',
    connectedTo: ['API_MAIN_001', 'API_LAB_001', 'BACKEND_001'],
    x: 1000,
    y: 560,
    z: 20,
  }),
  node({
    id: 'API_WS_001',
    label: 'WS_MANAGER',
    category: 'SURFACE',
    area: 'backend',
    status: 'implemented',
    description: 'WebSocket manager for live state broadcasts.',
    what: 'The server-side broadcast manager for theater updates.',
    why: 'Keeps the live display synchronized with the backend snapshot.',
    where: '`api/ws_manager.py`.',
    who: 'Platform integrator.',
    sourcePath: 'api/ws_manager.py',
    connectedTo: ['API_MAIN_001', 'API_TWIN_001', 'SENS_001'],
    x: 1180,
    y: 560,
    z: 10,
  }),
  node({
    id: 'API_SEED_001',
    label: 'SCENARIO_SEED',
    category: 'SURFACE',
    area: 'backend',
    status: 'implemented',
    description: 'Scenario seed and initial state builder.',
    what: 'The seed logic that initializes the campaign and scenario baseline.',
    why: 'Makes the backend deterministic enough to start from a known state.',
    where: '`api/scenario_seed.py`.',
    who: 'Simulation maintainers.',
    sourcePath: 'api/scenario_seed.py',
    connectedTo: ['API_TWIN_001', 'RESEARCH_001'],
    x: 1000,
    y: 690,
    z: 10,
  }),
  node({
    id: 'API_MODELS_001',
    label: 'API_MODELS',
    category: 'CORE',
    area: 'backend',
    status: 'implemented',
    description: 'Typed request and response models.',
    what: 'The Pydantic schema layer for backend I/O.',
    why: 'Prevents the backend contract from drifting away from the UI expectations.',
    where: '`api/models.py` and `api/ml/models.py`.',
    who: 'Backend and frontend integrators.',
    sourcePath: 'api/models.py',
    connectedTo: ['API_MAIN_001', 'SERVICES_001'],
    x: 1180,
    y: 690,
    z: 10,
  }),
  node({
    id: 'SCRIPT_ML_001',
    label: 'ML_SCRIPTS',
    category: 'INTELLIGENCE',
    area: 'backend',
    status: 'implemented',
    description: 'Training and preemption-handling scripts.',
    what: 'The ML worker scripts used to train, clean up, and manage offline jobs.',
    why: 'Explains the offline side of the platform beyond the HTTP API.',
    where: '`scripts/ml/train_worker.py`, `scripts/ml/cleanup_preempted.py`, `scripts/ml/test_train_worker.py`, `scripts/ml/test_cleanup.py`.',
    who: 'ML and automation maintainers.',
    sourcePath: 'scripts/ml/train_worker.py',
    connectedTo: ['API_LAB_001', 'RESEARCH_001'],
    x: 840,
    y: 690,
    z: 10,
  }),
];

const RESEARCH_PACK_NODES: TechNode[] = [
  node({
    id: 'PACK_001',
    label: 'FEATURE_KNOWLEDGE_PACK',
    category: 'SURFACE',
    area: 'research',
    status: 'implemented',
    description: 'Merged feature knowledge pack used as a repo truth source.',
    what: 'The consolidated feature and domain pack that informs the graph scope.',
    why: 'Provides a prior scaffold for the current implementation narrative.',
    where: '`bdt_merged_feature_knowledge_pack/*`.',
    who: 'Technical documentation readers.',
    sourcePath: 'bdt_merged_feature_knowledge_pack/00-index.md',
    connectedTo: ['RESEARCH_001', 'DOCS_001'],
    x: 860,
    y: 820,
    z: 10,
  }),
  node({
    id: 'PLAN_001',
    label: 'IMPLEMENTATION_PLAN',
    category: 'DECISION',
    area: 'research',
    status: 'implemented',
    description: 'Plan describing the backend/twin sprint.',
    what: 'The pre-hackathon implementation plan that explains the intended build sequence.',
    why: 'Shows the decision flow that shaped the platform seams.',
    where: '`Boreal-Decision-Twin/research/BDT_Implementation_Plan_22Apr2026.md`.',
    who: 'Engineers and reviewers.',
    sourcePath: 'Boreal-Decision-Twin/research/BDT_Implementation_Plan_22Apr2026.md',
    connectedTo: ['RESEARCH_001', 'BACKEND_001'],
    x: 1040,
    y: 820,
    z: 10,
  }),
  node({
    id: 'BUILD_001',
    label: 'BUILD_SUMMARY',
    category: 'CORE',
    area: 'research',
    status: 'implemented',
    description: 'Build summary of the full-stack sprint.',
    what: 'The build summary that records what was wired during the sprint.',
    why: 'Documents the current technical truth before the next cutover.',
    where: '`Boreal-Decision-Twin/research/BDT_Build_Summary_23Apr2026.md`.',
    who: 'Engineers and maintainers.',
    sourcePath: 'Boreal-Decision-Twin/research/BDT_Build_Summary_23Apr2026.md',
    connectedTo: ['RESEARCH_001', 'BACKEND_001', 'RUNTIME_001'],
    x: 860,
    y: 980,
    z: 10,
  }),
  node({
    id: 'SPEC_001',
    label: 'LOGIC_GRAPH_SPEC',
    category: 'INTELLIGENCE',
    area: 'research',
    status: 'implemented',
    description: 'Logic-graph design spec for the scaffold itself.',
    what: 'The design spec that describes the scaffold-style graph model and its interaction rules.',
    why: 'Connects the platform map back to the blueprint that inspired it.',
    where: '`docs/superpowers/specs/2026-04-24-bdt-logic-graph-design.md`.',
    who: 'Design reviewers and engineers.',
    sourcePath: 'docs/superpowers/specs/2026-04-24-bdt-logic-graph-design.md',
    connectedTo: ['RESEARCH_001', 'SCAFFOLD_001'],
    x: 1040,
    y: 980,
    z: 10,
  }),
];

const REFERENCE_DOC_NODES: TechNode[] = REFERENCE_DOCS.map((doc, index, docs) =>
  node({
    id: refDocId(doc.slug),
    label: `${doc.order.toString().padStart(2, '0')}_${doc.slug.replace(/^\d+-/, '').replace(/-/g, '_').toUpperCase()}`,
    category: 'SURFACE',
    area: 'docs',
    status: doc.status,
    description: doc.summary,
    what: doc.title,
    why: doc.summary,
    where: `${doc.route} and ` +
      `Steel-Smart-Stridsledning/src/app/features/reference/reference.manifest.ts`,
    who: 'Documentation readers and maintainers.',
    route: doc.route,
    sourcePath: 'Steel-Smart-Stridsledning/src/app/features/reference/reference.manifest.ts',
    connectedTo: [
      'DOCS_001',
      index < docs.length - 1 ? refDocId(docs[index + 1].slug) : '',
    ].filter(Boolean) as string[],
    x: 1290,
    y: 150 + (index * 78),
    z: 0,
    technicalSpecs: {
      inputs: ['reference manifest', 'route metadata', 'doc text'],
      outputs: ['truth-first docs page', 'source anchors', 'related links'],
    },
  })
);

export const PLATFORM_KNOWLEDGE_GRAPH_NODES: TechNode[] = [
  ...CORE_PLATFORM_NODES,
  ...OPERATIONS_NODES,
  ...STATE_AND_SERVICE_NODES,
  ...ANALYTICAL_AND_ROUTE_NODES,
  ...BACKEND_DETAIL_NODES,
  ...RESEARCH_PACK_NODES,
  ...REFERENCE_DOC_NODES,
];

export function getPlatformNodeById(id: string): TechNode | null {
  return PLATFORM_KNOWLEDGE_GRAPH_NODES.find(node => node.id === id) ?? null;
}
src/app/core/services/feature-flag.service.ts

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  // Default: KGSA gated; sensor adapter and red adversary enabled for local dev
  // Default: KGSA visible; sensor adapter and red adversary enabled for local dev
  private _flags = signal<Record<FeatureFlag, boolean>>({
    kgsa:                 false,
    kgsa:                 true,
    sensorFeedAdapter:    true,
    redAdversaryEvolution: true,
    publicCapabilityLayer: true,
src/app/core/services/shell-layout.service.spec.ts
  it('tracks compact mode from the viewport and closes the drawer on desktop', () => {
    const shell = TestBed.inject(ShellLayoutService);

    expect(shell.compact()).toBeFalse();
    expect(shell.isCompact()).toBeFalse();
    expect(shell.navOpen()).toBeFalse();
    expect(shell.compact()).toBe(false);
    expect(shell.isCompact()).toBe(false);
    expect(shell.navOpen()).toBe(false);

    shell.toggleNav();
    expect(shell.navOpen()).toBeFalse();
    expect(shell.navOpen()).toBe(false);

    currentMatches = true;
    changeListener?.(new Event('change'));

    expect(shell.compact()).toBeTrue();
    expect(shell.isCompact()).toBeTrue();
    expect(shell.compact()).toBe(true);
    expect(shell.isCompact()).toBe(true);

    shell.openNav();
    expect(shell.navOpen()).toBeTrue();
    expect(shell.navOpen()).toBe(true);

    shell.closeNav();
    expect(shell.navOpen()).toBeFalse();
    expect(shell.navOpen()).toBe(false);

    shell.toggleNav();
    expect(shell.navOpen()).toBeTrue();
    expect(shell.navOpen()).toBe(true);

    currentMatches = false;
    changeListener?.(new Event('change'));

    expect(shell.compact()).toBeFalse();
    expect(shell.navOpen()).toBeFalse();
    expect(shell.compact()).toBe(false);
    expect(shell.navOpen()).toBe(false);
  });
});
src/app/core/state/knowledge-graph.store.ts

import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { TechNode } from '../models/knowledge-graph.types';
import {
  PLATFORM_KNOWLEDGE_GRAPH_NODES,
} from '../models/platform-knowledge-graph.data';
import {
  KnowledgeGraphViewMode,
  NodeCategory,
  PlatformArea,
  TechNode,
} from '../models/knowledge-graph.types';

export interface KnowledgeGraphState {
  nodes: TechNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  activeCategories: NodeCategory[];
  activeAreas: PlatformArea[];
}

const initialNodes: TechNode[] = [
    { id: 'SCEN_001', label: 'SCENARIO_ENGINE', category: 'CORE', x: 250, y: 150, z: -150, description: 'The master temporal heart...', technicalSpecs: { inputs: ['CLOCK_UTC', 'PHASE_MANIFEST', 'FORCE_SYNC_FLAG'], outputs: ['SIM_TOCK', 'EPOCH_GATE', 'PHASE_DELTA'], logic: 'Atomic sequence buffering...', math: 'Δt_sim = Δt_real · scaling_factor\nT_next = T_now + Δt_sim', doctrine: 'Supports Integrated Command...', verif: 'Unit_Test: Temporal_Drift < 0.001ms' }, connectedTo: ['TACT_001', 'POL_001'], flows: [{ id: 'f1', source: 'SCEN_001', target: 'TACT_001', type: 'LOGICAL' }, { id: 'f2', source: 'SCEN_001', target: 'POL_001', type: 'LOGICAL' }] },
    { id: 'TACT_001', label: 'TACTICAL_RESOLVER', category: 'DECISION', x: 600, y: 350, z: -50, description: 'A high-speed Bayesian inference engine...', technicalSpecs: { inputs: ['RADAR_L3_TRACKS', 'ENGAGEMENT_POLICY', 'SENSOR_STATUS'], outputs: ['INTENT_PROB_DIST', 'ASSIGNMENT_RECOMMENDATION'], math: 'P(intent|obs) ∝ P(intent) · L(obs|intent)^α\nα = sigmoid(SensorQuality)', logic: 'Dampens high-volatility...', doctrine: 'Aligned with Modern Integrated Air Defence...', verif: 'Stress_Test: Saturation_Wave_Convergence' }, connectedTo: ['POL_001', 'READ_001', 'VIZ_001'], flows: [{ id: 'f3', source: 'TACT_001', target: 'VIZ_001', type: 'DATA' }, { id: 'f4', source: 'TACT_001', target: 'READ_001', type: 'DATA' }] },
    { id: 'POL_001', label: 'POLICY_ARCHITECT', category: 'DECISION', x: 950, y: 150, z: -50, description: 'Translation layer between human Strategic Intent...', technicalSpecs: { inputs: ['COMMANDER_INTENT_JSON', 'LEGAL_BOUNDARIES', 'GUARDRAIL_VEC'], outputs: ['OBJ_FUNCTION', 'SCORING_WEIGHTS'], math: 'Score(COA) = w_safe·Safety + w_sust·Sustainability + w_resil·Resilience', logic: 'Enforces civilian-protection invariants...', doctrine: 'Encapsulates Mission Command...', verif: 'Logic_Check: Guardrail_Leakage_Prevention' }, connectedTo: ['TACT_001', 'GOV_001'], flows: [{ id: 'f5', source: 'POL_001', target: 'TACT_001', type: 'CONTROL' }, { id: 'f6', source: 'POL_001', target: 'GOV_001', type: 'DATA' }] },
    { id: 'READ_001', label: 'READINESS_TWIN', category: 'CORE', x: 300, y: 600, z: -150, description: 'Models the second-order effects of engagement...', technicalSpecs: { inputs: ['SORTIE_DELTA', 'FUEL_VAL_STREAM', 'FATIGUE_MODEL'], outputs: ['READINESS_INDEX', 'MAINTENANCE_LOCKOUT'], math: 'Readiness_t+1 = Readiness_t - f(Expenditure, Fatigue) + Recovery(t)', logic: 'Prevents commander tunnel vision...', doctrine: 'Supports Deterrence by Resilience...', verif: 'Simulation: Depletion_Trajectory_Accuracy' }, connectedTo: ['TACT_001', 'LOG_001'], flows: [{ id: 'f7', source: 'READ_001', target: 'LOG_001', type: 'LOGICAL' }] },
    { id: 'LOG_001', label: 'LOGISTICS_FABRIC', category: 'LOGISTICS', x: 900, y: 600, z: 50, description: 'The spatial graph of supply corridors...', technicalSpecs: { inputs: ['SUPPLY_NODE_STATUS', 'CORRIDOR_EXPOSURE', 'ETA_VEC'], outputs: ['SUSTAINMENT_DEPTH', 'ROUTE_FRAGILITY'], math: 'Throughput(node) = min(Capacity, LaneAvailability)\nSupplyHealth = Σ (Fuel + Ammo) / 2', logic: 'Identifies supply bottlenecks...', doctrine: 'Total Defence connectivity...', verif: 'Graph_Alg: Min_Cut_Supply_Analysis' }, connectedTo: ['READ_001', 'AUD_001'], flows: [{ id: 'f8', source: 'LOG_001', target: 'READ_001', type: 'MATERIAL' }] },
    { id: 'AUD_001', label: 'ROBUSTNESS_LAB', category: 'INTELLIGENCE', x: 600, y: 750, z: 0, description: 'Adversarial stress-testing sandbox...', technicalSpecs: { inputs: ['RED_FORCE_BEHAVIOR', 'JAMMING_VEC', 'COA_CANDIDATE'], outputs: ['FAILURE_HEATMAP', 'ROBUSTNESS_SCORE'], math: 'Robustness = 1 - ∫ P(failure|perturbation)dP', logic: 'Generates 12x12 adversarial matrices...', doctrine: 'Implements Decisive Uncertainty reduction...', verif: 'Stress_Test: Monte_Carlo_Convergence' }, connectedTo: ['LOG_001', 'VIZ_001'], flows: [{ id: 'f9', source: 'AUD_001', target: 'VIZ_001', type: 'DATA' }] },
    { id: 'GOV_001', label: 'GOVERNANCE_LEDGER', category: 'GOVERNANCE', x: 1200, y: 350, z: 100, description: 'Immutable decision-trace recorder...', technicalSpecs: { inputs: ['USER_ACTION_JSON', 'SYSTEM_SNAPSHOT', 'AUTH_TOKEN'], outputs: ['HARDENED_AUDIT_LOG', 'RATIONALE_TRACER'], logic: 'Ensures accountability...', doctrine: 'Essential for Legal and Ethical compliance...', verif: 'Audit_Check: Hash_Chain_Integrity' }, connectedTo: ['POL_001'], flows: [] },
    { id: 'VIZ_001', label: 'SYNOPSIS_GATEWAY', category: 'SURFACE', x: 600, y: 530, z: 150, description: 'The unified visual orchestration layer...', technicalSpecs: { inputs: ['RAW_WS_DELTA', 'UI_PRIORITY_MAP', 'CLIENT_LATENCY'], outputs: ['UNIFIED_FRAME', 'ALERT_STREAMS'], logic: 'Prioritizes tracks over static terrain...', doctrine: 'Supports Situational Awareness...', verif: 'Performance: 60fps_Saturation_Rendering' }, connectedTo: ['TACT_001', 'AUD_001', 'API_001'], flows: [] },
    { id: 'API_001', label: 'FASTAPI_BACKEND', category: 'CORE', x: 500, y: 300, z: 300, description: 'Python REST/WS application server routing commands and models.', technicalSpecs: { inputs: ['HTTP_REQ', 'WS_MSG'], outputs: ['JSON_RES', 'WS_BROADCAST'], logic: 'Serves Twin Engine, Monte Carlo Solvers, and orchestrates ML pipelines.', doctrine: 'N/A', verif: 'Pytest Suite' }, connectedTo: ['VIZ_001', 'WS_001', 'ML_001'], flows: [{ id: 'f10', source: 'VIZ_001', target: 'API_001', type: 'DATA' }, { id: 'f11', source: 'API_001', target: 'VIZ_001', type: 'DATA' }] },
    { id: 'WS_001', label: 'WEBSOCKET_MANAGER', category: 'SURFACE', x: 350, y: 250, z: 250, description: 'Handles live high-frequency theater state deltas between Engine and UI.', technicalSpecs: { inputs: ['SIM_TICK', 'DELTA_PAYLOAD'], outputs: ['CLIENT_DELTA_FRAME'], logic: 'Broadcasts deltas at 2s intervals over WSS.', doctrine: 'Situational Awareness', verif: 'Connection Limits' }, connectedTo: ['API_001', 'SCEN_001'], flows: [{ id: 'f12', source: 'SCEN_001', target: 'WS_001', type: 'DATA' }] },
    { id: 'ML_001', label: 'ENSEMBLE_INFERENCE', category: 'INTELLIGENCE', x: 750, y: 150, z: 350, description: 'Local fast-path LightGBM quantile regressor ensemble.', technicalSpecs: { inputs: ['THEATER_STATE_VECTOR', 'POLICY_DELTAS'], outputs: ['TRAJECTORY_P10_P50_P90', 'TRUST_SCORE'], math: 'Variance between 5 LightGBM models = Trust', doctrine: 'Counterfactual Command', verif: 'Model Calibration' }, connectedTo: ['API_001', 'RPA_001'], flows: [{ id: 'f13', source: 'API_001', target: 'ML_001', type: 'DATA' }] },
    { id: 'RPA_001', label: 'RUNPOD_ORCHESTRATOR', category: 'CORE', x: 900, y: 100, z: 400, description: 'Dispatches deep simulations to spot GPUs when ML trust is low.', technicalSpecs: { inputs: ['SCENARIO_PAYLOAD'], outputs: ['JOB_ID', 'PARQUET_RESULTS'], logic: 'Cost-capped 15min execution limit for worker containers.', doctrine: 'N/A', verif: 'Timeout Check' }, connectedTo: ['ML_001', 'AUD_001'], flows: [{ id: 'f14', source: 'ML_001', target: 'RPA_001', type: 'CONTROL' }, { id: 'f15', source: 'RPA_001', target: 'AUD_001', type: 'DATA' }] }
];

const initialState: KnowledgeGraphState = {
  nodes: initialNodes,
  selectedNodeId: null,
  nodes: PLATFORM_KNOWLEDGE_GRAPH_NODES,
  selectedNodeId: 'PLAT_001',
  hoveredNodeId: null,
  searchQuery: '',
  activeCategories: [],
  activeAreas: [],
};

function toggleEntry<T extends string>(list: T[], entry: T): T[] {
  return list.includes(entry)
    ? list.filter(item => item !== entry)
    : [...list, entry];
}

export const KnowledgeGraphStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

    },
    setSearchQuery(query: string) {
      patchState(store, { searchQuery: query });
    }
    },
    toggleCategory(category: NodeCategory) {
      patchState(store, {
        activeCategories: toggleEntry(store.activeCategories(), category),
      });
    },
    toggleArea(area: PlatformArea) {
      patchState(store, {
        activeAreas: toggleEntry(store.activeAreas(), area),
      });
    },
    setViewMode(_mode: KnowledgeGraphViewMode) {
      // Kept for API symmetry with the scaffold-style component.
    },
    selectOnlyCategories(categories: NodeCategory[]) {
      patchState(store, { activeCategories: [...categories] });
    },
    selectOnlyAreas(areas: PlatformArea[]) {
      patchState(store, { activeAreas: [...areas] });
    },
    resetFilters() {
      patchState(store, {
        searchQuery: '',
        activeCategories: [],
        activeAreas: [],
      });
    },
  }))
);
);
src/app/features/knowledge-graph.spec.ts
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { KnowledgeGraph } from './knowledge-graph';

describe('KnowledgeGraph', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KnowledgeGraph],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the expanded platform map and selects the root node by default', () => {
    const fixture = TestBed.createComponent(KnowledgeGraph);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.selectedNode()?.id).toBe('PLAT_001');
    expect(component.visibleNodes().length).toBeGreaterThan(10);
    expect(component.store.nodes().some(node => node.id.startsWith('REFDOC_'))).toBe(true);
    expect(component.store.nodes().some(node => node.id === 'SCAFFOLD_001')).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Platform Knowledge Graph');
    expect(fixture.nativeElement.textContent).toContain('BOREAL_PLATFORM');
  });

  it('filters nodes using the search query', () => {
    const fixture = TestBed.createComponent(KnowledgeGraph);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.onSearch('counterfactual');
    fixture.detectChanges();

    expect(component.visibleNodes().some(node => node.id === 'CF_001')).toBe(true);
    expect(component.visibleNodes().some(node => node.id === 'PLAT_001')).toBe(false);
  });

  it('resets filters back to the canonical root selection', () => {
    const fixture = TestBed.createComponent(KnowledgeGraph);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.onSearch('backend');
    component.toggleCategory('CORE');
    component.clearSelection();
    fixture.detectChanges();

    component.resetFilters();
    fixture.detectChanges();

    expect(component.selectedNode()?.id).toBe('PLAT_001');
    expect(component.visibleNodes().length).toBeGreaterThan(10);
  });
});
src/app/features/knowledge-graph.ts
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnowledgeGraphViewerComponent } from '../shared/ui/knowledge-graph-viewer/knowledge-graph-viewer.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { KnowledgeGraphStore } from '../core/state/knowledge-graph.store';
import {
  PLATFORM_AREAS,
  PLATFORM_NODE_CATEGORIES,
} from '../core/models/platform-knowledge-graph.data';
import {
  KnowledgeGraphViewMode,
  NodeCategory,
  PlatformArea,
  TechNode,
} from '../core/models/knowledge-graph.types';

type ViewEdge = {
  key: string;
  source: TechNode;
  target: TechNode;
  highlighted: boolean;
  active: boolean;
  visible: boolean;
};

@Component({
  selector: 'app-knowledge-graph',
  standalone: true,
  imports: [CommonModule, KnowledgeGraphViewerComponent],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full w-full relative flex overflow-hidden bg-boreal-canvas">
      <!-- Top Bar -->
      <header class="absolute top-0 left-0 right-0 h-14 border-b border-boreal-border bg-boreal-panel/80 backdrop-blur z-10 flex items-center px-6">
        <h1 class="text-boreal-text-primary font-black uppercase tracking-[0.2em] text-sm">Boreal <span class="font-light">Info_Arch</span></h1>
    <div class="flex h-full w-full flex-col overflow-hidden bg-[#05080d] text-[#E2E8F0]">
      <header class="flex items-center justify-between gap-4 border-b border-white/10 bg-[#080c12]/95 px-6 py-4 backdrop-blur">
        <div class="min-w-0">
          <div class="text-[9px] font-black uppercase tracking-[0.35em] text-sky-300/80">Boreal Info_Arch</div>
          <h1 class="mt-1 text-xl font-semibold tracking-tight text-white">Platform Knowledge Graph</h1>
          <p class="mt-1 max-w-3xl text-[11px] leading-relaxed text-slate-400">
            A truth-first map of runtime UI, state, services, backend seams, docs, research, and scaffold assets.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <label class="hidden items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-400 md:flex">
            <span>Search</span>
            <input
              type="text"
              class="w-60 bg-transparent text-[10px] uppercase tracking-[0.16em] text-slate-200 outline-none placeholder:text-slate-500"
              [value]="store.searchQuery()"
              placeholder="label, file, route, who..."
              (input)="onSearch($any($event.target).value)"
            />
          </label>
          <button
            type="button"
            class="rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors"
            [class.border-sky-400]="viewMode() === 'GRAPH'"
            [class.bg-sky-400/10]="viewMode() === 'GRAPH'"
            [class.text-sky-200]="viewMode() === 'GRAPH'"
            [class.border-white/10]="viewMode() !== 'GRAPH'"
            [class.text-slate-400]="viewMode() !== 'GRAPH'"
            (click)="setViewMode('GRAPH')"
          >
            Graph
          </button>
          <button
            type="button"
            class="rounded-sm border px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-colors"
            [class.border-sky-400]="viewMode() === 'TWIN'"
            [class.bg-sky-400/10]="viewMode() === 'TWIN'"
            [class.text-sky-200]="viewMode() === 'TWIN'"
            [class.border-white/10]="viewMode() !== 'TWIN'"
            [class.text-slate-400]="viewMode() !== 'TWIN'"
            (click)="setViewMode('TWIN')"
          >
            Twin
          </button>
          <button
            type="button"
            class="rounded-sm border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:border-white/20 hover:bg-white/5"
            (click)="resetFilters()"
          >
            Reset
          </button>
        </div>
      </header>

      <!-- Viewer -->
      <div class="flex-grow w-full h-full">
        <app-knowledge-graph-viewer [nodes]="store.nodes()"></app-knowledge-graph-viewer>
      </div>
      @if (viewMode() === 'GRAPH') {
        <section class="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <div class="relative min-w-0 flex-1 overflow-hidden border-r border-white/10">
            <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,rgba(5,8,13,0.86),rgba(5,8,13,1))]"></div>

            <div class="absolute left-4 top-4 z-20 flex max-w-[70%] flex-wrap gap-2">
              @for (category of categories; track category) {
                <button
                  type="button"
                  class="rounded-sm border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] transition-colors"
                  [class.border-sky-400]="store.activeCategories().includes(category)"
                  [class.bg-sky-400/10]="store.activeCategories().includes(category)"
                  [class.text-sky-200]="store.activeCategories().includes(category)"
                  [class.border-white/10]="!store.activeCategories().includes(category)"
                  [class.text-slate-400]="!store.activeCategories().includes(category)"
                  (click)="toggleCategory(category)"
                >
                  {{ category }}
                </button>
              }
            </div>

            <div class="absolute right-4 top-4 z-20 flex max-w-[30%] flex-wrap justify-end gap-2">
              @for (area of areas; track area) {
                <button
                  type="button"
                  class="rounded-sm border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] transition-colors"
                  [class.border-sky-400]="store.activeAreas().includes(area)"
                  [class.bg-sky-400/10]="store.activeAreas().includes(area)"
                  [class.text-sky-200]="store.activeAreas().includes(area)"
                  [class.border-white/10]="!store.activeAreas().includes(area)"
                  [class.text-slate-400]="!store.activeAreas().includes(area)"
                  (click)="toggleArea(area)"
                >
                  {{ area }}
                </button>
              }
            </div>

            <div class="absolute bottom-4 left-4 z-20 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.22em] text-slate-400">
              <span>Nodes {{ visibleNodes().length }} / {{ store.nodes().length }}</span>
              <span>Edges {{ visibleEdges().length }}</span>
              <span>Selected {{ selectedNode()?.label ?? 'None' }}</span>
            </div>

            <div class="absolute bottom-4 right-4 z-20 flex items-center gap-2">
              <button
                type="button"
                class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                (click)="zoomOut()"
              >
                Zoom-
              </button>
              <button
                type="button"
                class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                (click)="resetZoom()"
              >
                Reset
              </button>
              <button
                type="button"
                class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                (click)="zoomIn()"
              >
                Zoom+
              </button>
            </div>

            <div class="absolute inset-0 p-6">
              <div class="h-full w-full overflow-hidden rounded-sm border border-white/8 bg-[#05080d]/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div
                  class="h-full w-full transition-transform duration-300 ease-out"
                  [style.transform]="'scale(' + zoom() + ')'"
                  style="transform-origin: center center;"
                >
                  <svg class="h-full w-full select-none" viewBox="0 0 1360 1320" preserveAspectRatio="xMidYMid meet">
                    <g>
                      @for (edge of visibleEdges(); track edge.key) {
                        <line
                          [attr.x1]="edge.source.x"
                          [attr.y1]="edge.source.y"
                          [attr.x2]="edge.target.x"
                          [attr.y2]="edge.target.y"
                          [attr.stroke]="edgeStroke(edge)"
                          [attr.stroke-opacity]="edgeOpacity(edge)"
                          [attr.stroke-width]="edge.highlighted ? 2.4 : 1.1"
                          [attr.stroke-dasharray]="edge.highlighted ? 'none' : '4 6'"
                        />
                      }

                      @for (node of visibleNodes(); track node.id) {
                        <g
                          class="cursor-pointer"
                          tabindex="0"
                          (click)="selectNode(node); $event.stopPropagation()"
                          (keydown.enter)="selectNode(node)"
                          [attr.transform]="'translate(' + node.x + ',' + node.y + ')'"
                        >
                          <circle
                            [attr.r]="isRelatedToSelected(node.id) ? 40 : 32"
                            fill="transparent"
                            [attr.stroke]="isRelatedToSelected(node.id) ? '#fbbf24' : 'rgba(255,255,255,0.06)'"
                            [attr.stroke-opacity]="isRelatedToSelected(node.id) ? 0.35 : 0.18"
                          />

                          @switch (node.category) {
                            @case ('CORE') {
                              <rect
                                x="-8" y="-8" width="16" height="16"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('DECISION') {
                              <rect
                                x="-8" y="-8" width="16" height="16"
                                transform="rotate(45)"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('LOGISTICS') {
                              <path
                                d="M0,-10 L10,8 L-10,8 Z"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('INTELLIGENCE') {
                              <polygon
                                points="0,-10 9,-5 9,5 0,10 -9,5 -9,-5"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @case ('GOVERNANCE') {
                              <circle
                                r="10"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                            @default {
                              <rect
                                x="-10" y="-6" width="20" height="12" rx="4"
                                [attr.fill]="nodeFill(node.area)"
                                [attr.stroke]="nodeStroke(node)"
                                [attr.stroke-width]="nodeStrokeWidth(node)"
                              />
                            }
                          }

                          <text
                            [attr.x]="16"
                            [attr.y]="4"
                            class="pointer-events-none text-[10px] font-black uppercase tracking-[0.22em]"
                            [attr.fill]="isSelected(node.id) ? '#ffffff' : '#d7dce6'"
                            [attr.opacity]="isRelatedToSelected(node.id) ? 1 : 0.55"
                          >
                            {{ node.label }}
                          </text>

                          <text
                            [attr.x]="16"
                            [attr.y]="16"
                            class="pointer-events-none text-[7px] font-mono uppercase tracking-[0.28em]"
                            fill="#94a3b8"
                            [attr.opacity]="isRelatedToSelected(node.id) ? 0.8 : 0.45"
                          >
                            {{ node.area }} / {{ node.status }}
                          </text>
                        </g>
                      }
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <aside class="flex w-full flex-col border-t border-white/10 bg-[#080b11]/95 md:w-[430px] md:border-l md:border-t-0">
            @if (selectedNode(); as node) {
              <div class="flex h-full min-h-0 flex-col overflow-hidden">
                <div class="border-b border-white/10 px-6 py-6">
                  <div class="text-[9px] font-black uppercase tracking-[0.32em] text-sky-300/80">Node Details</div>
                  <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white">{{ node.label }}</h2>
                  <p class="mt-3 text-[12px] leading-relaxed text-slate-300">{{ node.description }}</p>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <div class="grid gap-3 sm:grid-cols-2">
                    <div class="rounded-sm border border-white/10 bg-white/3 p-3">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Status</div>
                      <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{{ node.status }}</div>
                    </div>
                    <div class="rounded-sm border border-white/10 bg-white/3 p-3">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Area</div>
                      <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em]" [style.color]="areaText(node.area)">{{ node.area }}</div>
                    </div>
                  </div>

                  <div class="mt-4 space-y-4">
                    <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">What</div>
                      <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.what }}</p>
                    </div>
                    <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Why</div>
                      <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.why }}</p>
                    </div>
                    <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Who</div>
                      <p class="mt-2 text-[12px] leading-relaxed text-slate-200">{{ node.who }}</p>
                    </div>
                  </div>

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Where</div>
                    <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.where }}</p>
                    @if (node.route) {
                      <a
                        [routerLink]="node.route"
                        class="mt-3 inline-flex rounded-sm border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.24em] text-sky-200 transition-colors hover:bg-sky-400/15"
                      >
                        Open Route
                      </a>
                    }
                  </div>

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Source</div>
                    <code class="mt-2 block break-all text-[10px] text-sky-200">{{ node.sourcePath ?? 'No explicit source path' }}</code>
                  </div>

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Technical Spec</div>
                    <div class="mt-3 grid gap-3">
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Inputs</div>
                        <div class="mt-2 flex flex-wrap gap-2">
                          @for (input of node.technicalSpecs.inputs; track input) {
                            <span class="rounded-sm border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-200">{{ input }}</span>
                          }
                        </div>
                      </div>
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Outputs</div>
                        <div class="mt-2 flex flex-wrap gap-2">
                          @for (output of node.technicalSpecs.outputs; track output) {
                            <span class="rounded-sm border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">{{ output }}</span>
                          }
                        </div>
                      </div>
                      @if (node.technicalSpecs.logic) {
                        <div>
                          <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Logic</div>
                          <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.logic }}</p>
                        </div>
                      }
                      @if (node.technicalSpecs.math) {
                        <div>
                          <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Math</div>
                          <p class="mt-2 whitespace-pre-line font-mono text-[10px] leading-relaxed text-slate-300">{{ node.technicalSpecs.math }}</p>
                        </div>
                      }
                      @if (node.technicalSpecs.doctrine) {
                        <div>
                          <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Doctrine</div>
                          <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.doctrine }}</p>
                        </div>
                      }
                      @if (node.technicalSpecs.verif) {
                        <div>
                          <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Verification</div>
                          <p class="mt-2 text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.verif }}</p>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="mt-4 rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Related Nodes</div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      @for (related of relatedNodes(); track related.id) {
                        <button
                          type="button"
                          class="rounded-sm border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10"
                          (click)="selectNode(related)"
                        >
                          {{ related.label }}
                        </button>
                      }
                    </div>
                  </div>

      <!-- Detail Panel Overlay -->
      @if (store.selectedNodeId()) {
        <div class="absolute top-14 right-0 bottom-0 w-80 bg-boreal-panel/95 backdrop-blur border-l border-boreal-border z-20 p-6 animate-in slide-in-from-right">
           <h2 class="text-boreal-text-primary font-bold uppercase tracking-widest mb-4">Node Details</h2>
           <p class="text-xs text-boreal-blue font-mono mb-4">{{ store.selectedNodeId() }} selected.</p>
           
           @if (selectedNode(); as node) {
             <div class="space-y-4">
                <div>
                   <h3 class="text-[9px] uppercase tracking-widest text-boreal-text-muted mb-1">Description</h3>
                   <p class="text-[10px] text-boreal-text-primary leading-relaxed">{{ node.description }}</p>
                  <div class="mt-4 flex gap-2">
                    <button
                      type="button"
                      class="rounded-sm border border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                      (click)="clearSelection()"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      class="rounded-sm border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-sky-200 transition-colors hover:bg-sky-400/15"
                      (click)="setViewMode('TWIN')"
                    >
                      Step Into Twin
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <div class="flex h-full items-center justify-center p-8 text-center text-slate-400">
                <div>
                   <h3 class="text-[9px] uppercase tracking-widest text-boreal-text-muted mb-1">Doctrinal Mapping</h3>
                   <p class="text-[10px] text-amber-500 font-mono italic">"{{ node.technicalSpecs.doctrine }}"</p>
                  <div class="text-[9px] font-black uppercase tracking-[0.32em] text-slate-500">No selection</div>
                  <p class="mt-3 text-[12px] leading-relaxed">
                    Select a node to inspect its route anchors, supporting files, and dependency links.
                  </p>
                </div>
             </div>
           }
              </div>
            }
          </aside>
        </section>
      } @else {
        <section class="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
          <div class="min-h-0 overflow-y-auto border-r border-white/10 px-6 py-6">
            @if (selectedNode(); as node) {
              <div class="max-w-4xl">
                <div class="text-[9px] font-black uppercase tracking-[0.32em] text-sky-300/80">Twin Portal</div>
                <h2 class="mt-2 text-4xl font-semibold tracking-tight text-white">{{ node.label }}</h2>
                <p class="mt-3 max-w-3xl text-[13px] leading-relaxed text-slate-300">{{ node.description }}</p>

                <div class="mt-6 grid gap-3 sm:grid-cols-3">
                  <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Status</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{{ node.status }}</div>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Category</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white">{{ node.category }}</div>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Area</div>
                    <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.18em]" [style.color]="areaText(node.area)">{{ node.area }}</div>
                  </div>
                </div>

                <div class="mt-6 grid gap-4 lg:grid-cols-2">
                  <div class="rounded-sm border border-white/10 bg-white/3 p-5">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">What / Why</div>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-200">{{ node.what }}</p>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-300">{{ node.why }}</p>
                  </div>
                  <div class="rounded-sm border border-white/10 bg-white/3 p-5">
                    <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Where / Who</div>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-200">{{ node.where }}</p>
                    <p class="mt-3 text-[12px] leading-relaxed text-slate-300">{{ node.who }}</p>
                  </div>
                </div>

                <div class="mt-6 rounded-sm border border-white/10 bg-white/3 p-5">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Technical Spec</div>
                  <div class="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Inputs</div>
                      <div class="mt-2 flex flex-wrap gap-2">
                        @for (input of node.technicalSpecs.inputs; track input) {
                          <span class="rounded-sm border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-200">{{ input }}</span>
                        }
                      </div>
                    </div>
                    <div>
                      <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Outputs</div>
                      <div class="mt-2 flex flex-wrap gap-2">
                        @for (output of node.technicalSpecs.outputs; track output) {
                          <span class="rounded-sm border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">{{ output }}</span>
                        }
                      </div>
                    </div>
                    @if (node.technicalSpecs.logic) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Logic</div>
                        <p class="mt-2 text-[12px] leading-relaxed text-slate-300">{{ node.technicalSpecs.logic }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.math) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Math</div>
                        <p class="mt-2 whitespace-pre-line font-mono text-[11px] leading-relaxed text-slate-300">{{ node.technicalSpecs.math }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.doctrine) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Doctrine</div>
                        <p class="mt-2 text-[12px] leading-relaxed text-slate-300">{{ node.technicalSpecs.doctrine }}</p>
                      </div>
                    }
                    @if (node.technicalSpecs.verif) {
                      <div>
                        <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Verification</div>
                        <p class="mt-2 text-[12px] leading-relaxed text-slate-300">{{ node.technicalSpecs.verif }}</p>
                      </div>
                    }
                  </div>
                </div>

                <div class="mt-6 rounded-sm border border-white/10 bg-white/3 p-5">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Source Anchors</div>
                  <div class="mt-3 grid gap-2 text-[11px] leading-relaxed text-slate-300">
                    <code class="break-all rounded-sm border border-white/10 bg-black/20 px-3 py-2 text-sky-200">{{ node.sourcePath ?? 'No explicit source path' }}</code>
                    <code class="break-all rounded-sm border border-white/10 bg-black/20 px-3 py-2 text-slate-300">{{ node.where }}</code>
                  </div>
                </div>

                <div class="mt-6 flex items-center gap-2">
                  @if (node.route) {
                    <a
                      [routerLink]="node.route"
                      class="rounded-sm border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-sky-200 transition-colors hover:bg-sky-400/15"
                    >
                      Open Route
                    </a>
                  }
                  <button
                    type="button"
                    class="rounded-sm border border-white/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-slate-300 transition-colors hover:bg-white/5"
                    (click)="setViewMode('GRAPH')"
                  >
                    Return To Graph
                  </button>
                </div>
              </div>
            } @else {
              <div class="flex h-full items-center justify-center p-8 text-slate-400">
                No node selected.
              </div>
            }
          </div>

          <aside class="min-h-0 overflow-y-auto px-6 py-6">
            @if (selectedNode(); as node) {
              <div class="space-y-4">
                <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Neighborhood</div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (related of relatedNodes(); track related.id) {
                      <button
                        type="button"
                        class="rounded-sm border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-slate-200 transition-colors hover:border-sky-400/30 hover:bg-sky-400/10"
                        (click)="selectNode(related)"
                      >
                        {{ related.label }}
                      </button>
                    }
                  </div>
                </div>

                <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Graph Metrics</div>
                  <div class="mt-3 grid gap-3 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    <div class="flex items-center justify-between">
                      <span>Visible nodes</span>
                      <span>{{ visibleNodes().length }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Visible edges</span>
                      <span>{{ visibleEdges().length }}</span>
                    </div>
                    <div class="flex items-center justify-between">
                      <span>Filters active</span>
                      <span>{{ hasFilters() ? 'Yes' : 'No' }}</span>
                    </div>
                  </div>
                </div>

           <button (click)="store.selectNode(null)" class="mt-8 text-[10px] uppercase font-black text-boreal-blue border border-boreal-blue/30 px-4 py-2 rounded hover:bg-boreal-blue/10 transition-colors">Close_Panel</button>
        </div>
                <div class="rounded-sm border border-white/10 bg-white/3 p-4">
                  <div class="text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">Current Filters</div>
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (category of store.activeCategories(); track category) {
                      <span class="rounded-sm border border-sky-400/20 bg-sky-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-sky-200">
                        {{ category }}
                      </span>
                    }
                    @for (area of store.activeAreas(); track area) {
                      <span class="rounded-sm border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                        {{ area }}
                      </span>
                    }
                    @if (store.searchQuery()) {
                      <span class="rounded-sm border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200">
                        {{ store.searchQuery() }}
                      </span>
                    }
                    @if (!hasFilters()) {
                      <span class="text-[10px] uppercase tracking-[0.18em] text-slate-500">No filters active</span>
                    }
                  </div>
                </div>
              </div>
            }
          </aside>
        </section>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .animate-in { animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }
  `]
  `],
})
export class KnowledgeGraph {
  store = inject(KnowledgeGraphStore);

  readonly categories = PLATFORM_NODE_CATEGORIES;
  readonly areas = PLATFORM_AREAS;

  viewMode = signal<KnowledgeGraphViewMode>('GRAPH');
  zoom = signal(1);

  selectedNode = computed(() => {
    const id = this.store.selectedNodeId();
    if (!id) return null;
    return this.store.nodes().find(n => n.id === id) || null;
    return this.store.nodes().find(node => node.id === id) ?? null;
  });

  visibleNodeIds = computed(() => {
    const query = this.store.searchQuery().trim().toLowerCase();
    const categories = this.store.activeCategories();
    const areas = this.store.activeAreas();
    const nodes = this.store.nodes();

    return new Set(
      nodes
        .filter((node) => {
          const haystack = [
            node.id,
            node.label,
            node.description,
            node.what,
            node.why,
            node.where,
            node.who,
            node.route ?? '',
            node.sourcePath ?? '',
            node.technicalSpecs.inputs.join(' '),
            node.technicalSpecs.outputs.join(' '),
            node.technicalSpecs.logic ?? '',
            node.technicalSpecs.math ?? '',
            node.technicalSpecs.doctrine ?? '',
            node.technicalSpecs.verif ?? '',
          ].join(' ').toLowerCase();

          const matchesQuery = !query || haystack.includes(query);
          const matchesCategory = categories.length === 0 || categories.includes(node.category);
          const matchesArea = areas.length === 0 || (node.area ? areas.includes(node.area) : true);

          return matchesQuery && matchesCategory && matchesArea;
        })
        .map(node => node.id),
    );
  });

  visibleNodes = computed(() => {
    const ids = this.visibleNodeIds();
    return this.store.nodes().filter(node => ids.has(node.id));
  });

  relatedNodeIds = computed(() => {
    const selected = this.selectedNode();
    if (!selected) return new Set<string>();

    const related = new Set<string>([selected.id]);
    for (const id of selected.connectedTo) {
      related.add(id);
    }
    for (const node of this.store.nodes()) {
      if (node.connectedTo.includes(selected.id)) {
        related.add(node.id);
      }
    }

    return related;
  });

  relatedNodes = computed(() => {
    const ids = this.relatedNodeIds();
    return this.store.nodes().filter(node => ids.has(node.id));
  });

  visibleEdges = computed<ViewEdge[]>(() => {
    const nodes = this.store.nodes();
    const nodesById = new Map(nodes.map(node => [node.id, node] as const));
    const visibleIds = this.visibleNodeIds();
    const selected = this.selectedNode();
    const hasFilters = this.hasFilters();
    const edges: ViewEdge[] = [];

    for (const source of nodes) {
      for (const targetId of source.connectedTo) {
        const target = nodesById.get(targetId);
        if (!target) continue;

        const sourceVisible = visibleIds.has(source.id);
        const targetVisible = visibleIds.has(target.id);
        const relationShown = !!selected && (source.id === selected.id || target.id === selected.id);
        const visible = relationShown || !hasFilters || (sourceVisible && targetVisible);

        if (!visible) continue;

        edges.push({
          key: `${source.id}__${target.id}`,
          source,
          target,
          highlighted: !!selected && (source.id === selected.id || target.id === selected.id),
          active: sourceVisible && targetVisible,
          visible,
        });
      }
    }

    return edges;
  });

  hasFilters = computed(() =>
    this.store.searchQuery().trim().length > 0 ||
    this.store.activeCategories().length > 0 ||
    this.store.activeAreas().length > 0,
  );

  selectNode(node: TechNode) {
    this.store.selectNode(node.id);
  }

  clearSelection() {
    this.store.selectNode(null);
  }

  setViewMode(mode: KnowledgeGraphViewMode) {
    this.viewMode.set(mode);
    this.store.setViewMode(mode);
  }

  toggleCategory(category: NodeCategory) {
    this.store.toggleCategory(category);
  }

  toggleArea(area: PlatformArea) {
    this.store.toggleArea(area);
  }

  resetFilters() {
    this.store.resetFilters();
    this.store.selectNode('PLAT_001');
    this.resetZoom();
  }

  zoomIn() {
    this.zoom.update(value => Math.min(1.6, value + 0.08));
  }

  zoomOut() {
    this.zoom.update(value => Math.max(0.72, value - 0.08));
  }

  resetZoom() {
    this.zoom.set(1);
  }

  edgeStroke(edge: ViewEdge): string {
    if (edge.highlighted) return '#fbbf24';
    if (edge.active) return '#334155';
    return '#1f2937';
  }

  edgeOpacity(edge: ViewEdge): number {
    if (edge.highlighted) return 0.85;
    if (edge.active) return 0.35;
    return 0.18;
  }

  nodeFill(area?: PlatformArea): string {
    return this.areaColor(area);
  }

  nodeStroke(node: TechNode): string {
    if (this.isSelected(node.id)) return '#fbbf24';
    if (this.isRelatedToSelected(node.id)) return '#94a3b8';
    return this.areaStroke(node.area);
  }

  nodeStrokeWidth(node: TechNode): number {
    if (this.isSelected(node.id)) return 2.2;
    if (this.isRelatedToSelected(node.id)) return 1.5;
    return 1.1;
  }

  areaText(area?: PlatformArea): string {
    switch (area) {
      case 'runtime':
        return '#7dd3fc';
      case 'backend':
        return '#c4b5fd';
      case 'docs':
        return '#6ee7b7';
      case 'research':
        return '#fbbf24';
      case 'scaffold':
        return '#cbd5e1';
      default:
        return '#cbd5e1';
    }
  }

  areaColor(area?: PlatformArea): string {
    switch (area) {
      case 'runtime':
        return 'rgba(56, 189, 248, 0.28)';
      case 'backend':
        return 'rgba(167, 139, 250, 0.28)';
      case 'docs':
        return 'rgba(52, 211, 153, 0.24)';
      case 'research':
        return 'rgba(251, 191, 36, 0.26)';
      case 'scaffold':
        return 'rgba(148, 163, 184, 0.22)';
      default:
        return 'rgba(148, 163, 184, 0.22)';
    }
  }

  areaStroke(area?: PlatformArea): string {
    switch (area) {
      case 'runtime':
        return '#38bdf8';
      case 'backend':
        return '#a78bfa';
      case 'docs':
        return '#34d399';
      case 'research':
        return '#fbbf24';
      case 'scaffold':
        return '#94a3b8';
      default:
        return '#94a3b8';
    }
  }

  isSelected(nodeId: string): boolean {
    return this.selectedNode()?.id === nodeId;
  }

  isRelatedToSelected(nodeId: string): boolean {
    return this.relatedNodeIds().has(nodeId);
  }

  onSearch(value: string) {
    this.store.setSearchQuery(value);
  }
}
src/app/features/reference/reference.manifest.ts



      { label: 'Capability layer switch', path: 'src/app/shared/ui/capability-layer-switch.ts', note: 'Public capability remapping control in the command bar.' },
      { label: 'Capability layer store', path: 'src/app/core/state/capability-layer.store.ts', note: 'Cross-domain track remapping and audit logging.' },
      { label: 'C2 resilience lab', path: 'src/app/features/c2-resilience-lab.ts', note: 'Route-level resilience view backed by the decision fabric store.' },
      { label: 'Knowledge graph', path: 'src/app/features/knowledge-graph.ts', note: 'Route-level KGSA view behind the feature flag gate.' },
      { label: 'Knowledge graph', path: 'src/app/features/knowledge-graph.ts', note: 'Route-level KGSA and platform-map surface.' },
      { label: 'Counterfactual lab', path: 'src/app/features/counterfactual-lab.ts', note: 'Policy perturbation lab with an external ML endpoint dependency.' },
      { label: 'Counterfactual lab store', path: 'src/app/core/ml/counterfactual-lab.store.ts', note: 'Local state for trajectory, trust, and perturbations.' },
      { label: 'Sensor feed store', path: 'src/app/core/state/sensor-feed.store.ts', note: 'Live/mock/replay theater feed adapter.' },

        summary: 'Several features are present but still rely on local heuristics, seed data, or back-end fallbacks.',
        bullets: [
          'Public capability layer is implemented as a live remapping switch over synthetic tracks and public-source cards.',
          'Knowledge graph situation awareness is gated and seeded.',
          'Knowledge graph situation awareness is now a first-class platform map with seed-backed data where the repo still needs it.',
          'Robustness lab and counterfactual flows are useful but not fully productionized.',
          'Counterfactual lab currently calls an ML endpoint, and the repo-root `api/ml` and `scripts/ml` trees provide inference, RunPod orchestration, training, and cleanup code.',
          'C2 resilience is a heuristic prototype that computes a score and collapse horizon from track and policy state.',

      { label: 'KGSA model', path: 'src/app/shared/domain/kgsa.ts', note: 'Knowledge graph schema and seed data.' },
      { label: 'Logistics ontology', path: 'src/app/shared/domain/logistics-ontology.ts', note: 'Supply and corridor model.' },
      { label: 'C2 resilience lab', path: 'src/app/features/c2-resilience-lab.ts', note: 'Consumer of the decision fabric twin.' },
      { label: 'Knowledge graph route', path: 'src/app/features/knowledge-graph.ts', note: 'Consumer of the KGSA graph model.' },
      { label: 'Knowledge graph route', path: 'src/app/features/knowledge-graph.ts', note: 'Consumer of the KGSA graph model and platform manifest.' },
    ],
    sections: [
      {

          'Decision fabric resilience and friction pulses.',
          'Knowledge graph nodes, edges, hypotheses, and weak signals.',
          'The C2 resilience lab turns the decision fabric twin into a route-level operational display.',
          'The knowledge graph route turns the in-memory KGSA seed data into an analyst-facing graph view.',
          'The knowledge graph route turns the in-memory KGSA seed data and platform manifest into an analyst-facing graph view.',
        ],
      },
      {




 