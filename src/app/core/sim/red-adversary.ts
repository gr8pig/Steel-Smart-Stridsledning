/**
 * Red Adversary Policy — TypeScript heuristic implementation.
 *
 * This is NOT MCTS. It is a pluggable heuristic policy engine with an interface
 * designed for optional bounded lookahead in the future. Behaviors are named
 * honestly to match what the code actually does.
 *
 * Used by:
 *   - server.ts /api/lab/run for adversarial scenario generation
 *   - RobustnessLab (client-side, via store or direct import)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type RedModel = 'DECEPTIVE' | 'SATURATION' | 'KINETIC';
export type RedAction = 'REDIRECT' | 'LOITER' | 'SATURATION_BURST' | 'DECOY_INJECTION' | 'DIRECT_STRIKE';

export interface TrackState {
  id: string;
  class: string;
  intent: string;
  confidence: number;
  timeToTarget: number;
  velocity: number;
  jammingProbability: number;
  status: string;
}

export interface TheaterState {
  tracks: TrackState[];
  baseReadiness: Record<string, number>;   // baseId → 0-1
  interceptorCounts: Record<string, number>;
  jammerSeverity: number;                  // 1-3
  trackDegradation: number;                // 1-3
}

export interface RedAdversaryAction {
  action: RedAction;
  targetTrackId?: string;
  rationale: string;
  estimatedImpact: number;                 // 0-1 expected degradation to blue
}

export interface AdversaryPolicyResult {
  actions: RedAdversaryAction[];
  robustnessImpact: number;                // 0-1 aggregate blue degradation factor
  primaryThreat: string;                   // description of the main threat vector
}

// ── Policy interface — extensible for future lookahead ────────────────────────

export interface AdversaryPolicy {
  readonly model: RedModel;
  selectActions(state: TheaterState): AdversaryPolicyResult;
}

// ── Heuristic implementations ─────────────────────────────────────────────────

export class DeceptiveRedPolicy implements AdversaryPolicy {
  readonly model = 'DECEPTIVE' as const;

  selectActions(state: TheaterState): AdversaryPolicyResult {
    const actions: RedAdversaryAction[] = [];
    const j = state.jammerSeverity;

    // Increase jamming to mask real strike tracks
    actions.push({
      action: 'DECOY_INJECTION',
      rationale: 'Inject decoy tracks to saturate defender classification bandwidth.',
      estimatedImpact: 0.08 + j * 0.04,
    });

    // Redirect the highest-velocity track to exploit sensor gap
    const fastTrack = [...state.tracks]
      .filter(t => t.status !== 'NEUTRALIZED')
      .sort((a, b) => b.velocity - a.velocity)[0];

    if (fastTrack) {
      actions.push({
        action: 'REDIRECT',
        targetTrackId: fastTrack.id,
        rationale: `Redirect ${fastTrack.id} through sensor gap created by jamming suppression.`,
        estimatedImpact: 0.10 + (1 - fastTrack.confidence) * 0.15,
      });
    }

    // Loiter low-confidence tracks to exhaust sensor dwell time
    const lowConf = state.tracks.filter(t => t.confidence < 0.55 && t.status !== 'NEUTRALIZED');
    for (const t of lowConf.slice(0, 2)) {
      actions.push({
        action: 'LOITER',
        targetTrackId: t.id,
        rationale: `${t.id} loiters to exhaust sensor dwell allocation — enables feint masking.`,
        estimatedImpact: 0.05,
      });
    }

    const robustnessImpact = this._aggregateImpact(actions, j);
    return {
      actions,
      robustnessImpact,
      primaryThreat: `Feint-Heavy Saturation at S_J > ${j * 10}dB`,
    };
  }

  private _aggregateImpact(actions: RedAdversaryAction[], j: number): number {
    const base = actions.reduce((sum, a) => sum + a.estimatedImpact, 0);
    return Math.min(0.45, base * (1 + (j - 1) * 0.1));
  }
}

export class SaturationRedPolicy implements AdversaryPolicy {
  readonly model = 'SATURATION' as const;

  selectActions(state: TheaterState): AdversaryPolicyResult {
    const actions: RedAdversaryAction[] = [];

    // Find the most-depleted base to target
    const targetBaseId = Object.entries(state.baseReadiness)
      .sort(([, a], [, b]) => a - b)[0]?.[0];

    // Mass saturation burst
    actions.push({
      action: 'SATURATION_BURST',
      rationale: `Simultaneous multi-vector strike toward ${targetBaseId ?? 'primary base'}. Volume exceeds interceptor capacity.`,
      estimatedImpact: 0.18 + state.jammerSeverity * 0.04,
    });

    // Redirect any loitering tracks to exploit depleted interceptors
    const depleted = Object.entries(state.interceptorCounts)
      .filter(([, c]) => c < 5)
      .map(([id]) => id);
    if (depleted.length > 0) {
      actions.push({
        action: 'REDIRECT',
        rationale: `Exploit interceptor shortage at ${depleted.join(', ')}.`,
        estimatedImpact: 0.12,
      });
    }

    const robustnessImpact = Math.min(0.55, actions.reduce((s, a) => s + a.estimatedImpact, 0));
    return {
      actions,
      robustnessImpact,
      primaryThreat: `Volume Swarm > ${6 + state.jammerSeverity} Simultaneous Vectors`,
    };
  }
}

export class KineticRedPolicy implements AdversaryPolicy {
  readonly model = 'KINETIC' as const;

  selectActions(state: TheaterState): AdversaryPolicyResult {
    const actions: RedAdversaryAction[] = [];

    // Direct high-confidence strike
    const strike = state.tracks
      .filter(t => t.confidence >= 0.75 && t.status !== 'NEUTRALIZED')
      .sort((a, b) => a.timeToTarget - b.timeToTarget)[0];

    if (strike) {
      actions.push({
        action: 'DIRECT_STRIKE',
        targetTrackId: strike.id,
        rationale: `${strike.id} executes direct kinetic profile. Time-critical — defender must commit.`,
        estimatedImpact: 0.08 * strike.confidence,
      });
    }

    // Kinetic multi-axis: saturate with remaining fast tracks
    const fastTracks = state.tracks
      .filter(t => t.velocity > 300 && t.status !== 'NEUTRALIZED' && t.id !== strike?.id)
      .slice(0, 2);
    for (const t of fastTracks) {
      actions.push({
        action: 'DIRECT_STRIKE',
        targetTrackId: t.id,
        rationale: `Secondary kinetic axis ${t.id} forces split engagement.`,
        estimatedImpact: 0.06,
      });
    }

    const robustnessImpact = Math.min(0.38, actions.reduce((s, a) => s + a.estimatedImpact, 0));
    return {
      actions,
      robustnessImpact,
      primaryThreat: 'Simultaneous Multi-Axis Kinetic Strike',
    };
  }
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createAdversaryPolicy(model: RedModel): AdversaryPolicy {
  switch (model) {
    case 'DECEPTIVE':  return new DeceptiveRedPolicy();
    case 'SATURATION': return new SaturationRedPolicy();
    case 'KINETIC':    return new KineticRedPolicy();
  }
}

/**
 * Compute an adjusted robustness score incorporating adversary heuristics.
 * This replaces the flat lookup table in server.ts with policy-derived deltas.
 */
export function computeAdversaryImpact(
  model: RedModel,
  state: TheaterState,
  baseRobustness: number,
): { robustness: number; primaryThreat: string; correctionRecommendation: string } {
  const policy  = createAdversaryPolicy(model);
  const result  = policy.selectActions(state);
  const adjusted = Math.min(0.98, Math.max(0.05, baseRobustness - result.robustnessImpact));

  const recommendations: Record<RedModel, string> = {
    DECEPTIVE:  'Increase sensor dwell time thresholds by 15% and raise feint-identification confidence floor from 0.6 to 0.75.',
    SATURATION: 'Pre-authorise Deep Sustainability COA for follow-on waves. Stage interceptor reserves at BASE-5.',
    KINETIC:    'Shift engagement authority to SEMI-AUTO. Reduce min-readiness threshold by 0.10 for critical-asset defense.',
  };

  return {
    robustness:               +adjusted.toFixed(3),
    primaryThreat:            result.primaryThreat,
    correctionRecommendation: recommendations[model],
  };
}
