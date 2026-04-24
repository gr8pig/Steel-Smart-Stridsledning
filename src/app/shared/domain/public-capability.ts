export type CapabilityLayerMode =
  | 'SYNTHETIC'
  | 'SWEDEN_SAAB_PUBLIC'
  | 'NATO_PUBLIC'
  | 'RUSSIA_ARCHETYPE'
  | 'CHINA_ARCHETYPE'
  | 'HYBRID_ARCHETYPE';

export interface PublicCapabilityCard {
  id: string;
  displayName: string;
  side: 'BLUE' | 'RED' | 'NEUTRAL';
  layer: CapabilityLayerMode;
  category: 'C2' | 'SENSOR' | 'EFFECTOR' | 'AIRCRAFT' | 'GBAD' | 'LOGISTICS' | 'THREAT_ARCHETYPE';
  mappedTwin: 'ThreatTwin' | 'BaseTwin' | 'PolicyTwin' | 'COATwin' | 'LogisticsSnapshot' | 'KgsaNode';
  bdtAbstraction: string;
  publicSourceName: string;
  publicSourceUrl: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  caveat: string;
  operatorSummary: string;
  technicalSpecs?: {
    range?: string;
    endurance?: string;
    altitude?: string;
    radarType?: string;
  };
  tags: string[];
}
