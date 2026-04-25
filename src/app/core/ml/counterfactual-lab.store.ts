import { Injectable, computed, signal } from '@angular/core';
import {
  CounterfactualAsset,
  CounterfactualPrediction,
  CounterfactualPolicyDeltas,
  CounterfactualSimulationRequest,
  CounterfactualTheaterVector,
  DeepSimJobMetadata,
  ForecastMetric,
} from './counterfactual-lab.models';

const DEFAULT_HORIZON = [0, 5, 10, 15, 20, 25, 30];
const DEFAULT_MODEL_VERSION = 'synthetic-ensemble-v2';
const DEFAULT_ENSEMBLE_MEMBERS = 7;
const DEFAULT_RUNS = 1000;

@Injectable({ providedIn: 'root' })
export class CounterfactualLabStore {
  private readonly _theater = signal<CounterfactualTheaterVector | null>(null);
  private readonly _assets = signal<CounterfactualAsset[]>([]);
  private readonly _selectedAssetId = signal<string | null>(null);
  private readonly _currentPrediction = signal<CounterfactualPrediction | null>(null);
  private readonly _isSimulating = signal<boolean>(false);
  private readonly _trustLevel = signal<number>(1.0);
  private readonly _activePolicyDeltas = signal<CounterfactualPolicyDeltas>({ safety: 0, sustainability: 0, resilience: 0 });
  private readonly _deepSimJob = signal<DeepSimJobMetadata | null>(null);

  readonly currentTrajectory = this._currentPrediction.asReadonly();
  readonly latestPrediction = this._currentPrediction.asReadonly();
  readonly isSimulating = this._isSimulating.asReadonly();
  readonly trustLevel = this._trustLevel.asReadonly();
  readonly activePolicyDeltas = this._activePolicyDeltas.asReadonly();
  readonly selectedAssetId = this._selectedAssetId.asReadonly();
  readonly availableAssets = this._assets.asReadonly();
  readonly deepSimJob = this._deepSimJob.asReadonly();
  readonly simulationTheater = this._theater.asReadonly();

  readonly selectedAsset = computed(() => {
    const assets = this._assets();
    const id = this._selectedAssetId();
    return assets.find(asset => asset.id === id) ?? assets[0] ?? null;
  });

  readonly forecastSeries = computed(() => this._currentPrediction()?.metric_trajectories ?? []);
  readonly ensembleMembers = computed(() => this._currentPrediction()?.ensemble_members ?? []);
  readonly featureImportances = computed(() => this._currentPrediction()?.feature_importances ?? []);
  readonly assetImpacts = computed(() => this._currentPrediction()?.asset_impacts ?? []);

  readonly selectedMetric = computed<ForecastMetric | null>(() => {
    const metrics = this.forecastSeries();
    return metrics.find(metric => metric.name === 'robustness') ?? metrics[0] ?? null;
  });

  readonly simulationRequest = computed<CounterfactualSimulationRequest | null>(() => {
    const theater = this._theater();
    const selectedAsset = this.selectedAsset();
    if (!theater || !selectedAsset) return null;
    return {
      theater,
      assets: this._assets(),
      selectedAssetId: this._selectedAssetId() ?? selectedAsset.id,
      horizonMinutes: DEFAULT_HORIZON,
      modelVersion: DEFAULT_MODEL_VERSION,
      nEnsembleMembers: DEFAULT_ENSEMBLE_MEMBERS,
      nRuns: DEFAULT_RUNS,
    };
  });

  readonly state = computed(() => ({
    currentTrajectory: this._currentPrediction(),
    isSimulating: this._isSimulating(),
    trustLevel: this._trustLevel(),
    activePolicyDeltas: this._activePolicyDeltas(),
    selectedAsset: this.selectedAsset(),
    selectedAssetId: this._selectedAssetId(),
    assets: this._assets(),
    deepSimJob: this._deepSimJob(),
    forecastSeries: this.forecastSeries(),
    ensembleMembers: this.ensembleMembers(),
    featureImportances: this.featureImportances(),
    assetImpacts: this.assetImpacts(),
  }));

  setTheater(theater: CounterfactualTheaterVector) {
    this._theater.set(theater);
  }

  setAssets(assets: CounterfactualAsset[]) {
    this._assets.set(assets);
    const current = this._selectedAssetId();
    if (!current || !assets.some(asset => asset.id === current)) {
      this._selectedAssetId.set(assets[0]?.id ?? null);
    }
  }

  selectAsset(assetId: string | null) {
    this._selectedAssetId.set(assetId);
  }

  updateDeltas(deltas: CounterfactualPolicyDeltas) {
    this._activePolicyDeltas.set({
      safety: deltas.safety ?? 0,
      sustainability: deltas.sustainability ?? 0,
      resilience: deltas.resilience ?? 0,
    });
  }

  setSimulating(isSimulating: boolean) {
    this._isSimulating.set(isSimulating);
  }

  applyPrediction(prediction: CounterfactualPrediction | null) {
    this._currentPrediction.set(prediction);
    this._trustLevel.set(prediction?.trust_score ?? 1.0);
    if (prediction?.selected_asset_id) {
      this._selectedAssetId.set(prediction.selected_asset_id);
    }
  }

  setDeepSimJob(job: DeepSimJobMetadata | null) {
    this._deepSimJob.set(job);
  }

  setForecastMetric(metricName: string) {
    const prediction = this._currentPrediction();
    if (!prediction) return;
    const metric = prediction.metric_trajectories.find(entry => entry.name === metricName);
    if (!metric) return;
    this._currentPrediction.set({
      ...prediction,
      p10: metric.p10,
      p50: metric.p50,
      p90: metric.p90,
    });
  }
}
