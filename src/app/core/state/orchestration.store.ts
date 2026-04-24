import { Injectable, signal, computed, inject } from '@angular/core';
import { TacticalStore } from './tactical.store';
import { PolicyStore } from './policy.store';
import { AuditLogger } from '../services/audit-logger';

export interface PublishedIntent {
  coaId: string;
  policyId: string;
  timestamp: string;
  commanderRationale: string;
}

export interface DemoStory {
  id: 'RESILIENCE' | 'ROBUSTNESS' | 'NONE';
  name: string;
  currentStep: number;
  totalSteps: number;
}

@Injectable({ providedIn: 'root' })
export class OrchestrationStore {
  private tacticalStore = inject(TacticalStore);
  private policyStore = inject(PolicyStore);
  private audit = inject(AuditLogger);

  // 1. Selected Track Context (Proxied + Extended)
  selectedTrackId = this.tacticalStore.selectedTrackId;
  selectedTrack = this.tacticalStore.selectedTrack;

  // 2. Selected COA Context (Proxied)
  selectedCOAId = this.policyStore.selectedCOAId;
  selectedCOA = this.policyStore.selectedCOA;

  // 3. Commander Intent Publication State
  private _publishedIntent = signal<PublishedIntent | null>(null);
  publishedIntent = this._publishedIntent.asReadonly();

  // 4. Active Demo Path
  private _activeStory = signal<DemoStory>({
    id: 'NONE',
    name: 'Normal Operations',
    currentStep: 0,
    totalSteps: 0
  });
  activeStory = this._activeStory.asReadonly();

  // 5. Lightweight Audit Stream (Derived Signal for UI highlights)
  latestTacticalEvent = computed(() => 
    this.audit.logs().find(l => l.category === 'TACTICAL')
  );

  latestPolicyEvent = computed(() => 
    this.audit.logs().find(l => l.category === 'POLICY')
  );

  // Actions
  publishIntent(rationale: string) {
    const coa = this.policyStore.selectedCOA();
    const policy = this.policyStore.activePolicy();

    if (coa && policy) {
      const intent: PublishedIntent = {
        coaId: coa.id,
        policyId: policy.id,
        timestamp: new Date().toLocaleTimeString(),
        commanderRationale: rationale
      };
      
      this._publishedIntent.set(intent);
      
      this.audit.log({
        actor: 'COMMANDER',
        action: 'Intent Published',
        rationale: `Published ${coa.name} into theater. Tactical stations updated with new burn constraints.`,
        category: 'POLICY'
      });
    }
  }

  setDemoStory(story: DemoStory) {
    this._activeStory.set(story);
  }

  // Cross-screen Handoffs
  handoffToLab(trackId: string) {
    // Shared handoff signal
    this.tacticalStore.setLabHandoff(trackId);
  }

  handoffCOAToLab() {
    const coaId = this.selectedCOAId();
    if (coaId) {
        this.audit.log({
            actor: 'COMMANDER',
            action: 'COA Stress Test Requested',
            rationale: `Direct handoff of ${coaId} to Robustness Lab for adversarial stress testing.`,
            category: 'POLICY'
        });
    }
  }

  clearIntent() {
    this._publishedIntent.set(null);
  }
}
