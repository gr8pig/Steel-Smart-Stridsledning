import { Injectable, signal, computed, inject } from '@angular/core';
import { debounceTime, Subject, switchMap } from 'rxjs';
import { PolicyTwin, COATwin } from '../../shared/domain/models';
import { AuditLogger } from '../services/audit-logger';
import { SteelApiService, COASolveResult } from '../services/steel-api.service';

@Injectable({ providedIn: 'root' })
export class PolicyStore {
  private audit = inject(AuditLogger);
  private api   = inject(SteelApiService);

  private _activePolicy   = signal<PolicyTwin | null>(null);
  private _solveResult    = signal<COASolveResult | null>(null);
  private _selectedCOAId  = signal<string | null>(null);
  private _solving        = signal(false);
  private _paretoSize     = signal(0);
  private _solveTimeMs    = signal(0);

  private _weightChange$ = new Subject<PolicyTwin['weights']>();

  activePolicy  = this._activePolicy.asReadonly();
  selectedCOAId = this._selectedCOAId.asReadonly();
  solving       = this._solving.asReadonly();
  paretoSize    = this._paretoSize.asReadonly();
  solveTimeMs   = this._solveTimeMs.asReadonly();

  availableCOAs = computed<COATwin[]>(() => this._solveResult()?.coas ?? []);

  selectedCOA = computed((): COATwin | null =>
    this.availableCOAs().find(c => c.id === this._selectedCOAId()) ?? null
  );

  legacyBaseline = computed(() => ({
    id: 'LEGACY-00', name: 'Legacy Baseline',
    robustnessScore: 0.42, leakage: 2.1, cost: 1100000, asymmetryRatio: 0.9,
  }));

  recommendedCOA = computed(() => {
    const w = this._activePolicy()?.weights;
    const coas = this.availableCOAs();
    if (!w || coas.length === 0) return coas[0] || null;
    if (w.safety > 0.75) return coas.find(c => c.type === 'MAX_PROTECTION') || coas[0];
    if (w.sustainability > 0.75) return coas.find(c => c.type === 'DEEP_SUSTAINABILITY') || coas[0];
    return coas.find(c => c.type === 'BALANCED') || coas[0];
  });

  constructor() {
    this._initPolicy();
    this._setupWeightDebounce();
    this._solveInitial();
  }

  updateWeights(weights: Partial<PolicyTwin['weights']>) {
    this._activePolicy.update(p => {
      if (!p) return null;
      const newWeights = { ...p.weights, ...weights };
      this.audit.log({
        actor: 'COMMANDER',
        action: 'Policy Weight Adjustment',
        rationale: `S:${(newWeights.safety*100).toFixed(0)}% U:${(newWeights.sustainability*100).toFixed(0)}% R:${(newWeights.resilience*100).toFixed(0)}%`,
        category: 'POLICY',
      });
      return { ...p, weights: newWeights };
    });

    const current = this._activePolicy()?.weights;
    if (current) {
      this._weightChange$.next(current);
      this.api.updatePolicy(current).subscribe({ error: (e) => console.error('[PolicyStore]', e) });
    }
  }

  updateGuardrails(guardrails: Partial<PolicyTwin['guardrails']>) {
    this._activePolicy.update(p => p ? { ...p, guardrails: { ...p.guardrails, ...guardrails } } : p);
  }

  setEngagementAuthority(level: PolicyTwin['guardrails']['engagementAuthority']) {
    const prev = this._activePolicy()?.guardrails.engagementAuthority;
    if (prev === level) return;
    this._activePolicy.update(p =>
      p ? { ...p, guardrails: { ...p.guardrails, engagementAuthority: level } } : p
    );
    const hitlMap = { AUTO: 'HNLT', SEMI: 'HOTL', MANUAL: 'HITL' } as const;
    this.audit.log({
      actor: 'COMMANDER',
      action: 'Authority Level Change',
      rationale: `Engagement authority changed from ${prev} (${hitlMap[prev!]}) to ${level} (${hitlMap[level]}). All subsequent engagements governed by new authority posture.`,
      category: 'POLICY',
    });
  }

  updateReadinessFloor(baseId: string, floor: number) {
    this._activePolicy.update(p => p ? {
      ...p, readinessFloors: { ...p.readinessFloors, [baseId]: floor },
    } : p);
  }

  selectCOA(id: string | null) {
    this._selectedCOAId.set(id);
    if (id) {
      const coa = this.availableCOAs().find((c: COATwin) => c.id === id);
      if (coa) {
        this.audit.log({
          actor: 'COMMANDER',
          action: 'COA Selection',
          rationale: `Authorizing ${coa.name} (${coa.type}).`,
          category: 'POLICY',
        });
      }
    }
  }

  /** Force a fresh solve (e.g. after new tracks arrive). */
  triggerSolve() {
    const w = this._activePolicy()?.weights;
    if (w) this._weightChange$.next(w);
  }

  private _setupWeightDebounce() {
    this._weightChange$.pipe(
      debounceTime(500),
      switchMap(weights => {
        this._solving.set(true);
        return this.api.solveCOAs(weights);
      }),
    ).subscribe({
      next: result => {
        this._solveResult.set(result);
        this._paretoSize.set(result.paretoFrontierSize);
        this._solveTimeMs.set(result.solveTimeMs);
        this._solving.set(false);
        // Auto-select BALANCED if nothing selected or previous id gone
        const ids = result.coas.map(c => c.id);
        if (!this._selectedCOAId() || !ids.includes(this._selectedCOAId()!)) {
          const balanced = result.coas.find(c => c.type === 'BALANCED');
          this._selectedCOAId.set(balanced?.id ?? result.coas[0]?.id ?? null);
        }
      },
      error: () => this._solving.set(false),
    });
  }

  private _solveInitial() {
    const w = this._activePolicy()?.weights;
    if (!w) return;
    this._solving.set(true);
    this.api.solveCOAs(w).subscribe({
      next: result => {
        this._solveResult.set(result);
        this._paretoSize.set(result.paretoFrontierSize);
        this._solveTimeMs.set(result.solveTimeMs);
        this._solving.set(false);
        const balanced = result.coas.find(c => c.type === 'BALANCED');
        this._selectedCOAId.set(balanced?.id ?? result.coas[0]?.id ?? null);
      },
      error: () => {
        this._solving.set(false);
        this._loadFallbackCOAs();
      },
    });
  }

  private _initPolicy() {
    this._activePolicy.set({
      id: 'POL-01',
      name: 'Standard Defense Posture',
      weights: { safety: 0.7, sustainability: 0.5, resilience: 0.6 },
      readinessFloors: { 'BASE-1': 0.60, 'BASE-2': 0.80, 'BASE-3': 0.50, 'BASE-4': 0.65, 'BASE-5': 0.70 },
      guardrails: {
        civilianProtected: true,
        reserveInterceptorFloor: 12,
        minReadinessThreshold: 0.65,
        criticalAssetPriority: 0.75,
        engagementAuthority: 'SEMI',
      },
    });
  }

  private _loadFallbackCOAs() {
    // Minimal fallback when backend is unavailable
    const rd = { 'BASE-1': -0.05, 'BASE-2': -0.02, 'BASE-3': -0.01, 'BASE-4': -0.02, 'BASE-5': 0.0 };
    this._solveResult.set({
      coas: [
        { id: 'COA-MAX', name: 'Max Protection',    type: 'MAX_PROTECTION',    rationale: 'Backend offline — fallback.', projectedOutcome: { intercepts: 3, leakage: 0, cost: 1200000, readinessDeltaByBase: rd, asymmetryRatio: 1.2, robustnessScore: 0.72, confidence: 0.90 }, assignments: [] },
        { id: 'COA-BAL', name: 'Balanced Approach', type: 'BALANCED',          rationale: 'Backend offline — fallback.', projectedOutcome: { intercepts: 2, leakage: 1, cost:  700000, readinessDeltaByBase: rd, asymmetryRatio: 3.4, robustnessScore: 0.85, confidence: 0.85 }, assignments: [] },
        { id: 'COA-DST', name: 'Deep Sustainability',type:'DEEP_SUSTAINABILITY',rationale: 'Backend offline — fallback.', projectedOutcome: { intercepts: 1, leakage: 2, cost:  250000, readinessDeltaByBase: rd, asymmetryRatio: 8.5, robustnessScore: 0.92, confidence: 0.80 }, assignments: [] },
      ] as COATwin[],
      paretoFrontierSize: 0,
      solveTimeMs: 0,
      threatCount: 0,
      reachableAssignments: 0,
    });
    this._selectedCOAId.set('COA-BAL');
  }
}
