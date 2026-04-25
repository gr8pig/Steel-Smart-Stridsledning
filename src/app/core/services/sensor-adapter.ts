/**
 * Sensor Feed Adapter — pluggable abstraction over theater data sources.
 *
 * Three implementations:
 *   - MockSensorAdapter    : deterministic synthetic deltas, no server required
 *   - ReplaySensorAdapter  : replays a fixed scenario at configurable speed
 *   - LiveWsSensorAdapter  : wraps the existing WebSocket /ws/theater connection
 *
 * TheaterWsService continues to work unchanged — it IS the live adapter under
 * the hood. This layer adds observability (connectionStatus) and swappability.
 */

import { Observable, Subject, interval, of } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { TheaterDelta } from './theater-ws.service';
import { BaseTwin, ThreatTwin } from '../../shared/domain/models';

export type FeedMode = 'LIVE' | 'MOCK' | 'REPLAY';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface SensorAdapter {
  readonly mode: FeedMode;
  /** Emits TheaterDeltas until disconnect() is called. */
  connect(): Observable<TheaterDelta>;
  disconnect(): void;
}

// ── Mock adapter ──────────────────────────────────────────────────────────────

const MOCK_BASES: BaseTwin[] = [
  { id: 'BASE-1', name: 'Northern Vanguard',  role: 'Interceptor Hub', readiness: 0.82, sortieCapacity: 24, runwayStatus: 'OPERATIONAL', airframesAvailable: 12, crewsAvailable: 18, crewFatigue: 0.1, fuelStock: 0.85, missileInventory: { interceptorShort: 40, interceptorMid: 20, interceptorLong: 10 }, recoveryTime: '2h', threatExposure: 0.2 },
  { id: 'BASE-2', name: 'Boreal Watch',        role: 'Forward Alert',   readiness: 0.91, sortieCapacity: 12, runwayStatus: 'OPERATIONAL', airframesAvailable: 8,  crewsAvailable: 12, crewFatigue: 0.05, fuelStock: 0.90, missileInventory: { interceptorShort: 20, interceptorMid: 10, interceptorLong: 5 },  recoveryTime: '1h', threatExposure: 0.4 },
  { id: 'BASE-3', name: 'Eastern Sentinel',    role: 'Radar Picket',    readiness: 0.64, sortieCapacity: 6,  runwayStatus: 'DEGRADED',    airframesAvailable: 4,  crewsAvailable: 6,  crewFatigue: 0.3, fuelStock: 0.60, missileInventory: { interceptorShort: 10, interceptorMid: 5,  interceptorLong: 2 },  recoveryTime: '4h', threatExposure: 0.1 },
  { id: 'BASE-4', name: 'Southern Anchor',     role: 'Logistic Base',   readiness: 0.77, sortieCapacity: 18, runwayStatus: 'OPERATIONAL', airframesAvailable: 10, crewsAvailable: 14, crewFatigue: 0.15, fuelStock: 0.75, missileInventory: { interceptorShort: 30, interceptorMid: 15, interceptorLong: 8 },  recoveryTime: '2h', threatExposure: 0.3 },
  { id: 'BASE-5', name: 'Deep Reserve Alpha',  role: 'Strategic Res',   readiness: 0.95, sortieCapacity: 36, runwayStatus: 'OPERATIONAL', airframesAvailable: 24, crewsAvailable: 32, crewFatigue: 0.0,  fuelStock: 0.98, missileInventory: { interceptorShort: 80, interceptorMid: 40, interceptorLong: 20 }, recoveryTime: '6h', threatExposure: 0.0 },
];

const MOCK_THREATS_SEED: ThreatTwin[] = [
  { id: 'TRK-001', class: 'MISSILE',   intent: 'STRIKE',      confidence: 0.89, timeToTarget: 240, targetId: 'BASE-2', geometry: { x: 920, y: 120, heading: 185, velocity: 480 }, status: 'TRACKING' },
  { id: 'TRK-002', class: 'DRONE',     intent: 'FEINT',       confidence: 0.54, timeToTarget: 380, targetId: 'BASE-1', geometry: { x: 750, y: 80,  heading: 200, velocity: 95  }, status: 'IDENTIFIED' },
  { id: 'TRK-003', class: 'AIRCRAFT',  intent: 'SATURATION',  confidence: 0.76, timeToTarget: 175, targetId: 'BASE-4', geometry: { x: 1050, y: 150, heading: 195, velocity: 320 }, status: 'TRACKING' },
];

export class MockSensorAdapter implements SensorAdapter {
  readonly mode: FeedMode = 'MOCK';
  private _stop$ = new Subject<void>();
  private _simTime = 0;
  private _threats = MOCK_THREATS_SEED.map(t => ({ ...t, geometry: { ...t.geometry } }));

  connect(): Observable<TheaterDelta> {
    return interval(2000).pipe(
      takeUntil(this._stop$),
      map(() => {
        this._simTime += 2;
        this._threats = this._threats.map(t => {
          if (t.status === 'NEUTRALIZED') return t;
          const tti = Math.max(0, t.timeToTarget - 2);
          const rad = t.geometry.heading * (Math.PI / 180);
          return {
            ...t,
            timeToTarget: tti,
            geometry: {
              ...t.geometry,
              x: +(t.geometry.x + Math.cos(rad) * (t.geometry.velocity / 50)).toFixed(1),
              y: +(t.geometry.y + Math.sin(rad) * (t.geometry.velocity / 50)).toFixed(1),
            },
          } as ThreatTwin;
        });
        return {
          type: 'DELTA' as const,
          simTime: this._simTime,
          threats: this._threats,
          bases: MOCK_BASES,
          phase: 'mock-mode',
        };
      }),
    );
  }

  disconnect(): void {
    this._stop$.next();
    this._stop$.complete();
  }
}

// ── Replay adapter ────────────────────────────────────────────────────────────

export interface ReplayScenario {
  frames: TheaterDelta[];
}

export class ReplaySensorAdapter implements SensorAdapter {
  readonly mode: FeedMode = 'REPLAY';
  private _stop$ = new Subject<void>();

  constructor(
    private readonly scenario: ReplayScenario,
    private readonly speedMultiplier = 1,
  ) {}

  connect(): Observable<TheaterDelta> {
    const frames = this.scenario.frames;
    if (frames.length === 0) return of();

    let idx = 0;
    const tickMs = Math.round(2000 / Math.max(0.25, this.speedMultiplier));

    return interval(tickMs).pipe(
      takeUntil(this._stop$),
      map(() => {
        const frame = frames[idx % frames.length];
        idx++;
        return frame;
      }),
    );
  }

  disconnect(): void {
    this._stop$.next();
    this._stop$.complete();
  }
}

/** Build a minimal replay scenario from a static base snapshot. */
export function buildReplayScenario(frameCount = 30): ReplayScenario {
  const frames: TheaterDelta[] = [];
  let simTime = 0;
  let threats = MOCK_THREATS_SEED.map(t => ({ ...t, geometry: { ...t.geometry } }));

  for (let i = 0; i < frameCount; i++) {
    simTime += 2;
    threats = threats.map(t => {
      const tti = Math.max(0, t.timeToTarget - 2);
      const rad = t.geometry.heading * (Math.PI / 180);
      return {
        ...t,
        timeToTarget: tti,
        geometry: {
          ...t.geometry,
          x: +(t.geometry.x + Math.cos(rad) * (t.geometry.velocity / 50)).toFixed(1),
          y: +(t.geometry.y + Math.sin(rad) * (t.geometry.velocity / 50)).toFixed(1),
        },
      } as ThreatTwin;
    });
    frames.push({ type: 'DELTA', simTime, threats: [...threats], bases: MOCK_BASES, phase: 'replay' });
  }
  return { frames };
}

// ── Live WebSocket adapter ────────────────────────────────────────────────────

/**
 * Thin wrapper that delegates to TheaterWsService.messages$.
 * Exists so that SensorFeedStore can treat live feed identically to mock/replay.
 */
export class LiveWsSensorAdapter implements SensorAdapter {
  readonly mode: FeedMode = 'LIVE';

  constructor(private readonly messages$: Observable<TheaterDelta>) {}

  connect(): Observable<TheaterDelta> {
    return this.messages$;
  }

  disconnect(): void {
    // TheaterWsService manages its own lifecycle — no-op here.
  }
}
