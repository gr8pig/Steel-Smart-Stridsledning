import { Injectable, OnDestroy, NgZone, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import { BaseTwin, ThreatTwin } from '../../shared/domain/models';

export type WsConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

export interface TheaterDelta {
  type: 'FULL_SNAPSHOT' | 'DELTA';
  simTime: number;
  threats: ThreatTwin[];
  bases: BaseTwin[];
  phase: string;
}

@Injectable({ providedIn: 'root' })
export class TheaterWsService implements OnDestroy {
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private socket: WebSocket | null = null;
  private _messages$ = new Subject<TheaterDelta>();
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _destroyed = false;
  private _connectionStatus = signal<WsConnectionStatus>('DISCONNECTED');

  readonly messages$: Observable<TheaterDelta> = this._messages$.pipe(share());
  readonly connectionStatus = this._connectionStatus.asReadonly();

  constructor() {
    // WebSocket requires browser APIs — skip during SSR
    if (isPlatformBrowser(this.platformId)) {
      this._connect();
    }
  }

  private _connect(): void {
    if (this._destroyed) return;

    this._connectionStatus.set('CONNECTING');

    // Derive WebSocket URL from current page host (works with Angular proxy)
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/theater`;

    try {
      this.socket = new WebSocket(url);
    } catch {
      this._connectionStatus.set('DISCONNECTED');
      this._scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.zone.run(() => this._connectionStatus.set('CONNECTED'));
      if (this._reconnectTimer) {
        clearTimeout(this._reconnectTimer);
        this._reconnectTimer = null;
      }
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data: TheaterDelta = JSON.parse(event.data);
        // Run inside NgZone so Angular signals update immediately
        this.zone.run(() => this._messages$.next(data));
      } catch { /* ignore malformed frames */ }
    };

    this.socket.onclose = () => {
      this.zone.run(() => this._connectionStatus.set('DISCONNECTED'));
      if (!this._destroyed) this._scheduleReconnect();
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private _scheduleReconnect(): void {
    if (this._destroyed || this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._connect();
    }, 3000);
  }

  /** Send a keepalive / arbitrary message to the server. */
  ping(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send('ping');
    }
  }

  ngOnDestroy(): void {
    this._destroyed = true;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this.socket?.close();
    this._messages$.complete();
  }
}
