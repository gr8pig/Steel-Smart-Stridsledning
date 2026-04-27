import { Injectable, signal, computed, inject } from '@angular/core';
import { ScenarioPhase } from '../../shared/domain/models';
import { SteelApiService, ScenarioInfo } from '../services/steel-api.service';

@Injectable({ providedIn: 'root' })
export class ScenarioStore {
  private api = inject(SteelApiService);

  private _scenarioName = signal<string>('Boreal Sentinel I');
  private _currentPhaseId = signal<string>('phase-1');
  private _simTime = signal<number>(0);
  private _runState = signal<'IDLE' | 'RUNNING' | 'PAUSED' | 'REPLAY'>('IDLE');
  private _mode = signal<'LIVE' | 'REPLAY' | 'LAB' | 'DEMO'>('LIVE');
  private _isJamming = signal<boolean>(false);
  private _scenarios = signal<ScenarioInfo[]>([]);
  private _loading = signal<boolean>(false);

  private _phases = signal<ScenarioPhase[]>([
    { id: 'phase-1', name: 'Pre-Engagement', status: 'COMPLETED', description: 'Monitoring and scouting phase' },
    { id: 'phase-2', name: 'Initial Swarm', status: 'ACTIVE', description: 'Multiple low-value drone clusters detected' },
    { id: 'phase-3', name: 'Second Wave', status: 'UPCOMING', description: 'Possible kinetic high-value strike' },
  ]);

  scenarioName = this._scenarioName.asReadonly();
  currentPhaseId = this._currentPhaseId.asReadonly();
  simTime = this._simTime.asReadonly();
  runState = this._runState.asReadonly();
  mode = this._mode.asReadonly();
  phases = this._phases.asReadonly();
  isJamming = this._isJamming.asReadonly();
  scenarios = this._scenarios.asReadonly();
  loading = this._loading.asReadonly();

  currentPhase = computed(() =>
    this._phases().find(p => p.id === this._currentPhaseId())
  );

  setRunState(state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'REPLAY') {
    this._runState.set(state);
  }

  setPhase(id: string) {
    this._currentPhaseId.set(id);
    this._phases.update(phases => phases.map(p => {
      if (p.id === id) return { ...p, status: 'ACTIVE' };
      const activeIdx = phases.findIndex(ph => ph.id === id);
      const curIdx = phases.findIndex(ph => ph.id === p.id);
      if (curIdx < activeIdx) return { ...p, status: 'COMPLETED' };
      return { ...p, status: 'UPCOMING' };
    }));
  }

  setJamming(state: boolean) {
    this._isJamming.set(state);
  }

  setScenarioName(name: string) {
    this._scenarioName.set(name);
  }

  syncPhaseFromBackend(phase: string) {
    const phaseMap: Record<string, string> = {
      'ALL_CLEAR': 'phase-1',
      'INITIAL_ASSESSMENT': 'phase-1',
      'KINETIC_STRIKE': 'phase-2',
      'SUSTAINED_ENGAGEMENT': 'phase-3',
      'CRITICAL_FAILURE': 'phase-3',
      'PROBE_DECEPTION': 'phase-2',
      'SKETCH': 'phase-1',
    };
    const phaseId = phaseMap[phase] || 'phase-1';
    if (phaseId !== this._currentPhaseId()) {
      this.setPhase(phaseId);
    }
  }

  tick() {
    if (this._runState() === 'RUNNING') {
      this._simTime.update(t => t + 1);
    }
  }

  setSimTime(t: number) {
    this._simTime.set(t);
  }

  reset() {
    this._simTime.set(0);
    this._runState.set('IDLE');
  }

  constructor() {
    this.api.getCampaign().subscribe({
      next: (res) => {
        if (res.scenarioName) {
          this._scenarioName.set(res.scenarioName);
        }
        if (res.phase) {
          this.syncPhaseFromBackend(res.phase);
        }
      },
      error: () => { /* backend unavailable — use defaults */ },
    });
  }

  loadScenarios() {
    this.api.listScenarios().subscribe({
      next: (scenarios) => this._scenarios.set(scenarios),
      error: () => { /* silently fail — scenarios will remain empty */ },
    });
  }

  selectScenario(scenarioId: string) {
    this._loading.set(true);
    this.api.loadScenario(scenarioId).subscribe({
      next: (res) => {
        this._scenarioName.set(res.scenarioName || res.scenario || scenarioId);
        this._simTime.set(res.simTime || 0);
        this._runState.set('RUNNING');
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
      },
    });
  }
}
