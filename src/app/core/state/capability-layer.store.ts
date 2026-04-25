import { Injectable, signal, computed, inject } from '@angular/core';
import { TacticalStore } from './tactical.store';
import { MapLayerStore } from './map-layer.store';
import { AuditLogger } from '../services/audit-logger';
import { PUBLIC_CAPABILITY_SEED } from '../../shared/domain/public-capability.seed';
import { PublicCapabilityCard, CapabilityLayerMode } from '../../shared/domain/public-capability';
import { ThreatTwin } from '../../shared/domain/models';

export interface RemappedTrack extends ThreatTwin {
  publicInterpretation?: PublicCapabilityCard;
}

@Injectable({ providedIn: 'root' })
export class CapabilityLayerStore {
  private tacticalStore = inject(TacticalStore);
  private mapLayerStore = inject(MapLayerStore);
  private audit = inject(AuditLogger);

  private _mode = signal<CapabilityLayerMode>('SYNTHETIC');
  private _overrides = signal<Record<string, string>>({}); // trackId -> cardId

  mode = this._mode.asReadonly();
  overrides = this._overrides.asReadonly();
  isPublic = computed(() => this._mode() !== 'SYNTHETIC');

  remappedTracks = computed<RemappedTrack[]>(() => {
    const tracks = this.tacticalStore.tracks();
    const mode = this._mode();
    const isPublicLayerVisible = this.mapLayerStore.isLayerVisible('public_capabilities');

    if (mode === 'SYNTHETIC' || !isPublicLayerVisible) {
      return tracks;
    }

    const availableCards = PUBLIC_CAPABILITY_SEED.filter(c => c.layer === mode);
    const overrides = this._overrides();

    return tracks.map(track => {
      let interpretation: PublicCapabilityCard | undefined;

      const overrideId = overrides[track.id];
      if (overrideId) {
        interpretation = availableCards.find(c => c.id === overrideId);
      }

      if (!interpretation && availableCards.length > 0) {
        // "Best Fit" heuristic: matching steelAbstraction or tags vs track.class
        interpretation = availableCards.find(c => 
          c.steelAbstraction.toLowerCase().includes(track.class.toLowerCase()) ||
          track.class.toLowerCase().includes(c.steelAbstraction.toLowerCase()) ||
          c.tags.some(t => t.toLowerCase().includes(track.class.toLowerCase()))
        ) || availableCards[0];
      }

      return {
        ...track,
        publicInterpretation: interpretation
      };
    });
  });

  setMode(mode: CapabilityLayerMode) {
    const prev = this._mode();
    this._mode.set(mode);
    this.audit.log({
      actor: 'ANALYST',
      action: 'Capability Layer Change',
      rationale: `Switched from ${prev} to ${mode} mode for cross-domain asset remapping.`,
      category: 'SYSTEM'
    });
  }

  setOverride(trackId: string, cardId: string) {
    this._overrides.update(o => ({ ...o, [trackId]: cardId }));
    this.audit.log({
      actor: 'ANALYST',
      action: 'Asset Interpretation Override',
      rationale: `Manual override for track ${trackId} set to card ${cardId}.`,
      category: 'TACTICAL'
    });
  }
}
