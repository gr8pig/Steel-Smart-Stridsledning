import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { TechNode } from '../models/knowledge-graph.types';

export interface KnowledgeGraphState {
  nodes: TechNode[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
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
  hoveredNodeId: null,
  searchQuery: '',
};

export const KnowledgeGraphStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setNodes(nodes: TechNode[]) {
      patchState(store, { nodes });
    },
    selectNode(id: string | null) {
      patchState(store, { selectedNodeId: id });
    },
    hoverNode(id: string | null) {
      patchState(store, { hoveredNodeId: id });
    },
    setSearchQuery(query: string) {
      patchState(store, { searchQuery: query });
    }
  }))
);