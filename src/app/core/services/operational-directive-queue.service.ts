import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuditLogger } from './audit-logger';
import { BdtApiService } from './bdt-api.service';
import { SteelLocalPersistenceService } from './steel-local-persistence.service';
import { SensorFeedStore } from '../state/sensor-feed.store';
import { TacticalStore } from '../state/tactical.store';
import { OperationalDirective } from '../../shared/domain/models';

type EngageDirectiveInput = Pick<OperationalDirective, 'trackId' | 'baseId' | 'effectorType' | 'rationale'>;

@Injectable({ providedIn: 'root' })
export class OperationalDirectiveQueueService {
  private api = inject(BdtApiService);
  private audit = inject(AuditLogger);
  private persistence = inject(SteelLocalPersistenceService);
  private sensorFeed = inject(SensorFeedStore);
  private tactical = inject(TacticalStore);

  private _directives = signal<OperationalDirective[]>(this.persistence.loadOperationalDirectives());
  private _flushInFlight = false;

  readonly directives = this._directives.asReadonly();
  readonly pendingDirectives = computed(() =>
    this._directives().filter(d => d.state === 'QUEUED' || d.state === 'FAILED' || d.state === 'SENT')
  );
  readonly pendingCount = computed(() => this.pendingDirectives().length);
  readonly pendingTrackIds = computed(() => new Set(this.pendingDirectives().map(d => d.trackId)));

  constructor() {
    effect(() => {
      const directives = this._directives();
      this.persistence.saveOperationalDirectives(directives);
    });

    effect(() => {
      const status = this.sensorFeed.connectionStatus();
      const pending = this.pendingDirectives();
      if (status === 'CONNECTED' && pending.length > 0) {
        queueMicrotask(() => this.flushQueuedDirectives());
      }
    });
  }

  enqueueEngagement(input: EngageDirectiveInput): OperationalDirective {
    const now = new Date().toISOString();
    const directive: OperationalDirective = {
      id: this._buildDirectiveId(),
      type: 'ENGAGE_TRACK',
      state: 'QUEUED',
      createdAt: now,
      updatedAt: now,
      source: 'OFFLINE_QUEUE',
      trackId: input.trackId,
      baseId: input.baseId,
      effectorType: input.effectorType,
      rationale: input.rationale,
      lastAttemptAt: null,
      error: null,
    };

    this._directives.update(current => [...current, directive]);
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Offline Directive Queued',
      rationale: `Queued engagement for ${input.trackId}. Will replay when link returns.`,
      category: 'TACTICAL',
    });
    return directive;
  }

  flushQueuedDirectives(): void {
    if (this._flushInFlight || this.sensorFeed.connectionStatus() !== 'CONNECTED') return;
    const candidate = this._directives().find(d => d.type === 'ENGAGE_TRACK' && (d.state === 'QUEUED' || d.state === 'FAILED'));
    if (!candidate) return;

    this._flushInFlight = true;
    const attemptedAt = new Date().toISOString();
    this._setDirectiveState(candidate.id, {
      state: 'SENT',
      updatedAt: attemptedAt,
      lastAttemptAt: attemptedAt,
      error: null,
    });

    this._sendDirective(candidate);
  }

  private _sendDirective(candidate: OperationalDirective): void {
    this.api.engageTrack(candidate.trackId, candidate.baseId, candidate.effectorType, {
      clientActionId: candidate.id,
      deviceId: 'steel-angular-tactical',
      queuedAt: candidate.createdAt,
    }).subscribe({
      next: () => {
        const updatedAt = new Date().toISOString();
        this._setDirectiveState(candidate.id, {
          state: 'ACKNOWLEDGED',
          updatedAt,
          lastAttemptAt: updatedAt,
          error: null,
        });
        this.tactical.markEngaged(candidate.trackId);
        this.audit.log({
          actor: 'SYSTEM',
          action: 'Queued Directive Replayed',
          rationale: `Queued engagement for ${candidate.trackId} acknowledged by backend.`,
          category: 'TACTICAL',
        });
        this._flushInFlight = false;
        queueMicrotask(() => this.flushQueuedDirectives());
      },
      error: () => {
        this._setDirectiveState(candidate.id, {
          state: 'FAILED',
          updatedAt: new Date().toISOString(),
          error: 'Replay failed',
        });
        this._flushInFlight = false;
      },
    });
  }

  private _setDirectiveState(
    id: string,
    patch: Partial<Pick<OperationalDirective, 'state' | 'updatedAt' | 'lastAttemptAt' | 'error'>>
  ): void {
    this._directives.update(current => current.map(d => d.id === id ? { ...d, ...patch } : d));
  }

  private _buildDirectiveId(): string {
    return `DIR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
