import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { SteelApiService } from '../services/steel-api.service';
import { ENGAGEMENT_MAP_FEATURES } from '../../shared/domain/engagement-map.data';

export type DrawingUnitType =
  | 'INFANTRY' | 'ARMOR' | 'ARTILLERY' | 'SPECIAL_FORCES'
  | 'SHIP_DESTROYER' | 'SHIP_CARRIER' | 'SHIP_SUBMARINE' | 'SHIP_PATROL'
  | 'AIRCRAFT' | 'DRONE' | 'HELICOPTER';

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
  speed: number; // SVG units per simulated second
  armament?: string;
  origin?: string;
}

export interface UnitPosition {
  unitId: string;
  x: number;
  y: number;
  heading: number; // degrees, 0 = right, 90 = down
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

export interface ScenarioBundle {
  blueReactions: any[];
  conflictNodes: ConflictNode[];
  trajectories?: Record<string, { x: number, y: number, t: number }[]>;
}

const SPEEDS: Record<DrawingUnitType, number> = {
  INFANTRY:       30,
  ARMOR:          60,
  ARTILLERY:      25,
  SPECIAL_FORCES: 45,
  SHIP_DESTROYER: 80,
  SHIP_CARRIER:   50,
  SHIP_SUBMARINE: 60,
  SHIP_PATROL:   100,
  AIRCRAFT:      250,
  DRONE:         150,
  HELICOPTER:    120,
};

let _idCounter = 1;

@Injectable({ providedIn: 'root' })
export class DrawingBoardStore {
  private api = inject(SteelApiService);

  units          = signal<DrawingUnit[]>([]);
  scenarios      = signal<any[]>([]);
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
  
  simulationMode = signal<'SIMPLE' | 'ADVANCED'>('SIMPLE');
  advancedSimulationBundle = signal<ScenarioBundle | null>(null);
  lastConflictEvent = signal<ConflictNode | null>(null);

  constructor() {
    this.refreshScenarios();
  }

  refreshScenarios() {
    this.api.getScenarios().subscribe(ss => this.scenarios.set(ss));
  }

  saveCurrentToVault(name: string) {
    const scenario = {
      name,
      units: this.units(),
    };
    this.api.saveScenario(scenario).subscribe(() => {
      this.refreshScenarios();
    });
  }

  loadScenario(id: string) {
    const scenario = this.scenarios().find(s => s.id === id);
    if (scenario) {
      this.units.set(scenario.units || []);
      this.selectedUnitId.set(null);
      this.playbackTime.set(0);
      this.isPlaying.set(false);
    }
  }

  selectedUnit = computed(() => {
    const id = this.selectedUnitId();
    return id ? (this.units().find(u => u.id === id) ?? null) : null;
  });

  totalDuration = computed(() => {
    const durations = this.units().map(u => this._unitDuration(u));
    return Math.max(60, ...durations);
  });

  unitPositions = computed(() => {
    const t = this.playbackTime();
    const mode = this.mode();
    const simMode = this.simulationMode();
    const bundle = this.advancedSimulationBundle();

    if (mode === 'PLAYBACK' && simMode === 'ADVANCED' && bundle?.trajectories) {
      return this.units().map(u => {
        const traj = bundle.trajectories![u.id];
        if (traj && traj.length > 0) {
          return this._interpolateTraj(u.id, traj, t);
        }
        return this._positionAt(u, t);
      });
    }

    return this.units().map(u => this._positionAt(u, t));
  });

  simpleBlueReactions = computed(() => {
    const positions = this.unitPositions();
    const redUnits = positions.filter(p => {
      const u = this.units().find(unit => unit.id === p.unitId);
      return u?.side === 'RED';
    });
    
    const blueBases = ENGAGEMENT_MAP_FEATURES.filter(f => f.side === 'north' && f.subtype === 'air_base');
    
    const interceptors: any[] = [];
    
    redUnits.forEach(red => {
      let nearestBase = null;
      let minDist = Infinity;
      
      blueBases.forEach(base => {
        const bx = base.x ?? 0;
        const by = base.y ?? 0;
        const d = Math.hypot(red.x - bx, red.y - by);
        if (d < minDist) {
          minDist = d;
          nearestBase = base;
        }
      });
      
      if (minDist < 150 && nearestBase) {
        interceptors.push({
          id: `INT-${red.unitId}`,
          targetId: red.unitId,
          startX: (nearestBase as any).x,
          startY: (nearestBase as any).y,
          endX: red.x,
          endY: red.y
        });
      }
    });
    
    return interceptors;
  });

  addUnit(x: number, y: number): string {
    const type = this.activeUnitType();
    const prefix = type.replace('SHIP_', 'SHP-').slice(0, 3).toUpperCase();
    const id = `${prefix}-${String(_idCounter++).padStart(3, '0')}`;
    this.units.update(us => [...us, {
      id, type, side: this.activeSide(), label: id,
      startX: x, startY: y, waypoints: [], speed: SPEEDS[type],
      armament: this.activeArmament(), origin: this.activeOrigin()
    }]);
    return id;
  }

  addWaypoint(unitId: string, x: number, y: number) {
    this.units.update(us => us.map(u =>
      u.id === unitId ? { ...u, waypoints: [...u.waypoints, { x, y }] } : u
    ));
  }

  removeLastWaypoint(unitId: string) {
    this.units.update(us => us.map(u =>
      u.id === unitId ? { ...u, waypoints: u.waypoints.slice(0, -1) } : u
    ));
  }

  deleteUnit(id: string) {
    this.units.update(us => us.filter(u => u.id !== id));
    if (this.selectedUnitId() === id) this.selectedUnitId.set(null);
  }

  clearAll() {
    this.units.set([]);
    this.selectedUnitId.set(null);
    this.playbackTime.set(0);
    this.isPlaying.set(false);
  }

  selectUnit(id: string | null) { this.selectedUnitId.set(id); }

  setMode(m: DrawingMode) {
    this.mode.set(m);
    if (m !== 'PLAYBACK') this.isPlaying.set(false);
  }

  togglePlay() { this.isPlaying.update(v => !v); }

  resetPlayback() { this.playbackTime.set(0); this.isPlaying.set(false); }

  advanceTime(deltaSec: number) {
    const total = this.totalDuration();
    const prevT = this.playbackTime();
    this.playbackTime.update(t => {
      const next = t + deltaSec * this.playbackSpeed();
      
      const bundle = this.advancedSimulationBundle();
      if (this.simulationMode() === 'ADVANCED' && bundle?.conflictNodes) {
        const crossNode = bundle.conflictNodes.find(n => n.t > prevT && n.t <= next);
        if (crossNode) {
          this.lastConflictEvent.set(crossNode);
        }
      }

      if (next >= total) { this.isPlaying.set(false); return total; }
      return next;
    });
  }

  private _unitDuration(u: DrawingUnit): number {
    if (!u.waypoints.length) return 0;
    let d = 0, px = u.startX, py = u.startY;
    for (const w of u.waypoints) { d += Math.hypot(w.x - px, w.y - py); px = w.x; py = w.y; }
    return d / u.speed;
  }

  private _interpolateTraj(unitId: string, traj: { x: number, y: number, t: number }[], t: number): UnitPosition {
    if (t <= traj[0].t) return { unitId, x: traj[0].x, y: traj[0].y, heading: 0 };
    if (t >= traj[traj.length - 1].t) {
      const last = traj[traj.length - 1];
      const prev = traj[traj.length - 2] || last;
      return {
        unitId, x: last.x, y: last.y,
        heading: Math.atan2(last.y - prev.y, last.x - prev.x) * 180 / Math.PI
      };
    }
    
    for (let i = 0; i < traj.length - 1; i++) {
      const from = traj[i];
      const to = traj[i+1];
      if (t >= from.t && t <= to.t) {
        const s = (t - from.t) / Math.max(0.001, to.t - from.t);
        return {
          unitId,
          x: from.x + (to.x - from.x) * s,
          y: from.y + (to.y - from.y) * s,
          heading: Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI
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
}
