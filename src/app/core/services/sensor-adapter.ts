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

export type FeedMode = 'LIVE' | 'MOCK' | 'REPLAY';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface SensorAdapter {
  readonly mode: FeedMode;
  /** Emits TheaterDeltas until disconnect() is called. */
  connect(): Observable<TheaterDelta>;
  disconnect(): void;
}

// ── Mock adapter ──────────────────────────────────────────────────────────────

const MOCK_BASES = [
  { id: 'BASE-1', name: 'Northern Vanguard',  readiness: 0.82 },
  { id: 'BASE-2', name: 'Boreal Watch',        readiness: 0.91 },
  { id: 'BASE-3', name: 'Eastern Sentinel',    readiness: 0.64 },
  { id: 'BASE-4', name: 'Southern Anchor',     readiness: 0.77 },
  { id: 'BASE-5', name: 'Deep Reserve Alpha',  readiness: 0.95 },
];

const MOCK_THREATS_SEED = [
  { id: 'TRK-001', class: 'MISSILE',   intent: 'STRIKE',      confidence: 0.89, timeToTarget: 240, targetId: 'BASE-2', geometry: { x: 920, y: 120, heading: 185, velocity: 480 }, status: 'TRACKING'    as const },
  { id: 'TRK-002', class: 'DRONE',     intent: 'FEINT',       confidence: 0.54, timeToTarget: 380, targetId: 'BASE-1', geometry: { x: 750, y: 80,  heading: 200, velocity: 95  }, status: 'IDENTIFIED'  as const },
  { id: 'TRK-003', class: 'AIRCRAFT',  intent: 'SATURATION',  confidence: 0.76, timeToTarget: 175, targetId: 'BASE-4', geometry: { x: 1050, y: 150, heading: 195, velocity: 320 }, status: 'TRACKING'   as const },
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
          if (t.status === 'NEUTRALIZED' as string) return t;
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
          };
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
      };
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
