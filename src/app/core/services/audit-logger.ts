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

  /**
   * Merges server-persisted events into the in-memory log.
   * Server entries are cast to AuditEvent shape and deduplicated by id.
   * Called once on governance page init to restore history across page reloads.
   */
  seedFromServer(raw: unknown[]) {
    if (!raw?.length) return;
    const serverEvents: AuditEvent[] = (raw as Record<string, unknown>[])
      .filter(e => e && typeof e === 'object')
      .map(e => ({
        id:        String(e['id'] ?? e['eventType'] ?? `srv-${Date.now()}`),
        time:      String(e['time'] ?? e['serverTs'] ?? new Date().toLocaleTimeString()),
        actor:     (e['actorId'] ?? e['actor'] ?? 'SYSTEM') as AuditEvent['actor'],
        action:    String(e['action'] ?? e['eventType'] ?? 'SERVER_EVENT'),
        rationale: String(e['rationale'] ?? ''),
        category:  (e['category'] ?? 'SYSTEM') as AuditEvent['category'],
      }));

    this._logs.update(current => {
      const existingIds = new Set(current.map(e => e.id));
      const newEntries = serverEvents.filter(e => !existingIds.has(e.id));
      // Append older server entries below the current session events
      return newEntries.length ? [...current, ...newEntries] : current;
    });
  }

  clear() {
    this._logs.set([]);
  }
}
