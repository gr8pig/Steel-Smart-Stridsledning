import { Injectable, signal, computed, inject } from '@angular/core';
import { TacticalStore } from './tactical.store';
import { MapLayerStore } from './map-layer.store';
import { AuditLogger } from '../services/audit-logger';
import { PUBLIC_CAPABILITY_SEED } from '../../shared/domain/public-capability.seed';
import { PublicCapabilityCard, CapabilityLayerMode } from '../../shared/domain/public-capability';
import { PlatformType, ThreatTwin } from '../../shared/domain/models';
import { ForceCatalogStore } from './force-catalog.store';
import { PlatformInfo } from '../services/force-catalog.service';

const PLATFORM_CARD_CANDIDATES: Partial<Record<PlatformType, string[]>> = {
  GRIPEN_CD: ['sweden-gripen-cd'],
  GRIPEN_E: ['sweden-gripen-e'],
  F_35: ['nato-f35'],
  SU_35: ['russia-su35'],
  SU_34: ['russia-su34'],
  MIG_31: ['russia-mig31'],
  TU_22M3: ['russia-tu22m3'],
  J_20: ['china-j20'],
  J_16: ['china-j16'],
  J_10C: ['china-j10c'],
  H_6K: ['china-h6k'],
  KJ_500: ['china-kj500'],
  S_400: ['russia-s400'],
  PATRIOT: ['sweden-patriot-pac3', 'nato-patriot-pac3-mse'],
  NASAMS: ['nato-nasams'],
  IRIS_T_SLS: ['sweden-iris-t-sls', 'nato-iris-t-slm'],
  RBS_70_NG: ['sweden-rbs70-ng'],
  BAMSE: ['sweden-bamse'],
  KALIBR: ['russia-kalibr'],
  ISKANDER: ['russia-iskander'],
  KINZHAL: ['russia-kinzhal'],
  SHAHED_136: ['russia-shahed136', 'russia-geran2'],
  ORLAN_10: ['russia-orlan10'],
  F_16: ['nato-f16'],
  EUROFIGHTER: ['nato-eurofighter'],
  E_3_SENTRY: ['nato-e3-sentry'],
};

function normalizeLookup(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function formatPlatformId(platform: string): string {
  return platform
    .split('_')
    .filter(Boolean)
    .map((token) => {
      if (/^\d+$/.test(token) || token.length <= 2) {
        return token;
      }
      return token[0] + token.slice(1).toLowerCase();
    })
    .join(' ');
}

function formatDescriptor(value: string | null | undefined): string {
  if (!value) {
    return 'UNKNOWN';
  }
  return value
    .split('_')
    .filter(Boolean)
    .map((token) => token[0] + token.slice(1).toLowerCase())
    .join(' ');
}

export interface RemappedTrack extends ThreatTwin {
  publicInterpretation?: PublicCapabilityCard;
  catalogPlatform?: (PlatformInfo & { id: string }) | null;
  displayLabel: string;
  displayTypeLabel: string;
  sourceBadge: 'PUBLIC' | 'CATALOG' | null;
}

@Injectable({ providedIn: 'root' })
export class CapabilityLayerStore {
  private tacticalStore = inject(TacticalStore);
  private mapLayerStore = inject(MapLayerStore);
  private audit = inject(AuditLogger);
  private forceCatalogStore = inject(ForceCatalogStore);

  private _mode = signal<CapabilityLayerMode>('SYNTHETIC');
  private _overrides = signal<Record<string, string>>({}); // trackId -> cardId

  mode = this._mode.asReadonly();
  overrides = this._overrides.asReadonly();
  isPublic = computed(() => this._mode() !== 'SYNTHETIC');

  constructor() {
    this.forceCatalogStore.loadAll();
  }

  remappedTracks = computed<RemappedTrack[]>(() => {
    const tracks = this.tacticalStore.tracks();
    const mode = this._mode();
    const isPublicLayerVisible = this.mapLayerStore.isLayerVisible('public_capabilities');
    const availableCards = mode !== 'SYNTHETIC' && isPublicLayerVisible
      ? PUBLIC_CAPABILITY_SEED.filter(c => c.layer === mode)
      : [];
    const overrides = this._overrides();

    return tracks.map(track => {
      const catalogPlatform = track.platform ? this.forceCatalogStore.getPlatform(track.platform) : null;
      const platformLabel = catalogPlatform?.display_name
        ?? (track.platform ? formatPlatformId(track.platform) : track.class);
      const armaments: ThreatTwin['armaments'] = track.armaments ?? catalogPlatform?.armaments;
      const armament: ThreatTwin['armament'] = track.armament ?? (catalogPlatform?.armament ?? undefined);
      const originCountry: ThreatTwin['originCountry'] = track.originCountry ?? catalogPlatform?.origin_country;
      let interpretation: PublicCapabilityCard | undefined;

      const overrideId = overrides[track.id];
      if (overrideId) {
        interpretation = availableCards.find(c => c.id === overrideId);
      }

      if (!interpretation && availableCards.length > 0 && track.platform) {
        const candidates = PLATFORM_CARD_CANDIDATES[track.platform] ?? [];
        interpretation = candidates
          .map((cardId) => availableCards.find((card) => card.id === cardId))
          .find((card): card is PublicCapabilityCard => !!card);
      }

      if (!interpretation && availableCards.length > 0 && catalogPlatform) {
        const platformTerms = [catalogPlatform.display_name, track.platform]
          .filter((value): value is string => !!value)
          .map(normalizeLookup);
        interpretation = availableCards.find((card) => {
          const normalizedName = normalizeLookup(card.displayName);
          return platformTerms.some((term) => normalizedName.includes(term) || term.includes(normalizedName));
        });
      }

      if (!interpretation && availableCards.length > 0 && !track.platform) {
        interpretation = availableCards.find((card) =>
          card.steelAbstraction.toLowerCase().includes(track.class.toLowerCase()) ||
          track.class.toLowerCase().includes(card.steelAbstraction.toLowerCase()) ||
          card.tags.some((tag) => tag.toLowerCase().includes(track.class.toLowerCase()))
        );
      }

      return {
        ...track,
        originCountry,
        armament,
        armaments,
        publicInterpretation: interpretation,
        catalogPlatform,
        displayLabel: interpretation?.displayName ?? platformLabel,
        displayTypeLabel: interpretation?.steelAbstraction ?? formatDescriptor(catalogPlatform?.type ?? track.class),
        sourceBadge: interpretation ? 'PUBLIC' : (catalogPlatform ? 'CATALOG' : null),
      };
    });
  });

  selectedTrack = computed<RemappedTrack | null>(() => {
    const selectedId = this.tacticalStore.selectedTrackId();
    return this.remappedTracks().find((track) => track.id === selectedId) ?? null;
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
