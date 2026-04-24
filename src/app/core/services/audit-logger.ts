import { Injectable, signal, inject } from '@angular/core';
import { ScenarioStore } from '../state/scenario.store';

export interface AuditEvent {
  id: string;
  time: string;
  simTime?: number;
  actor: 'SYSTEM' | 'COMMANDER' | 'ANALYST' | 'ADMIN' | 'DIRECTOR' | 'OPERATOR';
  action: string;
  rationale: string;
  category: 'TACTICAL' | 'POLICY' | 'READINESS' | 'LAB' | 'SYSTEM';
}

@Injectable({ providedIn: 'root' })
export class AuditLogger {
  private scenario = inject(ScenarioStore);

  private _logs = signal<AuditEvent[]>([
    {
      id: 'init',
      time: new Date(Date.now() - 3600000).toLocaleTimeString(),
      actor: 'SYSTEM',
      action: 'System Initialization',
      rationale: 'Steel baseline policies and twins synchronized.',
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
  }

  clear() {
    this._logs.set([]);
  }
}
