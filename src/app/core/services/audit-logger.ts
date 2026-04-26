import { Injectable, signal, inject } from '@angular/core';
import { ScenarioStore } from '../state/scenario.store';
import { SteelApiService } from './steel-api.service';

export interface AuditEvent {
  id: string;
  time: string;
  simTime?: number;
  actor: 'SYSTEM' | 'COMMANDER' | 'ANALYST' | 'ADMIN' | 'DIRECTOR' | 'OPERATOR';
  action: string;
  rationale: string;
  category: 'TACTICAL' | 'POLICY' | 'READINESS' | 'LAB' | 'SYSTEM' | 'GOVERNANCE';
}

@Injectable({ providedIn: 'root' })
export class AuditLogger {
  private scenario = inject(ScenarioStore);
  private api = inject(SteelApiService);

  private _logs = signal<AuditEvent[]>([
    {
      id: 'init',
      time: new Date(Date.now() - 3600000).toLocaleTimeString(),
      actor: 'SYSTEM',
      action: 'System Initialization',
      rationale: 'Steel Smart Stridsledning baseline policies and twins synchronized.',
      category: 'SYSTEM'
    }
  ]);

  logs = this._logs.asReadonly();

  log(event: Omit<AuditEvent, 'id' | 'time' | 'simTime'>) {
    const newEvent: AuditEvent = {
      ...event,
      id: `evt-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      simTime: this.scenario.simTime(),
    };
    this._logs.update(list => [newEvent, ...list]);
    this.api.logAuditEvent({ eventType: event.action ?? 'ACTION', payload: event, actorId: event.actor }).subscribe();
  }

  clear() {
    this._logs.set([]);
  }
}
