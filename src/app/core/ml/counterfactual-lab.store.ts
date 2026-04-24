import { Injectable, computed, signal } from '@angular/core';

/**
 * Represents a predicted outcome path over a time horizon,
 * including confidence quantiles for robustness analysis.
 */
export interface PredictedTrajectory {
  time_horizon: number[];
  p10: number[];
  p50: number[];
  p90: number[];
  trust_score: number;
  is_speculative: boolean;
}

export interface CounterfactualLabState {
  currentTrajectory: PredictedTrajectory | null;
  isSimulating: boolean;
  trustLevel: number;
  activePolicyDeltas: { safety: number; sustainability: number };
}

const INITIAL_STATE: CounterfactualLabState = {
  currentTrajectory: null,
  isSimulating: false,
  trustLevel: 1.0,
  activePolicyDeltas: { safety: 0, sustainability: 0 },
};

@Injectable({ providedIn: 'root' })
export class CounterfactualLabStore {
  private readonly _currentTrajectory = signal<PredictedTrajectory | null>(INITIAL_STATE.currentTrajectory);
  private readonly _isSimulating = signal<boolean>(INITIAL_STATE.isSimulating);
  private readonly _trustLevel = signal<number>(INITIAL_STATE.trustLevel);
  private readonly _activePolicyDeltas = signal<{ safety: number; sustainability: number }>(INITIAL_STATE.activePolicyDeltas);

  readonly currentTrajectory = this._currentTrajectory.asReadonly();
  readonly isSimulating = this._isSimulating.asReadonly();
  readonly trustLevel = this._trustLevel.asReadonly();
  readonly activePolicyDeltas = this._activePolicyDeltas.asReadonly();

  readonly state = computed<CounterfactualLabState>(() => ({
    currentTrajectory: this._currentTrajectory(),
    isSimulating: this._isSimulating(),
    trustLevel: this._trustLevel(),
    activePolicyDeltas: this._activePolicyDeltas(),
  }));

  updateDeltas(deltas: { safety: number; sustainability: number }) {
    this._activePolicyDeltas.set({ ...deltas });
  }

  setSimulating(isSimulating: boolean) {
    this._isSimulating.set(isSimulating);
  }

  setTrajectory(trajectory: PredictedTrajectory | null) {
    this._currentTrajectory.set(trajectory);
    this._trustLevel.set(trajectory?.trust_score ?? 1.0);
  }
}
