import { Injectable, signal, computed } from '@angular/core';
import { ScenarioPhase } from '../../shared/domain/models';

@Injectable({ providedIn: 'root' })
export class ScenarioStore {
  // Signals for state
  private _scenarioName = signal<string>('Boreal Sentinel I');
  private _currentPhaseId = signal<string>('phase-1');
  private _simTime = signal<number>(0);
  private _runState = signal<'IDLE' | 'RUNNING' | 'PAUSED' | 'REPLAY'>('IDLE');
  private _mode = signal<'LIVE' | 'REPLAY' | 'LAB' | 'DEMO'>('LIVE');
  private _isJamming = signal<boolean>(false);
  
  private _phases = signal<ScenarioPhase[]>([
    { id: 'phase-1', name: 'Pre-Engagement', status: 'COMPLETED', description: 'Monitoring and scouting phase' },
    { id: 'phase-2', name: 'Initial Swarm', status: 'ACTIVE', description: 'Multiple low-value drone clusters detected' },
    { id: 'phase-3', name: 'Second Wave', status: 'UPCOMING', description: 'Possible kinetic high-value strike' },
  ]);

  // Readonly access
  scenarioName = this._scenarioName.asReadonly();
  currentPhaseId = this._currentPhaseId.asReadonly();
  simTime = this._simTime.asReadonly();
  runState = this._runState.asReadonly();
  mode = this._mode.asReadonly();
  phases = this._phases.asReadonly();
  isJamming = this._isJamming.asReadonly();

  currentPhase = computed(() => 
    this._phases().find(p => p.id === this._currentPhaseId())
  );

  // Actions
  setRunState(state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'REPLAY') {
    this._runState.set(state);
  }

  setPhase(id: string) {
    this._currentPhaseId.set(id);
    this._phases.update(phases => phases.map(p => {
      if (p.id === id) return { ...p, status: 'ACTIVE' };
      // Simple logic: if index is less than active, it's completed
      const activeIdx = phases.findIndex(ph => ph.id === id);
      const curIdx = phases.findIndex(ph => ph.id === p.id);
      if (curIdx < activeIdx) return { ...p, status: 'COMPLETED' };
      return { ...p, status: 'UPCOMING' };
    }));
  }

  setJamming(state: boolean) {
    this._isJamming.set(state);
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
}
