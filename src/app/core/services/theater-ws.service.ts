import { Injectable, OnDestroy, NgZone, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { share } from 'rxjs/operators';
import { API_BASE_URL } from '../tokens/api.token';

export type WsConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';
// ... (TheaterDelta interface)
export interface TheaterDelta {
  type: string;
  simTime: number;
  threats: unknown[];
  bases: unknown[];
  phase: string;
}

@Injectable({ providedIn: 'root' })
export class TheaterWsService implements OnDestroy {
  private zone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);
  private apiBase = inject(API_BASE_URL);
  private socket: WebSocket | null = null;
  private _messages$ = new Subject<TheaterDelta>();
  private _connectionStatus = signal<WsConnectionStatus>('DISCONNECTED');
  private _destroyed = false;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _reconnectAttempt = 0;
  private _reconnecting = false;

  readonly messages$: Observable<TheaterDelta> = this._messages$.pipe(share());
  readonly connectionStatus = this._connectionStatus.asReadonly();

  constructor() {
    // WebSocket requires browser APIs — skip during SSR
    if (isPlatformBrowser(this.platformId)) {
      this.connect();
    }
  }

  connect(): void {
    if (this._destroyed || this._reconnecting) return;

    this._reconnecting = true;
    this._connectionStatus.set('CONNECTING');

    // Derive WebSocket URL from API_BASE_URL token
    const url = (() => {
       const base = this.apiBase.replace(/\/$/, ''); // Remove trailing slash
       const wsProto = base.startsWith('https') ? 'wss' : 'ws';
       return `${base.replace(/^http(s)?/, wsProto)}/ws/theater`;
    })();

    try {
      this.socket = new WebSocket(url);
    } catch {
      this._reconnecting = false;
      this._connectionStatus.set('DISCONNECTED');
      this._scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this._reconnecting = false;
      this._reconnectAttempt = 0;
      this.zone.run(() => this._connectionStatus.set('CONNECTED'));
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const data: TheaterDelta = JSON.parse(event.data);
        // Run inside NgZone so Angular signals update immediately
        this.zone.run(() => this._messages$.next(data));
      } catch { /* ignore malformed frames */ }
    };

    this.socket.onclose = () => {
      this._reconnecting = false;
      this.zone.run(() => this._connectionStatus.set('DISCONNECTED'));
      if (!this._destroyed) {
        const delay = Math.min(30_000, 1_000 * Math.pow(2, this._reconnectAttempt)) + Math.random() * 500;
        this._reconnectAttempt++;
        console.warn('[TheaterWS] Connection closed, reconnecting in', Math.round(delay), 'ms (attempt', this._reconnectAttempt, ')');
        this._reconnectTimer = setTimeout(() => this.connect(), delay);
      }
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private _scheduleReconnect(): void {
    if (this._destroyed || this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
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
