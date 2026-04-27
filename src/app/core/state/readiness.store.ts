import { Injectable, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { BaseTwin } from '../../shared/domain/models';
import { AuditLogger } from '../services/audit-logger';
import { SteelLocalPersistenceService } from '../services/steel-local-persistence.service';
import { SensorFeedStore } from './sensor-feed.store';

function _upsertBases(current: BaseTwin[], incoming: BaseTwin[]): BaseTwin[] {
  if (!incoming?.length) return current;
  const map = new Map(current.map(b => [b.id, b]));
  for (const b of incoming) map.set(b.id, b as BaseTwin);
  return Array.from(map.values());
}

@Injectable({ providedIn: 'root' })
export class ReadinessStore {
  private audit = inject(AuditLogger);
  private sensorFeed = inject(SensorFeedStore);
  private persistence = inject(SteelLocalPersistenceService);
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);

  private _bases = signal<BaseTwin[]>([]);

  bases = this._bases.asReadonly();

  overallReadiness = computed(() => {
    const activeBases = this._bases();
    if (activeBases.length === 0) return 0;
    return activeBases.reduce((acc, b) => acc + b.readiness, 0) / activeBases.length;
  });

  constructor() {
    const cached = this.persistence.loadReadinessSnapshot();
    if (cached?.bases?.length) {
      this._bases.set(cached.bases);
    }

    this.sensorFeed.frames$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(delta => {
      if (delta.type === 'FULL_SNAPSHOT') {
        this._bases.set((delta.bases ?? []) as BaseTwin[]);
      } else if (delta.bases?.length) {
        this._bases.update(current => _upsertBases(current, delta.bases as BaseTwin[]));
      }
    });

    effect(() => {
      const bases = this._bases();
      if (bases.length > 0) {
        this.persistence.saveReadinessSnapshot({
          bases,
          cachedAt: new Date().toISOString(),
        });
      }
    });
  }

  loadProjections() {
    // This will be implemented/expanded to refresh projections from the API
    console.log('[ReadinessStore] loadProjections triggered');
  }

  toggleReserve(baseId: string) {
    this._bases.update(bases => bases.map(b => {
      if (b.id === baseId) {
        const newState = !b.isReserved;
        this.audit.log({
          actor: 'COMMANDER',
          action: `Base Reserve ${newState ? 'Enforced' : 'Released'}`,
          rationale: `${newState ? 'Marking' : 'Unmarking'} ${b.name} as strategic reserve. Readiness floor adjusted.`,
          category: 'READINESS'
        });
        return { ...b, isReserved: newState };
      }
      return b;
    }));

    const reservedIds = this._bases().filter(b => b.isReserved).map(b => b.id);
    this.http.post('/api/twins/policy', { reservedBases: [...reservedIds] })
      .subscribe({ 
        next: () => this.loadProjections(), 
        error: (e) => console.error('[ReadinessStore] toggleReserve', e) 
      });
  }

  rebalanceBase(baseId: string) {
    const currentBases = this._bases();
    const strongest = [...currentBases].sort((a, b) => b.readiness - a.readiness)[0];
    const target = currentBases.find(b => b.id === baseId);
    if (strongest && strongest.id !== baseId && target) {
      const amount = 5;
      const fromBaseId = strongest.id;
      const toBaseId = baseId;

      this._bases.update(bases => bases.map(b => {
        if (b.id === strongest.id) return { ...b, readiness: Math.max(0.1, b.readiness - 0.05) };
        if (b.id === baseId) return { ...b, readiness: Math.min(1.0, b.readiness + 0.05) };
        return b;
      }));
      this.audit.log({
        actor: 'COMMANDER',
        action: 'Resource Rebalance',
        rationale: `Manually rebalancing readiness from ${strongest.name} to ${target.name} following theater risk shift.`,
        category: 'READINESS'
      });

      this.http.post('/api/twins/rebalance', { fromBaseId, toBaseId, amount })
        .subscribe({ 
          next: () => this.loadProjections(), 
          error: (e) => console.error('[ReadinessStore] rebalance', e) 
        });
    }
  }
}
