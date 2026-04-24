import { Injectable, signal, computed, inject, effect, untracked } from '@angular/core';
import { DecisionFabricTwin } from '../../shared/domain/decision-fabric';
import { TacticalStore } from './tactical.store';
import { PolicyStore } from './policy.store';
import { LogisticsStore } from './logistics.store';
import { LabStore } from './lab.store';
import { CommandFrictionEngine } from '../sim/command-friction-engine';
import { AuditLogger } from '../services/audit-logger';

@Injectable({ providedIn: 'root' })
export class DecisionFabricStore {
  private tactical = inject(TacticalStore);
  private policy = inject(PolicyStore);
  private logistics = inject(LogisticsStore);
  private lab = inject(LabStore);
  private audit = inject(AuditLogger);
  
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

  state = this._state.asReadonly();
  resilienceScore = computed(() => this._state().c2ResilienceScore);
  status = computed(() => this._state().status);
  collapseHorizon = computed(() => this._state().projectedCollapseSec);

  constructor() {
    // Audit Logging for threshold crossings
    effect(() => {
      const currentStatus = this.status();
      const currentScore = this.resilienceScore();
      if (this._prevStatus && currentStatus !== this._prevStatus) {
        this.audit.log({
          actor: 'SYSTEM',
          action: 'C2 Resilience Shift',
          rationale: `Decision fabric status changed from ${this._prevStatus} to ${currentStatus}. Score: ${currentScore.toFixed(2)}`,
          category: 'SYSTEM'
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
        this._state.update(s => ({
          ...s,
          c2ResilienceScore: newScore,
          trustEntropy: 1 - trust,
          operatorLoad: 1 - cognitive,
          authorityFriction: 1 - tempo,
          failureProbability: pFail,
          projectedCollapseSec: collapseSec,
          status: newScore < 0.3 ? 'COLLAPSED' : (newScore < 0.6 ? 'STRESSED' : 'HEALTHY'),
          timestamp: new Date().toISOString()
        }));
        
        this._prevScore = newScore;
        this._prevTimestamp = now;
      });
    }, { allowSignalWrites: true });
  }
}
