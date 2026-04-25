import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { DecisionFabricSnapshot, DecisionFabricTwin } from '../../shared/domain/decision-fabric';
import { SyncMetadata } from '../../shared/domain/models';
import { TacticalStore } from './tactical.store';
import { PolicyStore } from './policy.store';
import { LogisticsStore } from './logistics.store';
import { LabStore } from './lab.store';
import { CommandFrictionEngine } from '../sim/command-friction-engine';
import { AuditLogger } from '../services/audit-logger';
import { SensorFeedStore } from './sensor-feed.store';
import { SteelLocalPersistenceService } from '../services/steel-local-persistence.service';

@Injectable({ providedIn: 'root' })
export class DecisionFabricStore {
  private tactical = inject(TacticalStore);
  private policy = inject(PolicyStore);
  private logistics = inject(LogisticsStore);
  private lab = inject(LabStore);
  private audit = inject(AuditLogger);
  private sensorFeed = inject(SensorFeedStore);
  private persistence = inject(SteelLocalPersistenceService);
  
  private _prevScore = 1.0;
  private _prevTimestamp = Date.now();
  private _prevStatus: string | null = null;

  private _state = signal<DecisionFabricTwin>({
    id: 'C2-TWIN-01',
    simTime: 0,
    c2ResilienceScore: 1.0,
    trustEntropy: 0,
    authorityFriction: 0,
    operatorLoad: 0,
    auditCompleteness: 1.0,
    failureProbability: 0,
    projectedCollapseSec: null,
    status: 'HEALTHY',
    timestamp: new Date().toISOString()
  });
  private _sync = signal<SyncMetadata>({
    source: 'HEURISTIC',
    lastSyncedAt: null,
    updatedAt: new Date().toISOString(),
    stale: true,
  });

  state = this._state.asReadonly();
  sync = this._sync.asReadonly();
  resilienceScore = computed(() => this._state().c2ResilienceScore);
  status = computed(() => this._state().status);
  collapseHorizon = computed(() => this._state().projectedCollapseSec);

  constructor() {
    const cached = this.persistence.loadDecisionFabricSnapshot();
    if (cached?.state) {
      this._state.set(cached.state);
      this._sync.set({
        source: 'CACHED',
        lastSyncedAt: cached.sync?.lastSyncedAt ?? cached.cachedAt,
        updatedAt: cached.cachedAt,
        stale: true,
      });
    }

    // Audit Logging for threshold crossings
    effect(() => {
      const currentStatus = this.status();
      const currentScore = this.resilienceScore();
      if (this._prevStatus && currentStatus !== this._prevStatus) {
        this.audit.log({
          actor: 'SYSTEM',
          action: 'C2 Resilience Shift',
          rationale: `Decision fabric status changed from ${this._prevStatus} to ${currentStatus}. Score: ${currentScore.toFixed(2)}`,
          category: 'GOVERNANCE'
        });
      }
      this._prevStatus = currentStatus;
    });

    effect(() => {
      // Dependencies
      const tracks = this.tactical.activeThreats().length;
      const authority = this.policy.activePolicy()?.guardrails.engagementAuthority;
      const supplyHealth = this.logistics.supplyHealth();
      const pFail = this.lab.latestInsight()?.fullResult?.failureProbability ?? 0;
      const tacticalSync = this.tactical.sync();
      const connectionStatus = this.sensorFeed.connectionStatus();
      
      // Heuristic: Cognitive capacity degrades by 5% per active track
      const cognitive = Math.max(0, 1 - (tracks * 0.05));
      
      // Heuristic: Manual authority creates friction that scales with track density
      const tempo = authority === 'MANUAL' 
        ? Math.max(0, 1 - (tracks * 0.08)) 
        : (authority === 'SEMI' ? Math.max(0, 1 - (tracks * 0.02)) : 1.0);
      
      // Heuristic: Trust degrades as supply health drops (representing comms/sensor maintenance)
      const trust = Math.max(0.1, supplyHealth);
      
      const newScore = CommandFrictionEngine.calculateResilience({
        trust, 
        tempo, 
        cognitive, 
        audit: 1 - pFail // ML Failure Risk integration into core resilience score
      });

      const now = Date.now();
      const dt = (now - this._prevTimestamp) / 1000;
      
      const collapseSec = CommandFrictionEngine.projectCollapse(
        newScore, 
        this._prevScore, 
        dt, 
        pFail
      );

      // Use untracked set to prevent infinite loop
      untracked(() => {
        const updatedAt = new Date().toISOString();
        this._state.update(s => ({
          ...s,
          c2ResilienceScore: newScore,
          trustEntropy: 1 - trust,
          operatorLoad: 1 - cognitive,
          authorityFriction: 1 - tempo,
          failureProbability: pFail,
          projectedCollapseSec: collapseSec,
          status: newScore < 0.3 ? 'COLLAPSED' : (newScore < 0.6 ? 'STRESSED' : 'HEALTHY'),
          timestamp: updatedAt
        }));
        this._sync.set({
          source: connectionStatus === 'DISCONNECTED' ? 'HEURISTIC' : (tacticalSync.source === 'CACHED' ? 'CACHED' : 'HEURISTIC'),
          lastSyncedAt: tacticalSync.lastSyncedAt,
          updatedAt,
          stale: connectionStatus !== 'CONNECTED',
        });
        
        this._prevScore = newScore;
        this._prevTimestamp = now;
      });
    }, { allowSignalWrites: true });

    effect(() => {
      const snapshot: DecisionFabricSnapshot = {
        state: this._state(),
        sync: this._sync(),
        cachedAt: new Date().toISOString(),
      };
      this.persistence.saveDecisionFabricSnapshot(snapshot);
    });
  }
}
