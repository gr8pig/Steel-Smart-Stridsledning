import { Injectable, signal, computed } from '@angular/core';
import { AuditLogger } from '../services/audit-logger';
import { inject } from '@angular/core';
import {
  SensorPlatform,
  SensorPlatformStatus,
  SensorTaskingRequest,
  SENSOR_PLATFORMS_SEED,
} from '../../shared/domain/sensor-platform';
import { ThreatTwin } from '../../shared/domain/models';

export interface CoverageResult {
  trackId: string;
  covered: boolean;
  coveringSensors: string[];
  effectiveQuality: number; // 0-1, degraded when outside coverage or sensor jammed
}

export interface CoverageGap {
  x: number;
  y: number;
  radius: number;
  severity: 'MINOR' | 'MAJOR';
}

@Injectable({ providedIn: 'root' })
export class SensorCoverageStore {
  private audit = inject(AuditLogger);

  private _platforms = signal<SensorPlatform[]>(
    SENSOR_PLATFORMS_SEED.map(p => ({ ...p, position: { ...p.position } }))
  );
  private _taskingRequest = signal<SensorTaskingRequest | null>(null);
  private _taskingMode = signal<boolean>(false);
  private _tracks = signal<ThreatTwin[]>([]);

  readonly platforms = this._platforms.asReadonly();
  readonly taskingRequest = this._taskingRequest.asReadonly();
  readonly taskingMode = this._taskingMode.asReadonly();

  readonly activePlatforms = computed(() =>
    this._platforms().filter(p => p.status !== 'OFFLINE')
  );

  readonly coverage = computed((): CoverageResult[] => {
    const tracks = this._tracks();
    const platforms = this._platforms();
    return tracks.map(track => {
      const covering: string[] = [];
      let qualityBonus = 0;
      for (const p of platforms) {
        if (p.status === 'OFFLINE' || p.status === 'JAMMED') continue;
        const dist = Math.hypot(
          track.geometry.x - p.position.x,
          track.geometry.y - p.position.y
        );
        if (dist <= p.rangeRadius) {
          const degradation = p.status === 'DEGRADED' ? 0.5 : 1;
          covering.push(p.id);
          qualityBonus = Math.max(qualityBonus, p.trackQualityBonus * degradation);
        }
      }
      const covered = covering.length > 0;
      const baseQuality = track.sensorQuality ?? track.confidence;
      return {
        trackId: track.id,
        covered,
        coveringSensors: covering,
        effectiveQuality: covered
          ? Math.min(1, baseQuality + qualityBonus)
          : Math.max(0.1, baseQuality - 0.35),
      };
    });
  });

  readonly uncoveredTracks = computed(() =>
    this.coverage().filter(c => !c.covered).map(c => c.trackId)
  );

  readonly coverageGaps = computed((): CoverageGap[] => {
    const gaps: CoverageGap[] = [];
    const uncovered = this.coverage().filter(c => !c.covered);
    for (const c of uncovered) {
      const track = this._tracks().find(t => t.id === c.trackId);
      if (!track) continue;
      gaps.push({
        x: track.geometry.x,
        y: track.geometry.y,
        radius: 55,
        severity: track.intent === 'STRIKE' || track.intent === 'SATURATION' ? 'MAJOR' : 'MINOR',
      });
    }
    return gaps;
  });

  readonly hasCoverageAlert = computed(() => this.uncoveredTracks().length > 0);

  updateTracks(tracks: ThreatTwin[]): void {
    this._tracks.set(tracks);
  }

  setStatus(platformId: string, status: SensorPlatformStatus): void {
    this._platforms.update(ps =>
      ps.map(p => p.id === platformId ? { ...p, status } : p)
    );
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Sensor Status Changed',
      rationale: `Platform ${platformId} set to ${status}.`,
      category: 'TACTICAL',
    });
  }

  toggleJam(platformId: string): void {
    const p = this._platforms().find(x => x.id === platformId);
    if (!p) return;
    const next: SensorPlatformStatus = p.status === 'JAMMED' ? 'ACTIVE' : 'JAMMED';
    this.setStatus(platformId, next);
  }

  toggleTaskingMode(): void {
    this._taskingMode.update(v => !v);
    if (!this._taskingMode()) this._taskingRequest.set(null);
  }

  requestCoverage(x: number, y: number): void {
    this._taskingRequest.set({ x, y, requestedAt: Date.now() });
    // Assign nearest mobile, non-offline platform to the request
    const mobile = this._platforms().filter(
      p => p.mobile && p.status !== 'OFFLINE' && p.status !== 'JAMMED'
    );
    if (!mobile.length) return;

    const nearest = mobile.reduce((best, p) => {
      const d = Math.hypot(p.position.x - x, p.position.y - y);
      const bd = Math.hypot(best.position.x - x, best.position.y - y);
      return d < bd ? p : best;
    });

    this._platforms.update(ps =>
      ps.map(p =>
        p.id === nearest.id
          ? { ...p, status: 'TASKED', taskingTarget: { x, y } }
          : p
      )
    );

    this.audit.log({
      actor: 'OPERATOR',
      action: 'Sensor Tasking Request',
      rationale: `${nearest.callsign} tasked to cover (${x.toFixed(0)}, ${y.toFixed(0)}).`,
      category: 'TACTICAL',
    });

    // Move platform toward tasking target
    this._platforms.update(ps =>
      ps.map(p => {
        if (p.id !== nearest.id || !p.taskingTarget) return p;
        const dx = p.taskingTarget.x - p.position.x;
        const dy = p.taskingTarget.y - p.position.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.min(dist, p.rangeRadius * 0.6);
        return {
          ...p,
          position: {
            x: p.position.x + (dx / dist) * step,
            y: p.position.y + (dy / dist) * step,
          },
        };
      })
    );
  }

  cancelTasking(platformId: string): void {
    const seed = SENSOR_PLATFORMS_SEED.find(p => p.id === platformId);
    if (!seed) return;
    this._platforms.update(ps =>
      ps.map(p =>
        p.id === platformId
          ? { ...p, status: 'ACTIVE', taskingTarget: undefined, position: { ...seed.position } }
          : p
      )
    );
    this._taskingRequest.set(null);
  }

  coverageForTrack(trackId: string): CoverageResult | undefined {
    return this.coverage().find(c => c.trackId === trackId);
  }
}
