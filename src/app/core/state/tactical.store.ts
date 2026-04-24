import { Injectable, signal, computed, inject, DestroyRef, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ThreatTwin } from '../../shared/domain/models';
import { AuditLogger } from '../services/audit-logger';
import { IntentEstimatorService } from '../services/intent-estimator.service';
import { ScenarioStore } from './scenario.store';
import { PolicyStore } from './policy.store';
import { SensorFeedStore } from './sensor-feed.store';

function _upsertTracks(current: ThreatTwin[], incoming: ThreatTwin[]): ThreatTwin[] {
  if (!incoming?.length) return current;
  const map = new Map(current.map(t => [t.id, t]));
  for (const t of incoming) map.set(t.id, t as ThreatTwin);
  return Array.from(map.values());
}

@Injectable({ providedIn: 'root' })
export class TacticalStore {
  private audit      = inject(AuditLogger);
  private sensorFeed = inject(SensorFeedStore);
  private estimator  = inject(IntentEstimatorService);
  private scenario  = inject(ScenarioStore);
  private policy    = inject(PolicyStore);
  private destroyRef = inject(DestroyRef);

  private _tracks = signal<ThreatTwin[]>([]);
  private _selectedTrackId = signal<string | null>(null);
  private _labHandoffTrackId = signal<string | null>(null);
  private _engagements = signal<Record<string, { status: 'ACCEPTED' | 'MANUAL' | 'HELD' | 'ESCALATED', rationale: string }>>({});

  tracks = this._tracks.asReadonly();
  selectedTrackId = this._selectedTrackId.asReadonly();
  labHandoffTrackId = this._labHandoffTrackId.asReadonly();
  engagements = this._engagements.asReadonly();

  selectedTrack = computed(() =>
    this._tracks().find(t => t.id === this._selectedTrackId()) || null
  );

  labHandoffTrack = computed(() =>
    this._tracks().find(t => t.id === this._labHandoffTrackId()) || null
  );

  activeThreats = computed(() =>
    this._tracks().filter(t => t.status !== 'NEUTRALIZED')
  );

  imminentThreats = computed(() =>
    this.activeThreats().sort((a, b) => a.timeToTarget - b.timeToTarget)
  );

  private _prevTrackCount = 0;

  // Enrich tracks that lack backend intentDistribution with estimator posteriors.
  // Backend data always takes precedence; estimator fills the gap.
  private _enrich(tracks: ThreatTwin[]): ThreatTwin[] {
    return tracks.map(t => {
      if (t.intentDistribution) return t;
      const posterior = this.estimator.update(t);
      return { ...t, intentDistribution: this.estimator.toTwinDistribution(posterior) };
    });
  }

  constructor() {
    this.sensorFeed.frames$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(delta => {
      if (delta.type === 'FULL_SNAPSHOT') {
        this._tracks.set(this._enrich((delta.threats ?? []) as ThreatTwin[]));
      } else if (delta.threats?.length) {
        this._tracks.update(current =>
          this._enrich(_upsertTracks(current, delta.threats as ThreatTwin[]))
        );
      }
      if (delta.simTime !== undefined) {
        this.scenario.setSimTime(delta.simTime);
      }
    });

    // Re-solve COAs whenever the number of active tracks changes.
    effect(() => {
      const count = this._tracks().length;
      if (count !== this._prevTrackCount && this._prevTrackCount > 0) {
        this.policy.triggerSolve();
      }
      this._prevTrackCount = count;
    });
  }

  selectTrack(id: string | null) {
    this._selectedTrackId.set(id);
    if (id) {
      this.audit.log({
        actor: 'ANALYST',
        action: 'Track Selection',
        rationale: `Selected ${id} for multi-spectral sensor inspection and intent analysis.`,
        category: 'TACTICAL'
      });
    }
  }

  setLabHandoff(id: string | null) {
    this._labHandoffTrackId.set(id);
  }

  updateEngagement(trackId: string, status: 'ACCEPTED' | 'MANUAL' | 'HELD' | 'ESCALATED', rationale: string) {
    this._engagements.update(e => ({ ...e, [trackId]: { status, rationale } }));
    this.audit.log({ actor: 'OPERATOR', action: `Engagement Action: ${status}`, rationale, category: 'TACTICAL' });
    if (status === 'ACCEPTED') {
      setTimeout(() => {
        this._tracks.update(tracks => tracks.map(t =>
          t.id === trackId ? { ...t, status: 'NEUTRALIZED' } : t
        ));
      }, 2000);
    }
  }

  /** Optimistically mark a track as ENGAGED after backend confirms the intercept order. */
  markEngaged(trackId: string) {
    this._tracks.update(tracks =>
      tracks.map(t => t.id === trackId ? { ...t, status: 'ENGAGED' } : t)
    );
  }

  /** Used by DemoDirector reset for immediate local feedback before WS reconciles. */
  addBulkTracks(count: number, type: 'FEINT' | 'KINETIC' | 'MIXED' | 'DRONE') {
    const newTracks: ThreatTwin[] = [];
    for (let i = 0; i < count; i++) {
      const id = `INJ-${Math.floor(Math.random() * 8999) + 1000}`;
      newTracks.push({
        id,
        class: type === 'DRONE' ? 'DRONE' : (Math.random() > 0.5 ? 'MISSILE' : 'AIRCRAFT'),
        intent: type === 'FEINT' ? 'FEINT' : (type === 'KINETIC' ? 'STRIKE' : 'SATURATION'),
        confidence: type === 'FEINT' ? 0.35 : 0.85,
        timeToTarget: Math.floor(Math.random() * 200) + 50,
        targetId: 'Boreal-Watch',
        geometry: { x: 800 + (Math.random() - 0.5) * 400, y: 50 + Math.random() * 100, heading: 180, velocity: type === 'KINETIC' ? 450 : 120 },
        status: 'TRACKING'
      });
    }
    this._tracks.update(t => [...t, ...this._enrich(newTracks)]);
    this.audit.log({ actor: 'SYSTEM', action: 'Track Injection', rationale: `Injected ${count} ${type} tracks (local preview).`, category: 'TACTICAL' });
  }

  clearTracks() {
    this._tracks.set([]);
    this.audit.log({ actor: 'SYSTEM', action: 'Clear Theater', rationale: 'Scenario tracks purged for baseline reset.', category: 'TACTICAL' });
  }
}
