import { Injectable, signal, computed, inject } from '@angular/core';
import { ForestStructureService } from '../services/forest-structure.service';
import { ForestStructure, TrainingSamplesPayload, DecisionPathNode } from '../ml/forest.models';
import { AuditLogger } from '../services/audit-logger';

export type ModelKey = 'robustness' | 'failure' | 'intent';

@Injectable({ providedIn: 'root' })
export class ForestStore {
  private api = inject(ForestStructureService);
  private audit = inject(AuditLogger);

  private _structure = signal<ForestStructure | null>(null);
  private _samples = signal<TrainingSamplesPayload | null>(null);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  private _selectedModel = signal<ModelKey>('robustness');
  private _selectedTreeIndex = signal<number | null>(null);
  private _activeDecisionPath = signal<DecisionPathNode[] | null>(null);
  private _laserActive = signal(false);

  structure = this._structure.asReadonly();
  samples = this._samples.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();
  selectedModel = this._selectedModel.asReadonly();
  selectedTreeIndex = this._selectedTreeIndex.asReadonly();
  activeDecisionPath = this._activeDecisionPath.asReadonly();
  laserActive = this._laserActive.asReadonly();

  currentModel = computed(() => {
    const s = this._structure();
    const key = this._selectedModel();
    return s ? s[key] : null;
  });

  selectedTree = computed(() => {
    const model = this.currentModel();
    const idx = this._selectedTreeIndex();
    if (!model || idx === null) return null;
    return model.trees[idx] ?? null;
  });

  totalNodes = computed(() => {
    const s = this._structure();
    if (!s) return 0;
    return s.robustness.nEstimators * (s.robustness.trees[0]?.nodeCount ?? 0)
      + s.failure.nEstimators * (s.failure.trees[0]?.nodeCount ?? 0)
      + s.intent.nEstimators * (s.intent.trees[0]?.nodeCount ?? 0);
  });

  loadStructure(): void {
    if (this._structure()) return;
    this._loading.set(true);
    this._error.set(null);
    this.api.getForestStructure().subscribe({
      next: data => {
        this._structure.set(data);
        this._loading.set(false);
        this.audit.log({ actor: 'ANALYST', action: 'Forest structure loaded', rationale: `${data.robustness.nEstimators + data.failure.nEstimators + data.intent.nEstimators} trees`, category: 'LAB' });
      },
      error: err => {
        this._error.set(err.message ?? 'Failed to load forest structure');
        this._loading.set(false);
      },
    });
  }

  loadSamples(n = 5000): void {
    if (this._samples()) return;
    this.api.getTrainingSamples(n).subscribe({
      next: data => {
        this._samples.set(data);
      },
      error: err => {
        console.error('Failed to load training samples:', err);
      },
    });
  }

  selectModel(key: ModelKey): void {
    this._selectedModel.set(key);
    this._selectedTreeIndex.set(null);
    this._activeDecisionPath.set(null);
  }

  selectTree(index: number | null): void {
    this._selectedTreeIndex.set(index);
    this._activeDecisionPath.set(null);
  }

  setDecisionPath(path: DecisionPathNode[]): void {
    this._activeDecisionPath.set(path);
  }

  setLaserActive(active: boolean): void {
    this._laserActive.set(active);
  }

  traceDecisionPath(featureVector: number[]): void {
    const tree = this.selectedTree();
    if (!tree) return;
    const path: DecisionPathNode[] = [];
    let nodeId = 0;
    const nodes = tree.nodes;
    const maxSteps = tree.maxDepth + 1;
    for (let step = 0; step < maxSteps && nodeId < nodes.length; step++) {
      const node = nodes[nodeId];
      path.push({
        nodeId: node.id,
        feature: node.feature,
        threshold: node.threshold,
        value: node.value,
        isLeaf: node.isLeaf,
      });
      if (node.isLeaf) break;
      const featureVal = featureVector[node.featureIndex] ?? 0;
      nodeId = featureVal <= (node.threshold ?? 0) ? (node.left ?? 0) : (node.right ?? 0);
    }
    this._activeDecisionPath.set(path);
  }
}