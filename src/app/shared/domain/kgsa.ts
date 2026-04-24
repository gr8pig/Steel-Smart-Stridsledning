/**
 * KGSA — Knowledge Graph for Situation Awareness
 *
 * In-memory typed graph: no external graph database required.
 * Nodes represent entities (tracks, signals, hypotheses, bases).
 * Edges represent causal or correlational relationships with confidence scores.
 * Designed to surface weak-signal chains that individual store signals don't capture.
 */

export type KgsaNodeType = 'TRACK' | 'SIGNAL' | 'HYPOTHESIS' | 'BASE' | 'EVENT';
export type KgsaEdgeType = 'CAUSAL' | 'CORRELATIONAL' | 'CONTRADICTS' | 'SUPPORTS';
export type HypothesisStatus = 'ACTIVE' | 'CONFIRMED' | 'REFUTED' | 'DORMANT';

export interface KgsaNode {
  id: string;
  type: KgsaNodeType;
  label: string;
  description: string;
  confidence: number;       // 0-1
  timestamp: string;        // ISO
  linkedTrackId?: string;   // links to ThreatTwin.id if applicable
  linkedBaseId?: string;    // links to BaseTwin.id if applicable
  tags: string[];
}

export interface KgsaEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  type: KgsaEdgeType;
  confidence: number;       // 0-1
  label: string;            // short description of the relationship
  timestamp: string;
}

export interface KgsaHypothesis {
  id: string;
  title: string;
  description: string;
  status: HypothesisStatus;
  confidence: number;
  evidenceNodeIds: string[];
  timestamp: string;
  analystNote?: string;
}

export interface WeakSignalEntry {
  id: string;
  signal: string;
  trackId?: string;
  baseId?: string;
  strength: number;         // 0-1; how clearly the signal was observed
  novelty: number;          // 0-1; how unexpected this is
  timestamp: string;
}

// ── Seed data — translating scope-cuts causal chains into current repo language ─

export const SEED_KGSA_NODES: KgsaNode[] = [
  // Jammer spike → pre-strike suppression chain
  {
    id: 'KN-001', type: 'SIGNAL', label: 'Jammer Spike Detected',
    description: 'Broadband jamming spike observed across Sector 4 sensor grid. Exceeds baseline by 28dB.',
    confidence: 0.78, timestamp: new Date(Date.now() - 900_000).toISOString(),
    linkedTrackId: 'TRK-002', tags: ['jamming', 'EW', 'suppression'],
  },
  {
    id: 'KN-002', type: 'HYPOTHESIS', label: 'Pre-Strike EW Suppression',
    description: 'Jammer activity pattern consistent with suppression window before high-value kinetic strike.',
    confidence: 0.65, timestamp: new Date(Date.now() - 780_000).toISOString(),
    tags: ['hypothesis', 'pre-strike', 'EW'],
  },
  {
    id: 'KN-003', type: 'TRACK', label: 'TRK-001 Strike Profile',
    description: 'Missile track TRK-001 with 89% strike confidence. Trajectory aligned with Boreal Watch.',
    confidence: 0.89, timestamp: new Date(Date.now() - 600_000).toISOString(),
    linkedTrackId: 'TRK-001', tags: ['track', 'missile', 'STRIKE'],
  },

  // Convoy + depot activity → second-wave preparation chain
  {
    id: 'KN-004', type: 'SIGNAL', label: 'Convoy Movement Observed',
    description: 'Logistics convoy movement detected near Southern Redoubt. Vehicle count: 12+. Heading north.',
    confidence: 0.60, timestamp: new Date(Date.now() - 1_800_000).toISOString(),
    tags: ['logistics', 'convoy', 'south'],
  },
  {
    id: 'KN-005', type: 'SIGNAL', label: 'Depot Activity Surge',
    description: 'Thermal signature surge at Spear Point Base depot. Consistent with weapons loading.',
    confidence: 0.54, timestamp: new Date(Date.now() - 1_500_000).toISOString(),
    linkedBaseId: 'BASE-4', tags: ['depot', 'thermal', 'loading'],
  },
  {
    id: 'KN-006', type: 'HYPOTHESIS', label: 'Second-Wave Preparation',
    description: 'Convoy + depot surge pattern indicates second wave staging. Estimated T+2h to launch window.',
    confidence: 0.57, timestamp: new Date(Date.now() - 1_200_000).toISOString(),
    tags: ['hypothesis', 'second-wave', 'timing'],
  },

  // Multiple feints → main strike preparation chain
  {
    id: 'KN-007', type: 'TRACK', label: 'TRK-002 Feint Vector',
    description: 'Drone TRK-002 executing erratic heading changes. Feint classification: 54%.',
    confidence: 0.54, timestamp: new Date(Date.now() - 300_000).toISOString(),
    linkedTrackId: 'TRK-002', tags: ['feint', 'drone', 'deception'],
  },
  {
    id: 'KN-008', type: 'TRACK', label: 'TRK-005 Probe Vector',
    description: 'Slow-speed drone TRK-005 on reconnaissance profile toward BASE-3.',
    confidence: 0.48, timestamp: new Date(Date.now() - 240_000).toISOString(),
    linkedTrackId: 'TRK-005', tags: ['probe', 'drone', 'reconnaissance'],
  },
  {
    id: 'KN-009', type: 'HYPOTHESIS', label: 'Multi-Feint Main Strike Preparation',
    description: 'Coordinated feint + probe pattern preceding historical saturation strikes. Recommend COA review.',
    confidence: 0.72, timestamp: new Date(Date.now() - 120_000).toISOString(),
    tags: ['hypothesis', 'saturation', 'main-strike'],
  },

  // Base readiness signal
  {
    id: 'KN-010', type: 'BASE', label: 'BASE-3 Degraded Readiness',
    description: 'Eastern Sentinel at 64% readiness with degraded runway. Viable second-wave targeting candidate.',
    confidence: 0.91, timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    linkedBaseId: 'BASE-3', tags: ['base', 'readiness', 'degraded'],
  },
];

export const SEED_KGSA_EDGES: KgsaEdge[] = [
  {
    id: 'KE-001', fromNodeId: 'KN-001', toNodeId: 'KN-002',
    type: 'CAUSAL', confidence: 0.70,
    label: 'Jammer spike enables suppression window',
    timestamp: new Date(Date.now() - 750_000).toISOString(),
  },
  {
    id: 'KE-002', fromNodeId: 'KN-002', toNodeId: 'KN-003',
    type: 'SUPPORTS', confidence: 0.65,
    label: 'EW suppression precedes confirmed strike track',
    timestamp: new Date(Date.now() - 600_000).toISOString(),
  },
  {
    id: 'KE-003', fromNodeId: 'KN-004', toNodeId: 'KN-006',
    type: 'CORRELATIONAL', confidence: 0.55,
    label: 'Convoy movement correlates with second-wave staging',
    timestamp: new Date(Date.now() - 1_200_000).toISOString(),
  },
  {
    id: 'KE-004', fromNodeId: 'KN-005', toNodeId: 'KN-006',
    type: 'CORRELATIONAL', confidence: 0.58,
    label: 'Depot surge confirms weapon preparation',
    timestamp: new Date(Date.now() - 1_200_000).toISOString(),
  },
  {
    id: 'KE-005', fromNodeId: 'KN-007', toNodeId: 'KN-009',
    type: 'CAUSAL', confidence: 0.60,
    label: 'Coordinated feint is precursor indicator',
    timestamp: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: 'KE-006', fromNodeId: 'KN-008', toNodeId: 'KN-009',
    type: 'CAUSAL', confidence: 0.55,
    label: 'Probe vector maps defender sensor coverage',
    timestamp: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: 'KE-007', fromNodeId: 'KN-009', toNodeId: 'KN-003',
    type: 'SUPPORTS', confidence: 0.68,
    label: 'Multi-feint pattern supports pending kinetic strike',
    timestamp: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    id: 'KE-008', fromNodeId: 'KN-006', toNodeId: 'KN-010',
    type: 'CAUSAL', confidence: 0.50,
    label: 'Second wave likely targets degraded BASE-3',
    timestamp: new Date(Date.now() - 600_000).toISOString(),
  },
];

export const SEED_HYPOTHESES: KgsaHypothesis[] = [
  {
    id: 'KH-001', title: 'Pre-Strike EW Suppression Window',
    description: 'Jammer spike followed by high-confidence missile track suggests coordinated suppression before kinetic strike.',
    status: 'ACTIVE', confidence: 0.65,
    evidenceNodeIds: ['KN-001', 'KN-002', 'KN-003'],
    timestamp: new Date(Date.now() - 780_000).toISOString(),
  },
  {
    id: 'KH-002', title: 'Second Wave Staging (T+2h)',
    description: 'Convoy + depot activity indicates second wave being staged. Estimated launch window: T+2h.',
    status: 'ACTIVE', confidence: 0.57,
    evidenceNodeIds: ['KN-004', 'KN-005', 'KN-006'],
    timestamp: new Date(Date.now() - 1_200_000).toISOString(),
  },
  {
    id: 'KH-003', title: 'Multi-Feint Main Strike Preparation',
    description: 'Coordinated feint + probe pattern is historical indicator of imminent saturation strike.',
    status: 'ACTIVE', confidence: 0.72,
    evidenceNodeIds: ['KN-007', 'KN-008', 'KN-009'],
    timestamp: new Date(Date.now() - 120_000).toISOString(),
  },
];
