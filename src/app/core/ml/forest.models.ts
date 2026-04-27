export interface ForestNode {
  id: number;
  isLeaf: boolean;
  feature: string | null;
  featureIndex: number;
  threshold: number | null;
  value: number;
  nSamples: number;
  left: number | null;
  right: number | null;
  depth: number;
}

export interface DecisionTree {
  treeIndex: number;
  nodeCount: number;
  maxDepth: number;
  nLeaves: number;
  nodes: ForestNode[];
}

export interface ForestModel {
  color: string;
  nEstimators: number;
  trees: DecisionTree[];
}

export interface ForestStructure {
  robustness: ForestModel;
  failure: ForestModel;
  intent: ForestModel;
}

export interface TrainingSample {
  x: number;
  y: number;
  z: number;
  robustness: number;
  scenario: 'boreal_strike' | 'ghost_feint';
  features: Record<string, number>;
}

export interface TrainingSamplesPayload {
  samples: TrainingSample[];
  featureNames: string[];
}

export interface DecisionPathNode {
  nodeId: number;
  feature: string | null;
  threshold: number | null;
  value: number;
  isLeaf: boolean;
}