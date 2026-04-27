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
import { BaseTwin, ThreatTwin, TheaterEvent } from '../../shared/domain/models';

export type FeedMode = 'LIVE' | 'MOCK' | 'REPLAY';

// ── Interface ─────────────────────────────────────────────────────────────────

export interface SensorAdapter {
  readonly mode: FeedMode;
  /** Emits TheaterDeltas until disconnect() is called. */
  connect(): Observable<TheaterDelta>;
  disconnect(): void;
  seek?(simTime: number): void;
  setPaused?(paused: boolean): void;
}

// ── Mock adapter ──────────────────────────────────────────────────────────────

const MOCK_BASES: BaseTwin[] = [
  { id: 'BASE-1', name: 'Northern Vanguard Base', role: 'Forward Alert', readiness: 0.82, sortieCapacity: 24, runwayStatus: 'OPERATIONAL', airframesAvailable: 12, crewsAvailable: 18, crewFatigue: 0.1, fuelStock: 0.85, missileInventory: { interceptorShort: 40, interceptorMid: 20, interceptorLong: 10 }, recoveryTime: '02:00:00', threatExposure: 0.2 },
  { id: 'BASE-2', name: 'Highridge Command', role: 'Orchestrator', readiness: 0.91, sortieCapacity: 12, runwayStatus: 'OPERATIONAL', airframesAvailable: 8, crewsAvailable: 12, crewFatigue: 0.05, fuelStock: 0.9, missileInventory: { interceptorShort: 20, interceptorMid: 10, interceptorLong: 5 }, recoveryTime: '01:00:00', threatExposure: 0.4 },
  { id: 'BASE-3', name: 'Boreal Watch Post', role: 'Deep Sustainability', readiness: 0.64, sortieCapacity: 6, runwayStatus: 'DEGRADED', airframesAvailable: 4, crewsAvailable: 6, crewFatigue: 0.3, fuelStock: 0.6, missileInventory: { interceptorShort: 10, interceptorMid: 5, interceptorLong: 2 }, recoveryTime: '04:00:00', threatExposure: 0.1 },
  { id: 'BASE-4', name: 'Spear Point Base', role: 'Strike Ready', readiness: 0.77, sortieCapacity: 18, runwayStatus: 'OPERATIONAL', airframesAvailable: 10, crewsAvailable: 14, crewFatigue: 0.15, fuelStock: 0.75, missileInventory: { interceptorShort: 30, interceptorMid: 15, interceptorLong: 8 }, recoveryTime: '02:00:00', threatExposure: 0.3 },
  { id: 'BASE-5', name: 'Southern Redoubt', role: 'Reserve', readiness: 0.95, sortieCapacity: 36, runwayStatus: 'OPERATIONAL', airframesAvailable: 24, crewsAvailable: 32, crewFatigue: 0.0, fuelStock: 0.98, missileInventory: { interceptorShort: 80, interceptorMid: 40, interceptorLong: 20 }, recoveryTime: '06:00:00', threatExposure: 0.0 },
];

const MOCK_THREATS_SEED: ThreatTwin[] = [
  {
    id: 'TRK-001',
    class: 'MISSILE',
    platform: 'KALIBR',
    armaments: ['CRUISE_MISSILE'],
    armament: 'KINETIC_STRIKE',
    originCountry: 'RUSSIA',
    intent: 'STRIKE',
    confidence: 0.89,
    timeToTarget: 240,
    targetId: 'BASE-2',
    geometry: { x: 920, y: 120, heading: 185, velocity: 480 },
    status: 'TRACKING'
  },
  {
    id: 'TRK-002',
    class: 'DRONE',
    platform: 'ORLAN_10',
    armaments: ['NONE'],
    armament: 'ISR_SURVEILLANCE',
    originCountry: 'RUSSIA',
    intent: 'FEINT',
    confidence: 0.54,
    timeToTarget: 380,
    targetId: 'BASE-1',
    geometry: { x: 750, y: 80, heading: 200, velocity: 95 },
    status: 'IDENTIFIED'
  },
  {
    id: 'TRK-003',
    class: 'AIRCRAFT',
    platform: 'SU_35',
    armaments: ['SHORT_RANGE_AAM', 'LONG_RANGE_AAM'],
    armament: 'HYBRID_DECEPTION',
    originCountry: 'RUSSIA',
    intent: 'SATURATION',
    confidence: 0.76,
    timeToTarget: 175,
    targetId: 'BASE-4',
    geometry: { x: 1050, y: 150, heading: 195, velocity: 320 },
    status: 'TRACKING'
  },
];

function cloneBase(base: BaseTwin): BaseTwin {
  return {
    ...base,
    missileInventory: { ...base.missileInventory },
  };
}

function cloneThreat(threat: ThreatTwin): ThreatTwin {
  return {
    ...threat,
    geometry: { ...threat.geometry },
    intentDistribution: threat.intentDistribution ? { ...threat.intentDistribution } : undefined,
  };
}

function cloneEvent(event: TheaterEvent): TheaterEvent {
  return {
    ...event,
    details: { ...event.details },
  };
}

function cloneFrame(frame: TheaterDelta): TheaterDelta {
  return {
    ...frame,
    threats: (frame.threats as ThreatTwin[]).map(cloneThreat),
    bases: (frame.bases as BaseTwin[]).map(cloneBase),
    events: (frame.events as TheaterEvent[] | undefined)?.map(cloneEvent),
  };
}

function advanceTrackGeometry(track: ThreatTwin, seconds: number): ThreatTwin {
  const headingRad = (track.geometry.heading * Math.PI) / 180;
  const speedUnitsPerSecond = (track.geometry.velocity / 3600) / 0.25;
  const distance = speedUnitsPerSecond * seconds;

  return {
    ...track,
    geometry: {
      ...track.geometry,
      x: +(track.geometry.x + Math.sin(headingRad) * distance).toFixed(1),
      y: +(track.geometry.y + Math.cos(headingRad) * distance).toFixed(1),
    },
  };
}

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
          return {
            ...advanceTrackGeometry(t, 2),
            timeToTarget: tti,
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
  private _frames$ = new Subject<TheaterDelta>();
  private _frameIndex = 0;
  private _paused = false;
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly scenario: ReplayScenario,
    private readonly speedMultiplier = 1,
  ) {}

  connect(): Observable<TheaterDelta> {
    if (this.scenario.frames.length === 0) return of();

    queueMicrotask(() => {
      this._frames$.next(this._fullSnapshotAt(this._frameIndex));
      this._startTimer();
    });

    return this._frames$.asObservable();
  }

  disconnect(): void {
    this._stopTimer();
    this._frames$.complete();
  }

  seek(simTime: number): void {
    if (this.scenario.frames.length === 0) return;
    this._frameIndex = this._findFrameIndex(simTime);
    this._frames$.next(this._fullSnapshotAt(this._frameIndex));
    if (!this._paused) {
      this._stopTimer();
      this._startTimer();
    }
  }

  setPaused(paused: boolean): void {
    this._paused = paused;
    if (paused) {
      this._stopTimer();
      return;
    }
    this._startTimer();
  }

  private _findFrameIndex(simTime: number): number {
    let bestIndex = 0;
    for (let i = 0; i < this.scenario.frames.length; i++) {
      const frameTime = this.scenario.frames[i].simTime ?? 0;
      if (frameTime <= simTime) {
        bestIndex = i;
      } else {
        break;
      }
    }
    return bestIndex;
  }

  private _fullSnapshotAt(index: number): TheaterDelta {
    const frame = cloneFrame(this.scenario.frames[index]);
    const events = this.scenario.frames
      .slice(0, index + 1)
      .flatMap(step => ((step.events as TheaterEvent[] | undefined) ?? []).map(cloneEvent));

    return {
      ...frame,
      type: 'FULL_SNAPSHOT',
      events,
    };
  }

  private _deltaAt(index: number): TheaterDelta {
    const frame = cloneFrame(this.scenario.frames[index]);
    return {
      ...frame,
      type: 'DELTA',
    };
  }

  private _startTimer(): void {
    if (this._paused || this._timer || this.scenario.frames.length <= 1) return;

    const tickMs = Math.round(2000 / Math.max(0.25, this.speedMultiplier));
    this._timer = setInterval(() => {
      if (this._frameIndex >= this.scenario.frames.length - 1) {
        this._stopTimer();
        return;
      }

      this._frameIndex += 1;
      this._frames$.next(this._deltaAt(this._frameIndex));
    }, tickMs);
  }

  private _stopTimer(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

/** Build a minimal replay scenario from a static base snapshot. */
export function buildReplayScenario(frameCount = 30): ReplayScenario {
  const frames: TheaterDelta[] = [];
  const replayBases = MOCK_BASES.map(cloneBase);
  const replayThreats: ThreatTwin[] = [
    { id: 'TRK-101', class: 'MISSILE', intent: 'STRIKE', confidence: 0.92, timeToTarget: 18, targetId: 'BASE-2', geometry: { x: 865, y: 118, heading: 184, velocity: 460 }, status: 'TRACKING' },
    { id: 'TRK-102', class: 'DRONE', intent: 'FEINT', confidence: 0.61, timeToTarget: 12, targetId: 'BASE-1', geometry: { x: 245, y: 248, heading: 196, velocity: 105 }, status: 'IDENTIFIED' },
    { id: 'TRK-103', class: 'AIRCRAFT', intent: 'SATURATION', confidence: 0.78, timeToTarget: 16, targetId: 'BASE-4', geometry: { x: 972, y: 690, heading: 172, velocity: 320 }, status: 'TRACKING' },
    { id: 'TRK-104', class: 'MISSILE', intent: 'STRIKE', confidence: 0.87, timeToTarget: 20, targetId: 'BASE-4', geometry: { x: 942, y: 612, heading: 180, velocity: 480 }, status: 'TRACKING' },
    { id: 'TRK-105', class: 'MISSILE', intent: 'STRIKE', confidence: 0.9, timeToTarget: 26, targetId: 'BASE-4', geometry: { x: 930, y: 540, heading: 182, velocity: 470 }, status: 'TRACKING' },
  ];

  const event = (id: string, simTime: number, eventType: TheaterEvent['eventType'], details: Record<string, unknown>): TheaterEvent => ({
    id,
    simTime,
    eventType,
    details,
    timestamp: 1_700_000_000 + simTime,
  });

  const pushFrame = (simTime: number, phase: string, events: TheaterEvent[] = []) => {
    frames.push({
      type: 'DELTA',
      simTime,
      threats: replayThreats.map(cloneThreat),
      bases: replayBases.map(cloneBase),
      phase,
      scenarioName: 'Boreal Sentinel I Replay',
      events,
    });
  };

  pushFrame(0, 'INITIAL_ASSESSMENT');

  replayThreats[2] = { ...replayThreats[2], status: 'IDENTIFIED', timeToTarget: 14, geometry: { ...replayThreats[2].geometry, y: 734 } };
  pushFrame(2, 'INITIAL_ASSESSMENT', [
    event('EVT-R-001', 2, 'THREAT_IMMINENT', {
      trackId: 'TRK-103',
      threatClass: 'AIRCRAFT',
      targetId: 'BASE-4',
      targetName: 'Spear Point Base',
      timeToTarget: 14,
    }),
  ]);

  replayThreats[1] = { ...replayThreats[1], status: 'NEUTRALIZED', timeToTarget: 0, geometry: { ...replayThreats[1].geometry, x: 214, y: 286 } };
  pushFrame(4, 'INITIAL_ASSESSMENT', [
    event('EVT-R-002', 4, 'INTERCEPT_SUCCESS', {
      trackId: 'TRK-102',
      threatClass: 'DRONE',
      baseId: 'BASE-1',
      baseName: 'Northern Vanguard Base',
      effectorType: 'interceptor_short',
      pk: 0.78,
    }),
  ]);

  replayThreats[0] = { ...replayThreats[0], status: 'TRACKING', timeToTarget: 12, geometry: { ...replayThreats[0].geometry, y: 166 } };
  pushFrame(6, 'INITIAL_ASSESSMENT', [
    event('EVT-R-003', 6, 'INTERCEPT_FAILURE', {
      trackId: 'TRK-101',
      threatClass: 'MISSILE',
      baseId: 'BASE-2',
      baseName: 'Highridge Command',
      effectorType: 'interceptor_mid',
      pk: 0.41,
    }),
  ]);

  replayThreats[2] = { ...replayThreats[2], status: 'LEAKED', timeToTarget: 0, geometry: { ...replayThreats[2].geometry, x: 936, y: 822 } };
  replayBases[3] = {
    ...replayBases[3],
    readiness: 0.58,
    crewsAvailable: 12,
    fuelStock: 0.64,
    missileInventory: { interceptorShort: 26, interceptorMid: 14, interceptorLong: 7 },
  };
  pushFrame(8, 'KINETIC_STRIKE', [
    event('EVT-R-004', 8, 'BASE_STRIKE', {
      trackId: 'TRK-103',
      threatClass: 'AIRCRAFT',
      baseId: 'BASE-4',
      baseName: 'Spear Point Base',
      readinessAfter: 0.58,
      runwayStatusAfter: 'OPERATIONAL',
    }),
    event('EVT-R-005', 8, 'PHASE_SHIFT', {
      fromPhase: 'INITIAL_ASSESSMENT',
      toPhase: 'KINETIC_STRIKE',
    }),
  ]);

  replayThreats[3] = { ...replayThreats[3], status: 'LEAKED', timeToTarget: 0, geometry: { ...replayThreats[3].geometry, x: 926, y: 838 } };
  replayBases[3] = {
    ...replayBases[3],
    readiness: 0.46,
    runwayStatus: 'DEGRADED',
    airframesAvailable: 7,
    crewsAvailable: 10,
    fuelStock: 0.48,
    missileInventory: { interceptorShort: 21, interceptorMid: 11, interceptorLong: 5 },
  };
  pushFrame(10, 'KINETIC_STRIKE', [
    event('EVT-R-006', 10, 'BASE_DEGRADED', {
      trackId: 'TRK-104',
      threatClass: 'MISSILE',
      baseId: 'BASE-4',
      baseName: 'Spear Point Base',
      readinessAfter: 0.46,
      runwayStatusAfter: 'DEGRADED',
    }),
  ]);

  replayThreats[4] = { ...replayThreats[4], status: 'IDENTIFIED', timeToTarget: 8, geometry: { ...replayThreats[4].geometry, y: 644 } };
  pushFrame(12, 'KINETIC_STRIKE', [
    event('EVT-R-007', 12, 'THREAT_IMMINENT', {
      trackId: 'TRK-105',
      threatClass: 'MISSILE',
      targetId: 'BASE-4',
      targetName: 'Spear Point Base',
      timeToTarget: 8,
    }),
  ]);

  replayThreats[4] = { ...replayThreats[4], status: 'LEAKED', timeToTarget: 0, geometry: { ...replayThreats[4].geometry, x: 918, y: 834 } };
  replayBases[3] = {
    ...replayBases[3],
    readiness: 0.18,
    runwayStatus: 'DISABLED',
    airframesAvailable: 4,
    crewsAvailable: 6,
    fuelStock: 0.2,
    missileInventory: { interceptorShort: 14, interceptorMid: 7, interceptorLong: 2 },
  };
  pushFrame(14, 'SUSTAINED_ENGAGEMENT', [
    event('EVT-R-008', 14, 'BASE_DESTROYED', {
      trackId: 'TRK-105',
      threatClass: 'MISSILE',
      baseId: 'BASE-4',
      baseName: 'Spear Point Base',
      readinessAfter: 0.18,
      runwayStatusAfter: 'DISABLED',
    }),
    event('EVT-R-009', 14, 'PHASE_SHIFT', {
      fromPhase: 'KINETIC_STRIKE',
      toPhase: 'SUSTAINED_ENGAGEMENT',
    }),
  ]);

  while (frames.length < frameCount) {
    const previous = frames[frames.length - 1];
    const nextTime = previous.simTime + 2;
    pushFrame(nextTime, previous.phase, []);
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
