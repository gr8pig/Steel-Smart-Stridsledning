import { Injectable, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TheaterEvent } from '../../shared/domain/models';
import { SensorFeedStore } from './sensor-feed.store';
import { ScenarioStore } from './scenario.store';
import { AuditLogger, AuditEvent } from '../services/audit-logger';

const MAX_EVENTS = 200;
const EVENT_EXPIRY_MS = 300_000;

@Injectable({ providedIn: 'root' })
export class TheaterEventStore {
  private sensorFeed = inject(SensorFeedStore);
  private scenario = inject(ScenarioStore);
  private audit = inject(AuditLogger);
  private destroyRef = inject(DestroyRef);

  private _events = signal<TheaterEvent[]>([]);
  private _seenEventIds = new Set<string>();
  events = this._events.asReadonly();

  recentIntercepts = computed(() =>
    this._events().filter(e =>
      e.eventType === 'INTERCEPT_SUCCESS' || e.eventType === 'INTERCEPT_FAILURE'
    ).slice(0, 20)
  );

  recentStrikes = computed(() =>
    this._events().filter(e =>
      e.eventType === 'BASE_STRIKE' || e.eventType === 'BASE_DEGRADED' || e.eventType === 'BASE_DESTROYED'
    ).slice(0, 20)
  );

  baseStrikes = computed(() => {
    const strikes = this._events().filter(e =>
      e.eventType === 'BASE_STRIKE' || e.eventType === 'BASE_DEGRADED' || e.eventType === 'BASE_DESTROYED'
    );
    const map = new Map<string, TheaterEvent[]>();
    for (const s of strikes) {
      const baseId = (s.details as Record<string, unknown>)['baseId'] as string;
      if (!map.has(baseId)) map.set(baseId, []);
      map.get(baseId)!.push(s);
    }
    return map;
  });

  unacknowledgedEvents = computed(() =>
    this._events().filter(e => !(e as TheaterEvent & { acknowledged: boolean }).acknowledged)
  );

  constructor() {
    this.sensorFeed.frames$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(delta => {
      if (delta.events && Array.isArray(delta.events)) {
        const incoming = delta.events as TheaterEvent[];
        if (delta.type === 'FULL_SNAPSHOT') {
          this._events.set(incoming.slice(-MAX_EVENTS));
          this._seenEventIds = new Set(incoming.map(e => e.id));
        } else {
          const newEvents = incoming.filter(e => !this._seenEventIds.has(e.id));
          for (const evt of newEvents) {
            this._seenEventIds.add(evt.id);
            this._logEventToAudit(evt);
          }
          this._events.update(current => {
            const merged = [...current, ...newEvents];
            return merged.slice(-MAX_EVENTS);
          });
        }
      }
    });

    effect(() => {
      const events = this._events();
      if (events.length > MAX_EVENTS * 2) {
        const now = Date.now();
        const pruned = events.filter(e =>
          !e.timestamp || (now - e.timestamp * 1000) < EVENT_EXPIRY_MS
        );
        if (pruned.length < events.length) {
          this._events.set(pruned.slice(-MAX_EVENTS));
        }
      }
    }, { allowSignalWrites: true });
  }

  acknowledge(eventId: string) {
    this._events.update(events =>
      events.map(e =>
        e.id === eventId ? { ...e, acknowledged: true } as TheaterEvent & { acknowledged: boolean } : e
      )
    );
  }

  acknowledgeAll() {
    this._events.update(events =>
      events.map(e => ({ ...e, acknowledged: true } as TheaterEvent & { acknowledged: boolean }))
    );
  }

  clear() {
    this._events.set([]);
    this._seenEventIds.clear();
  }

  private _logEventToAudit(evt: TheaterEvent) {
    const d = evt.details as Record<string, unknown>;
    let actor: AuditEvent['actor'] = 'SYSTEM';
    let action = '';
    let rationale = '';
    let category: AuditEvent['category'] = 'TACTICAL';

    switch (evt.eventType) {
      case 'INTERCEPT_SUCCESS':
        actor = 'SYSTEM';
        action = `Intercept Success: ${d['trackId']}`;
        rationale = `${d['threatClass']} ${d['trackId']} neutralized by ${d['baseName'] || d['baseId']} using ${d['effectorType']} (Pk ${(d['pk'] as number ?? 0).toFixed(2)})`;
        category = 'TACTICAL';
        break;
      case 'INTERCEPT_FAILURE':
        actor = 'SYSTEM';
        action = `Intercept Failed: ${d['trackId']}`;
        rationale = `${d['threatClass']} ${d['trackId']} survived engagement by ${d['baseName'] || d['baseId']} — re-acquiring`;
        category = 'TACTICAL';
        break;
      case 'BASE_STRIKE':
        actor = 'SYSTEM';
        action = `Base Strike: ${d['baseName'] || d['baseId']}`;
        rationale = `${d['threatClass']} ${d['trackId']} leaked through — ${d['baseName'] || d['baseId']} struck (readiness ${Math.round((d['readinessAfter'] as number ?? 0) * 100)}%)`;
        category = 'TACTICAL';
        break;
      case 'BASE_DEGRADED':
        actor = 'SYSTEM';
        action = `Base Degraded: ${d['baseName'] || d['baseId']}`;
        rationale = `${d['baseName'] || d['baseId']} degraded to ${d['runwayStatusAfter']} — readiness ${Math.round((d['readinessAfter'] as number ?? 0) * 100)}%`;
        category = 'READINESS';
        break;
      case 'BASE_DESTROYED':
        actor = 'SYSTEM';
        action = `Base Destroyed: ${d['baseName'] || d['baseId']}`;
        rationale = `${d['baseName'] || d['baseId']} runway DISABLED — no further operations possible`;
        category = 'READINESS';
        break;
      case 'THREAT_IMMINENT':
        actor = 'SYSTEM';
        action = `Threat Imminent: ${d['trackId']}`;
        rationale = `${d['threatClass']} ${d['trackId']} approaching ${d['targetName'] || d['targetId']} — ETA ${d['timeToTarget']}s`;
        category = 'TACTICAL';
        break;
      case 'PHASE_SHIFT':
        actor = 'SYSTEM';
        action = `Phase: ${d['fromPhase']} → ${d['toPhase']}`;
        rationale = `Theater phase shifted from ${d['fromPhase']} to ${d['toPhase']}`;
        category = 'GOVERNANCE';
        break;
    }

    if (action) {
      this.audit.log({ actor, action, rationale, category });
    }
  }
}
