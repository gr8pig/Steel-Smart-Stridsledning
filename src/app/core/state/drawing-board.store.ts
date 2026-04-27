import { Injectable, signal, computed, inject } from '@angular/core';
import { SteelApiService } from '../services/steel-api.service';
import { ENGAGEMENT_MAP_FEATURES } from '../../shared/domain/engagement-map.data';
import { ArmamentLoadout, ArmamentType, MapFeature, OriginCountry, PlatformType } from '../../shared/domain/models';
import {
  CounterfactualPrediction,
  CounterfactualSimulationRequest,
} from '../ml/counterfactual-lab.models';
import type { ForceUnit, PlatformInfo } from '../services/force-catalog.service';

export type DrawingUnitType =
  | 'INFANTRY' | 'ARMOR' | 'ARTILLERY' | 'SPECIAL_FORCES'
  | 'SHIP_DESTROYER' | 'SHIP_CARRIER' | 'SHIP_SUBMARINE' | 'SHIP_PATROL'
  | 'AIRCRAFT' | 'DRONE' | 'DRONE_SWARM' | 'HELICOPTER';

export type DrawingSide = 'RED' | 'BLUE';
export type DrawingMode = 'SELECT' | 'PLACE' | 'WAYPOINT' | 'PLAYBACK';

export interface DrawingWaypoint { x: number; y: number; }

export interface DrawingUnit {
  id: string;
  type: DrawingUnitType;
  side: DrawingSide;
  label: string;
  startX: number;
  startY: number;
  waypoints: DrawingWaypoint[];
  speed: number;
  armament?: string;
  origin?: string;
  elevation?: number;
  platform?: PlatformType;
  armaments?: ArmamentType[];
  armamentLoadout?: ArmamentLoadout;
  originCountry?: OriginCountry;
  catalogSourceId?: string;
  catalogForce?: string;
  catalogCategory?: string;
  platformSpeedKmh?: number;
  combatRadiusKm?: number;
  serviceCeilingM?: number;
  radarRangeKm?: number;
}

export interface UnitPosition {
  unitId: string;
  x: number;
  y: number;
  heading: number;
}

export interface IntentPrediction {
  unitId: string;
  trajectories: { x: number; y: number }[][];
}

export interface ConflictNode {
  unitId: string;
  targetId: string;
  x: number;
  y: number;
  t: number;
  outcome: 'NEUTRALIZED' | 'LEAKED';
  pk: number;
}

export interface BlueReaction {
  id: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface ScenarioDescriptor {
  id: string;
  name: string;
  units: DrawingUnit[];
  updatedAt?: string;
}

export interface ScenarioBundle {
  blueReactions: BlueReaction[];
  conflictNodes: ConflictNode[];
  trajectories?: Record<string, { x: number, y: number, t: number }[]>;
}

export const UNIT_CATALOGUE: { group: string; type: DrawingUnitType; label: string }[] = [
  { group: 'Ground', type: 'INFANTRY',       label: 'Infantry'    },
  { group: 'Ground', type: 'ARMOR',          label: 'Armor'       },
  { group: 'Ground', type: 'ARTILLERY',      label: 'Artillery'   },
  { group: 'Ground', type: 'SPECIAL_FORCES', label: 'SF'          },
  { group: 'Naval',  type: 'SHIP_DESTROYER', label: 'Destroyer'   },
  { group: 'Naval',  type: 'SHIP_CARRIER',   label: 'Carrier'     },
  { group: 'Naval',  type: 'SHIP_SUBMARINE', label: 'Submarine'   },
  { group: 'Naval',  type: 'SHIP_PATROL',    label: 'Patrol'      },
  { group: 'Air',    type: 'AIRCRAFT',       label: 'Aircraft'    },
  { group: 'Air',    type: 'DRONE',          label: 'Drone'       },
  { group: 'Air',    type: 'DRONE_SWARM',    label: 'Drone Swarm' },
  { group: 'Air',    type: 'HELICOPTER',     label: 'Helicopter'  },
];

export const SPEEDS: Record<DrawingUnitType, number> = {
  INFANTRY:       5,
  ARMOR:          40,
  ARTILLERY:      30,
  SPECIAL_FORCES: 15,
  SHIP_DESTROYER: 55,
  SHIP_CARRIER:   56,
  SHIP_SUBMARINE: 37,
  SHIP_PATROL:    65,
  AIRCRAFT:      850,
  DRONE:         150,
  DRONE_SWARM:    80,
  HELICOPTER:    260,
};

// Air-type units whose SVG symbols point north by default — need +90° rotation offset
// to face the direction of travel (atan2(dy,dx) = 0 = east, symbol nose = north).
export const AIR_TYPES: ReadonlySet<DrawingUnitType> = new Set([
  'AIRCRAFT', 'DRONE', 'DRONE_SWARM', 'HELICOPTER',
]);

const RF_HORIZON_MINUTES = [0, 5, 10, 15, 20, 25, 30];

let _idCounter = 1;

@Injectable({ providedIn: 'root' })
export class DrawingBoardStore {
  private api = inject(SteelApiService);

  // ── Core state ────────────────────────────────────────────────────────────
  units          = signal<DrawingUnit[]>([]);
  scenarios      = signal<ScenarioDescriptor[]>([]);
  selectedUnitId = signal<string | null>(null);
  mode           = signal<DrawingMode>('SELECT');
  activeUnitType = signal<DrawingUnitType>('INFANTRY');
  activeSide     = signal<DrawingSide>('RED');
  activeArmament = signal<string>('Standard');
  activeOrigin   = signal<string>('Base Alpha');
  playbackTime   = signal<number>(0);
  isPlaying      = signal<boolean>(false);
  playbackSpeed  = signal<number>(1);
  intentPredictions = signal<IntentPrediction[]>([]);

  simulationMode           = signal<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  advancedSimulationBundle = signal<ScenarioBundle | null>(null);
  lastConflictEvent        = signal<ConflictNode | null>(null);

  // ── RF / heuristics analysis ──────────────────────────────────────────────
  rfAnalysis   = signal<CounterfactualPrediction | null>(null);
  isRunningRF  = signal<boolean>(false);
  rfError      = signal<string | null>(null);

  constructor() {
    this.refreshScenarios();
  }

  refreshScenarios(): void {
    this.api.getScenarios().subscribe(ss => {
      this.scenarios.set(ss as ScenarioDescriptor[]);
    });
  }

  unitsByCategory(group: string) {
    return UNIT_CATALOGUE.filter(u => u.group === group);
  }

  saveCurrentToVault(name: string): void {
    const scenario = { name, units: this.units() };
    this.api.saveScenario(scenario).subscribe(() => {
      this.refreshScenarios();
    });
  }

  loadScenario(id: string): void {
    const scenario = this.scenarios().find(s => s.id === id);
    if (scenario) {
      this.units.set(scenario.units || []);
      this.selectedUnitId.set(null);
      this.playbackTime.set(0);
      this.isPlaying.set(false);
    }
  }

  deleteScenario(id: string): void {
    this.api.deleteScenario(id).subscribe(() => {
      this.refreshScenarios();
    });
  }

  runAdvancedSimulation(): void {
    this.api.runAdvancedSim(this.units()).subscribe(bundle => {
      this.advancedSimulationBundle.set(bundle as ScenarioBundle);
      this.simulationMode.set('ADVANCED');
    });
  }

  // ── RF analysis ───────────────────────────────────────────────────────────

  runRFAnalysis(): void {
    const units = this.units();
    if (!units.length) return;

    this.isRunningRF.set(true);
    this.rfError.set(null);

    const assets = units.map((unit, index) => this._unitToAsset(unit, index));
    const redCount = units.filter(u => u.side === 'RED').length;
    const avgSpeed = units.reduce((s, u) => s + u.speed, 0) / Math.max(1, units.length);

    const request: CounterfactualSimulationRequest = {
      theater: {
        timestamp: new Date().toISOString(),
        trackCount: redCount,
        avgVelocity: avgSpeed,
        clusterDensity: Math.min(1, units.length / 10),
        baseReadinessMean: 0.72,
        jammerIntensity: 0.0,
        policyDeltas: { safety: 0, sustainability: 0, resilience: 0 },
        scenarioName: 'Drawing Board',
        phase: 'SKETCH',
        trackVelocitySpread: 0.2,
      },
      assets,
      selectedAssetId: this.selectedUnitId() ?? assets[0]?.id,
      horizonMinutes: RF_HORIZON_MINUTES,
      modelVersion: 'synthetic-ensemble-v2',
      nEnsembleMembers: 7,
      nRuns: 500,
    };

    this.api.predictCounterfactual(request).subscribe({
      next: result => {
        this.rfAnalysis.set(result);
        this.isRunningRF.set(false);
      },
      error: err => {
        console.error('RF analysis failed', err);
        this.rfError.set('Analysis failed — check backend connection');
        this.isRunningRF.set(false);
      },
    });
  }

  clearRFAnalysis(): void {
    this.rfAnalysis.set(null);
    this.rfError.set(null);
  }

  /** Maps current playback time to an RF horizon index for live readout. */
  readonly currentRFHorizonIndex = computed(() => {
    const total = this.totalDuration();
    const t = this.playbackTime();
    if (!total) return 0;
    const minuteProgress = (t / total) * 30;
    let nearest = 0;
    let minDiff = Infinity;
    RF_HORIZON_MINUTES.forEach((m, i) => {
      const diff = Math.abs(m - minuteProgress);
      if (diff < minDiff) { minDiff = diff; nearest = i; }
    });
    return nearest;
  });

  /** P50 robustness at current playback position, or null if no analysis. */
  readonly currentRobustness = computed(() => {
    const analysis = this.rfAnalysis();
    if (!analysis) return null;
    const idx = this.currentRFHorizonIndex();
    const rob = analysis.metric_trajectories?.find(m => m.name === 'robustness');
    return rob ? rob.p50[idx] ?? null : (analysis.p50[idx] ?? null);
  });

  /** P50 failure probability at current playback position. */
  readonly currentFailureProbability = computed(() => {
    const analysis = this.rfAnalysis();
    if (!analysis) return null;
    const idx = this.currentRFHorizonIndex();
    const fail = analysis.metric_trajectories?.find(m => m.name === 'failureProbability');
    return fail ? fail.p50[idx] ?? null : null;
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  selectedUnit = computed(() => {
    const id = this.selectedUnitId();
    return id ? (this.units().find(u => u.id === id) ?? null) : null;
  });

  totalDuration = computed(() => {
    const durations = this.units().map(u => this._unitDuration(u));
    return Math.max(60, ...durations);
  });

  unitPositions = computed(() => {
    const t       = this.playbackTime();
    const mode    = this.mode();
    const simMode = this.simulationMode();
    const bundle  = this.advancedSimulationBundle();

    if (mode === 'PLAYBACK' && simMode === 'ADVANCED' && bundle?.trajectories) {
      return this.units().map(u => {
        const traj = bundle.trajectories![u.id];
        if (traj && traj.length > 0) return this._interpolateTraj(u.id, traj, t);
        return this._positionAt(u, t);
      });
    }
    return this.units().map(u => this._positionAt(u, t));
  });

  simpleBlueReactions = computed(() => {
    const positions = this.unitPositions();
    const redUnits  = positions.filter(p => {
      const u = this.units().find(unit => unit.id === p.unitId);
      return u?.side === 'RED';
    });

    const blueBases = (ENGAGEMENT_MAP_FEATURES as MapFeature[]).filter(
      f => f.side === 'north' && f.subtype === 'air_base'
    );

    const interceptors: BlueReaction[] = [];
    redUnits.forEach(red => {
      let nearestBase: MapFeature | null = null;
      let minDist = Infinity;
      blueBases.forEach(base => {
        const bx = base.x ?? 0;
        const by = base.y ?? 0;
        const d = Math.hypot(red.x - bx, red.y - by);
        if (d < minDist) { minDist = d; nearestBase = base; }
      });
      if (minDist < 150 && nearestBase) {
        interceptors.push({
          id: `INT-${red.unitId}`,
          targetId: red.unitId,
          startX: (nearestBase as MapFeature).x ?? 0,
          startY: (nearestBase as MapFeature).y ?? 0,
          endX: red.x,
          endY: red.y,
        });
      }
    });
    return interceptors;
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  addUnit(x: number, y: number): string {
    const type   = this.activeUnitType();
    const prefix = type.replace('SHIP_', 'SHP-').slice(0, 3).toUpperCase();
    const id     = `${prefix}-${String(_idCounter++).padStart(3, '0')}`;

    let fakeElevation = 0;
    if (AIR_TYPES.has(type)) {
      fakeElevation = type === 'DRONE_SWARM'
        ? Math.floor(Math.random() * 1500) + 100   // low-altitude swarm
        : Math.floor(Math.random() * 14000) + 1000;
    } else if (type === 'SPECIAL_FORCES') {
      fakeElevation = Math.floor(Math.random() * 500);
    }

    this.units.update(us => [...us, {
      id, type, side: this.activeSide(), label: id,
      startX: x, startY: y, waypoints: [], speed: SPEEDS[type],
      armament: this.activeArmament(), origin: this.activeOrigin(),
      elevation: fakeElevation,
    }]);
    return id;
  }

  addCatalogUnit(unit: ForceUnit, side: DrawingSide): string {
    const profile = unit._platform_profile ?? null;
    const type = inferDrawingUnitType(unit, profile);
    const prefix = type.replace('SHIP_', 'SHP-').slice(0, 3).toUpperCase();
    const id = `${prefix}-${String(_idCounter++).padStart(3, '0')}`;
    const placement = nextCatalogPlacement(this.units(), side);
    const speed = inferCatalogSpeed(unit, profile, type);
    const serviceCeiling = profile?.service_ceiling_m ?? parseCatalogNumber(unit['service_ceiling']);
    const elevation = inferCatalogElevation(type, serviceCeiling);
    const armamentLoadout = profile?.armament ?? inferCatalogArmamentLoadout(unit, type);

    this.units.update((units) => [...units, {
      id,
      type,
      side,
      label: profile?.display_name ?? formatCatalogLabel(unit._id),
      startX: placement.x,
      startY: placement.y,
      waypoints: [],
      speed,
      armament: armamentLoadout,
      origin: profile?.nation ?? unit._force,
      elevation,
      platform: (profile?.id ?? unit._platform_id ?? undefined) as PlatformType | undefined,
      armaments: profile?.armaments ?? inferCatalogArmaments(unit, type),
      armamentLoadout,
      originCountry: profile?.origin_country ?? unit._origin_country ?? inferOriginCountry(unit._force),
      catalogSourceId: unit._id,
      catalogForce: unit._force,
      catalogCategory: unit._category,
      platformSpeedKmh: profile?.max_speed_kmh ?? parseCatalogNumber(unit['max_speed']) ?? speed,
      combatRadiusKm: profile?.combat_radius_km ?? parseCatalogNumber(unit['combat_radius']) ?? parseCatalogNumber(unit['engagement_range']) ?? undefined,
      serviceCeilingM: serviceCeiling ?? undefined,
      radarRangeKm: profile?.radar_range_km
        ?? parseCatalogNumber(unit['radar_public_detection_range_fighter'])
        ?? parseCatalogNumber(unit['radar_public_detection_range_bomber_large_target'])
        ?? parseCatalogNumber(unit['engagement_range'])
        ?? undefined,
    }]);

    this.selectedUnitId.set(id);
    return id;
  }

  addWaypoint(unitId: string, x: number, y: number): void {
    this.units.update(us => us.map(u =>
      u.id === unitId ? { ...u, waypoints: [...u.waypoints, { x, y }] } : u
    ));
  }

  removeLastWaypoint(unitId: string): void {
    this.units.update(us => us.map(u =>
      u.id === unitId ? { ...u, waypoints: u.waypoints.slice(0, -1) } : u
    ));
  }

  deleteUnit(id: string): void {
    this.units.update(us => us.filter(u => u.id !== id));
    if (this.selectedUnitId() === id) this.selectedUnitId.set(null);
  }

  clearAll(): void {
    this.units.set([]);
    this.selectedUnitId.set(null);
    this.playbackTime.set(0);
    this.isPlaying.set(false);
    this.rfAnalysis.set(null);
    this.rfError.set(null);
  }

  selectUnit(id: string | null): void { this.selectedUnitId.set(id); }

  setMode(m: DrawingMode): void {
    this.mode.set(m);
    if (m !== 'PLAYBACK') this.isPlaying.set(false);
  }

  togglePlay(): void { this.isPlaying.update(v => !v); }

  resetPlayback(): void { this.playbackTime.set(0); this.isPlaying.set(false); }

  advanceTime(deltaSec: number): void {
    const total  = this.totalDuration();
    const prevT  = this.playbackTime();
    this.playbackTime.update(t => {
      const next = t + deltaSec * this.playbackSpeed();

      const bundle = this.advancedSimulationBundle();
      if (this.simulationMode() === 'ADVANCED' && bundle?.conflictNodes) {
        const crossNode = bundle.conflictNodes.find(n => n.t > prevT && n.t <= next);
        if (crossNode) this.lastConflictEvent.set(crossNode);
      }

      if (next >= total) { this.isPlaying.set(false); return total; }
      return next;
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _unitDuration(u: DrawingUnit): number {
    if (!u.waypoints.length) return 0;
    let d = 0, px = u.startX, py = u.startY;
    for (const w of u.waypoints) { d += Math.hypot(w.x - px, w.y - py); px = w.x; py = w.y; }
    return d / u.speed;
  }

  private _interpolateTraj(
    unitId: string,
    traj: { x: number; y: number; t: number }[],
    t: number,
  ): UnitPosition {
    if (t <= traj[0].t) return { unitId, x: traj[0].x, y: traj[0].y, heading: 0 };
    if (t >= traj[traj.length - 1].t) {
      const last = traj[traj.length - 1];
      const prev = traj[traj.length - 2] || last;
      return {
        unitId, x: last.x, y: last.y,
        heading: Math.atan2(last.y - prev.y, last.x - prev.x) * 180 / Math.PI,
      };
    }
    for (let i = 0; i < traj.length - 1; i++) {
      const from = traj[i], to = traj[i + 1];
      if (t >= from.t && t <= to.t) {
        const s = (t - from.t) / Math.max(0.001, to.t - from.t);
        return {
          unitId,
          x: from.x + (to.x - from.x) * s,
          y: from.y + (to.y - from.y) * s,
          heading: Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI,
        };
      }
    }
    return { unitId, x: traj[0].x, y: traj[0].y, heading: 0 };
  }

  private _positionAt(u: DrawingUnit, t: number): UnitPosition {
    const pts = [{ x: u.startX, y: u.startY }, ...u.waypoints];
    if (pts.length < 2) return { unitId: u.id, x: u.startX, y: u.startY, heading: 0 };
    let elapsed = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const from = pts[i], to = pts[i + 1];
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const dur  = dist / u.speed;
      if (t <= elapsed + dur || i === pts.length - 2) {
        const s = Math.min(1, (t - elapsed) / Math.max(dur, 0.001));
        return {
          unitId: u.id,
          x: from.x + (to.x - from.x) * s,
          y: from.y + (to.y - from.y) * s,
          heading: Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI,
        };
      }
      elapsed += dur;
    }
    const last = pts[pts.length - 1], prev = pts[pts.length - 2];
    return {
      unitId: u.id, x: last.x, y: last.y,
      heading: Math.atan2(last.y - prev.y, last.x - prev.x) * 180 / Math.PI,
    };
  }

  /** Convert a DrawingUnit to a CounterfactualAsset for the RF endpoint. */
  private _unitToAsset(unit: DrawingUnit, index: number) {
    const pts = [{ x: unit.startX, y: unit.startY }, ...unit.waypoints];
    let pathLen = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      pathLen += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
    const complexity  = Math.min(1, (unit.waypoints.length * 0.12) + (pathLen * 0.002 / 100));
    const platformSpeedKmh = unit.platformSpeedKmh ?? null;
    const mobility    = platformSpeedKmh ? Math.min(1, platformSpeedKmh / 3000) : Math.min(1, unit.speed / 250);
    const bias        = UNIT_TYPE_BIASES[unit.type] ?? UNIT_TYPE_BIASES['INFANTRY'];
    const readinessBase = unit.side === 'BLUE' ? 0.68 : 0.52;
    const inventoryDepth = unit.armaments?.length
      ? _clamp(0.20 + unit.armaments.length * 0.14 + (unit.side === 'BLUE' ? 0.08 : -0.02), 0, 1)
      : _clamp(bias.inventory + (unit.side === 'BLUE' ? 0.12 : -0.08), 0, 1);
    const sensorQuality = unit.radarRangeKm
      ? _clamp(unit.radarRangeKm / 250, 0, 1)
      : _clamp(bias.sensor + (unit.side === 'BLUE' ? 0.08 : -0.05), 0, 1);
    const endurance = unit.combatRadiusKm
      ? _clamp(unit.combatRadiusKm / 2500, 0, 1)
      : _clamp(bias.endurance - complexity * 0.10 + (unit.side === 'BLUE' ? 0.04 : 0), 0, 1);

    return {
      id:               unit.id,
      label:            unit.label || `Unit ${index + 1}`,
      unitType:         unit.type,
      side:             unit.side as 'BLUE' | 'RED' | 'NEUTRAL',
      platform:         unit.platform,
      armaments:        unit.armaments,
      armament:         unit.armamentLoadout,
      originCountry:    unit.originCountry,
      readiness:        _clamp(readinessBase + bias.readiness - complexity * 0.15, 0, 1),
      speed:            mobility,
      waypointComplexity: _clamp(complexity, 0, 1),
      inventoryDepth,
      sensorQuality,
      exposedRisk:      _clamp(bias.risk + complexity * 0.35 + (unit.side === 'RED' ? 0.10 : 0), 0, 1),
      mobility,
      endurance,
      source:           'drawing_board' as const,
      metadata:         {
        waypointCount: unit.waypoints.length,
        catalogSourceId: unit.catalogSourceId,
        catalogForce: unit.catalogForce,
        catalogCategory: unit.catalogCategory,
        platformSpeedKmh: unit.platformSpeedKmh,
        combatRadiusKm: unit.combatRadiusKm,
        radarRangeKm: unit.radarRangeKm,
        serviceCeilingM: unit.serviceCeilingM,
      },
    };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function parseCatalogNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/,/g, '');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCatalogLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b([A-Za-z])([A-Za-z]*)\b/g, (_match, first: string, rest: string) => `${first.toUpperCase()}${rest.toLowerCase()}`)
    .replace(/\bAew\b/g, 'AEW')
    .replace(/\bAwacs\b/g, 'AWACS');
}

function inferOriginCountry(forceKey: string): OriginCountry {
  const normalized = forceKey.toLowerCase();
  if (normalized.includes('sweden')) return 'SWEDEN';
  if (normalized.includes('nato')) return 'NATO';
  if (normalized.includes('russia')) return 'RUSSIA';
  if (normalized.includes('china')) return 'CHINA';
  return 'OTHER';
}

function inferDrawingUnitType(unit: ForceUnit, profile: (PlatformInfo & { id: string }) | null): DrawingUnitType {
  const category = unit._category.toLowerCase();
  const label = `${unit._id} ${profile?.type ?? ''}`.toLowerCase();

  if ((profile?.type ?? '').includes('DRONE') || category.includes('drone') || category.includes('uav')) return 'DRONE';
  if (profile?.threat_class === 'AIRCRAFT' || category.includes('aircraft') || category.includes('air_units') || label.includes('awacs')) return 'AIRCRAFT';
  if (category.includes('naval')) {
    if (label.includes('carrier')) return 'SHIP_CARRIER';
    if (label.includes('submarine')) return 'SHIP_SUBMARINE';
    if (label.includes('patrol') || label.includes('corvette')) return 'SHIP_PATROL';
    return 'SHIP_DESTROYER';
  }
  if (category.includes('gbad') || label.includes('sam') || label.includes('patriot') || label.includes('s400')) return 'ARTILLERY';
  if (label.includes('tank') || label.includes('armor') || label.includes('vehicle')) return 'ARMOR';
  if (label.includes('special') || label.includes('ranger') || label.includes('sof')) return 'SPECIAL_FORCES';
  if (label.includes('rotary') || label.includes('helicopter')) return 'HELICOPTER';
  return 'INFANTRY';
}

function inferCatalogArmamentLoadout(unit: ForceUnit, type: DrawingUnitType): ArmamentLoadout {
  const label = `${unit._id} ${unit._category}`.toLowerCase();
  if (label.includes('ew') || label.includes('jam')) return 'ELECTRONIC_WARFARE';
  if (type === 'DRONE' && !label.includes('shahed')) return 'ISR_SURVEILLANCE';
  if (type === 'AIRCRAFT' && (label.includes('awacs') || label.includes('aew'))) return 'ISR_SURVEILLANCE';
  if (type === 'AIRCRAFT' || type === 'HELICOPTER') return 'AIR_SUPERIORITY';
  if (type === 'ARTILLERY' || label.includes('missile')) return 'KINETIC_STRIKE';
  return 'HYBRID_DECEPTION';
}

function inferCatalogArmaments(unit: ForceUnit, type: DrawingUnitType): ArmamentType[] {
  const label = `${unit._id} ${unit._category}`.toLowerCase();
  if (type === 'DRONE' && !label.includes('shahed')) return ['NONE'];
  if (label.includes('patriot') || label.includes('iris') || label.includes('nasams') || label.includes('rbs_70') || label.includes('bamse')) return ['SAM_LONG_RANGE'];
  if (label.includes('kalibr')) return ['CRUISE_MISSILE'];
  if (label.includes('shahed') || label.includes('iskander') || label.includes('bomb')) return ['BOMB'];
  if (type === 'AIRCRAFT') return ['SHORT_RANGE_AAM', 'LONG_RANGE_AAM'];
  return ['NONE'];
}

function inferCatalogSpeed(
  unit: ForceUnit,
  profile: (PlatformInfo & { id: string }) | null,
  type: DrawingUnitType,
): number {
  return profile?.max_speed_kmh ?? parseCatalogNumber(unit['max_speed']) ?? SPEEDS[type];
}

function inferCatalogElevation(type: DrawingUnitType, serviceCeilingM: number | null): number {
  if (!AIR_TYPES.has(type)) return 0;
  if (serviceCeilingM && serviceCeilingM > 0) {
    return Math.round(serviceCeilingM * 0.55);
  }
  return type === 'DRONE_SWARM' ? 750 : 4500;
}

function nextCatalogPlacement(units: DrawingUnit[], side: DrawingSide): { x: number; y: number } {
  const sideCount = units.filter((unit) => unit.side === side).length;
  const lane = sideCount % 5;
  const row = Math.floor(sideCount / 5);
  const x = side === 'BLUE' ? 220 + lane * 68 : 1450 - lane * 68;
  const y = side === 'BLUE' ? 170 + row * 70 : 1020 - row * 70;
  return { x, y };
}

interface UnitBias {
  readiness: number; inventory: number; sensor: number;
  risk: number; endurance: number;
}

const UNIT_TYPE_BIASES: Record<DrawingUnitType, UnitBias> = {
  AIRCRAFT:       { readiness: 0.04, inventory: 0.32, sensor: 0.28, risk: 0.18, endurance: 0.54 },
  DRONE:          { readiness: 0.02, inventory: 0.18, sensor: 0.34, risk: 0.28, endurance: 0.36 },
  DRONE_SWARM:    { readiness: 0.00, inventory: 0.10, sensor: 0.30, risk: 0.38, endurance: 0.22 },
  HELICOPTER:     { readiness: 0.03, inventory: 0.22, sensor: 0.26, risk: 0.24, endurance: 0.42 },
  SHIP_CARRIER:   { readiness: 0.06, inventory: 0.55, sensor: 0.33, risk: 0.20, endurance: 0.80 },
  SHIP_DESTROYER: { readiness: 0.05, inventory: 0.46, sensor: 0.30, risk: 0.18, endurance: 0.72 },
  SHIP_SUBMARINE: { readiness: 0.03, inventory: 0.28, sensor: 0.22, risk: 0.26, endurance: 0.68 },
  SHIP_PATROL:    { readiness: 0.02, inventory: 0.24, sensor: 0.18, risk: 0.16, endurance: 0.45 },
  ARTILLERY:      { readiness: 0.02, inventory: 0.38, sensor: 0.14, risk: 0.22, endurance: 0.50 },
  ARMOR:          { readiness: 0.04, inventory: 0.34, sensor: 0.16, risk: 0.20, endurance: 0.58 },
  SPECIAL_FORCES: { readiness: 0.05, inventory: 0.20, sensor: 0.26, risk: 0.14, endurance: 0.40 },
  INFANTRY:       { readiness: 0.01, inventory: 0.16, sensor: 0.10, risk: 0.12, endurance: 0.34 },
};
