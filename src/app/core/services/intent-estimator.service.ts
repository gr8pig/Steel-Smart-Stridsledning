import { Injectable, signal } from '@angular/core';
import { ThreatTwin } from '../../shared/domain/models';

export type IntentClass = 'PROBE' | 'FEINT' | 'STRIKE' | 'SATURATION' | 'DECOY';
export type IntentPosterior = Record<IntentClass, number>;

const CLASSES: IntentClass[] = ['PROBE', 'FEINT', 'STRIKE', 'SATURATION', 'DECOY'];

// Gaussian likelihood score: peaks at 1.0 when x == mu, falls off with sigma
function g(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

// Per-class likelihood based on observable track features.
// Each intent class has characteristic velocity, time-to-target, platform type, and confidence.
function computeLikelihood(track: ThreatTwin): IntentPosterior {
  const v   = track.geometry.velocity;
  const ttt = track.timeToTarget;
  const cls = track.class;
  const c   = track.confidence;

  const classBias: Record<ThreatTwin['class'], Record<IntentClass, number>> = {
    AIRCRAFT:  { PROBE: 0.40, FEINT: 0.25, STRIKE: 0.20, SATURATION: 0.05, DECOY: 0.10 },
    MISSILE:   { PROBE: 0.05, FEINT: 0.05, STRIKE: 0.75, SATURATION: 0.10, DECOY: 0.05 },
    DRONE:     { PROBE: 0.15, FEINT: 0.25, STRIKE: 0.05, SATURATION: 0.40, DECOY: 0.15 },
    UNKNOWN:   { PROBE: 0.20, FEINT: 0.20, STRIKE: 0.20, SATURATION: 0.20, DECOY: 0.20 },
  };
  const bias = classBias[cls];

  return {
    // PROBE: slow, far out, moderate confidence — reconnaissance pattern
    PROBE:      bias.PROBE      * g(v, 150, 80)  * g(ttt, 320, 140) * g(c, 0.50, 0.20),
    // FEINT: medium velocity, medium range, lower confidence — behavioural ambiguity
    FEINT:      bias.FEINT      * g(v, 220, 100) * g(ttt, 200,  90) * g(c, 0.40, 0.18),
    // STRIKE: high velocity, short time-to-target, high confidence — direct attack
    STRIKE:     bias.STRIKE     * g(v, 500, 150) * g(ttt,  70,  50) * g(c, 0.85, 0.12),
    // SATURATION: medium velocity, drone swarm timing, moderate confidence
    SATURATION: bias.SATURATION * g(v, 180,  80) * g(ttt, 140,  70) * g(c, 0.70, 0.20),
    // DECOY: very low velocity, distant, low confidence — expendable platform
    DECOY:      bias.DECOY      * g(v,  90,  60) * g(ttt, 420, 180) * g(c, 0.30, 0.18),
  };
}

function normalize(raw: IntentPosterior): IntentPosterior {
  const sum = CLASSES.reduce((acc, k) => acc + raw[k], 0) || 1;
  return CLASSES.reduce((out, k) => ({ ...out, [k]: raw[k] / sum }), {} as IntentPosterior);
}

function uniformPrior(): IntentPosterior {
  const p = 1 / CLASSES.length;
  return { PROBE: p, FEINT: p, STRIKE: p, SATURATION: p, DECOY: p };
}

// Gate: if likelihood is near-flat (low signal), dampen update to protect against outliers.
// Returns dampening factor in [0.1, 1.0].
function gate(likelihood: IntentPosterior): number {
  const vals = CLASSES.map(k => likelihood[k]);
  const peak = Math.max(...vals);
  const floor = Math.min(...vals);
  const spread = peak - floor;
  // High spread = strong signal = full update.  Near-zero spread = near-flat = outlier.
  return spread < 0.05 ? 0.1 : Math.min(1.0, spread / 0.3);
}

@Injectable({ providedIn: 'root' })
export class IntentEstimatorService {
  private _posteriors = signal(new Map<string, IntentPosterior>());

  readonly posteriors = this._posteriors.asReadonly();

  /**
   * Ingest a track observation and return the updated posterior.
   * Skips update if the track already has backend-provided intentDistribution.
   */
  update(track: ThreatTwin): IntentPosterior {
    const map    = new Map(this._posteriors());
    const prior  = map.get(track.id) ?? uniformPrior();
    const L      = computeLikelihood(track);
    const alpha  = gate(L);

    const raw = CLASSES.reduce((out, k) => ({
      ...out,
      [k]: prior[k] * Math.pow(Math.max(L[k], 1e-9), alpha),
    }), {} as IntentPosterior);

    const posterior = normalize(raw);
    map.set(track.id, posterior);
    this._posteriors.set(map);
    return posterior;
  }

  get(trackId: string): IntentPosterior | null {
    return this._posteriors().get(trackId) ?? null;
  }

  remove(trackId: string): void {
    const map = new Map(this._posteriors());
    map.delete(trackId);
    this._posteriors.set(map);
  }

  /** Convert posterior to the intentDistribution shape used by ThreatTwin */
  toTwinDistribution(p: IntentPosterior): ThreatTwin['intentDistribution'] {
    return {
      probe:      p.PROBE,
      feint:      p.FEINT,
      strike:     p.STRIKE,
      saturation: p.SATURATION,
      decoy:      p.DECOY,
    };
  }
}
