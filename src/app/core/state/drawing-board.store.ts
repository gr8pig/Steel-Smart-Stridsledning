import { Injectable, signal, computed } from '@angular/core';

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
}

export interface UnitPosition {
  unitId: string;
  x: number;
  y: number;
  heading: number; // degrees, 0 = right, 90 = down
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
  units          = signal<DrawingUnit[]>([]);
  selectedUnitId = signal<string | null>(null);
  mode           = signal<DrawingMode>('SELECT');
  activeUnitType = signal<DrawingUnitType>('INFANTRY');
  activeSide     = signal<DrawingSide>('RED');
  playbackTime   = signal<number>(0);
  isPlaying      = signal<boolean>(false);
  playbackSpeed  = signal<number>(1);

  selectedUnit = computed(() => {
    const id = this.selectedUnitId();
    return id ? (this.units().find(u => u.id === id) ?? null) : null;
  });

  totalDuration = computed(() => {
    const durations = this.units().map(u => this._unitDuration(u));
    return Math.max(60, ...durations);
  });

  unitPositions = computed(() =>
    this.units().map(u => this._positionAt(u, this.playbackTime()))
  );

  addUnit(x: number, y: number): string {
    const type = this.activeUnitType();
    const prefix = type.replace('SHIP_', 'SHP-').slice(0, 3).toUpperCase();
    const id = `${prefix}-${String(_idCounter++).padStart(3, '0')}`;
    this.units.update(us => [...us, {
      id, type, side: this.activeSide(), label: id,
      startX: x, startY: y, waypoints: [], speed: SPEEDS[type],
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
    this.playbackTime.update(t => {
      const next = t + deltaSec * this.playbackSpeed();
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
