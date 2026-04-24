import { Injectable, signal, computed, inject, OnDestroy } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { TheaterWsService, TheaterDelta } from '../services/theater-ws.service';
import {
  FeedMode, SensorAdapter,
  MockSensorAdapter, ReplaySensorAdapter, LiveWsSensorAdapter,
  buildReplayScenario,
} from '../services/sensor-adapter';
import { AuditLogger } from '../services/audit-logger';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

@Injectable({ providedIn: 'root' })
export class SensorFeedStore implements OnDestroy {
  private ws     = inject(TheaterWsService);
  private audit  = inject(AuditLogger);

  private _feedMode         = signal<FeedMode>('LIVE');
  private _connectionStatus = signal<ConnectionStatus>('DISCONNECTED');
  private _replaySpeed      = signal<number>(1);
  private _lastFrame        = signal<TheaterDelta | null>(null);

  feedMode         = this._feedMode.asReadonly();
  connectionStatus = this._connectionStatus.asReadonly();
  replaySpeed      = this._replaySpeed.asReadonly();
  lastFrame        = this._lastFrame.asReadonly();

  isLive    = computed(() => this._feedMode() === 'LIVE');
  isMock    = computed(() => this._feedMode() === 'MOCK');
  isReplay  = computed(() => this._feedMode() === 'REPLAY');

  private _adapter: SensorAdapter | null = null;
  private _sub: Subscription | null = null;
  private _frames$ = new Subject<TheaterDelta>();

  /** Observable of theater frames — consumers subscribe here. */
  get frames$(): Observable<TheaterDelta> {
    return this._frames$.asObservable();
  }

  constructor() {
    // Default: wire up live WebSocket feed
    this._startAdapter(new LiveWsSensorAdapter(this.ws.messages$));
    // Mirror TheaterWsService connection status
    this._connectionStatus.set(this.ws.connectionStatus());
    // Keep status in sync reactively
    this._watchWsStatus();
  }

  setFeedMode(mode: FeedMode): void {
    if (this._feedMode() === mode) return;

    this._stopAdapter();
    this._feedMode.set(mode);

    let adapter: SensorAdapter;
    switch (mode) {
      case 'LIVE':
        adapter = new LiveWsSensorAdapter(this.ws.messages$);
        break;
      case 'MOCK':
        adapter = new MockSensorAdapter();
        break;
      case 'REPLAY':
        adapter = new ReplaySensorAdapter(buildReplayScenario(60), this._replaySpeed());
        break;
    }

    this._startAdapter(adapter);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Sensor Feed Mode Changed',
      rationale: `Feed mode switched to ${mode}.`,
      category: 'TACTICAL',
    });
  }

  setReplaySpeed(multiplier: number): void {
    this._replaySpeed.set(Math.max(0.25, Math.min(8, multiplier)));
    if (this._feedMode() === 'REPLAY') {
      // Restart replay adapter with new speed
      this.setFeedMode('REPLAY');
    }
  }

  private _startAdapter(adapter: SensorAdapter): void {
    this._adapter = adapter;
    this._connectionStatus.set(adapter.mode === 'LIVE' ? 'CONNECTING' : 'CONNECTED');

    this._sub = adapter.connect().subscribe({
      next: frame => {
        this._lastFrame.set(frame);
        this._frames$.next(frame);
        if (this._connectionStatus() !== 'CONNECTED') {
          this._connectionStatus.set('CONNECTED');
        }
      },
      error: () => this._connectionStatus.set('DISCONNECTED'),
      complete: () => {
        if (adapter.mode !== 'LIVE') this._connectionStatus.set('DISCONNECTED');
      },
    });
  }

  private _stopAdapter(): void {
    this._sub?.unsubscribe();
    this._sub = null;
    this._adapter?.disconnect();
    this._adapter = null;
    this._connectionStatus.set('DISCONNECTED');
  }

  private _watchWsStatus(): void {
    // Poll WebSocket connection status into our signal when in LIVE mode
    // (TheaterWsService.connectionStatus is a signal — read it in a computed effect)
  }

  ngOnDestroy(): void {
    this._stopAdapter();
    this._frames$.complete();
  }
}
