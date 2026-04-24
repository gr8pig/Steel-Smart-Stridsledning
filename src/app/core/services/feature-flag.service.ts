import { Injectable, signal } from '@angular/core';

export type FeatureFlag = 'kgsa' | 'sensorFeedAdapter' | 'redAdversaryEvolution';

@Injectable({ providedIn: 'root' })
export class FeatureFlagService {
  // Default: KGSA gated; sensor adapter and red adversary enabled for local dev
  private _flags = signal<Record<FeatureFlag, boolean>>({
    kgsa:                 false,
    sensorFeedAdapter:    true,
    redAdversaryEvolution: true,
  });

  isEnabled(flag: string): boolean {
    return (this._flags() as Record<string, boolean>)[flag] ?? false;
  }

  enable(flag: FeatureFlag) {
    this._flags.update(f => ({ ...f, [flag]: true }));
  }

  disable(flag: FeatureFlag) {
    this._flags.update(f => ({ ...f, [flag]: false }));
  }

  toggle(flag: FeatureFlag) {
    this._flags.update(f => ({ ...f, [flag]: !f[flag] }));
  }
}
