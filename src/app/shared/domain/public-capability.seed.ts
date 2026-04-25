import { PublicCapabilityCard } from './public-capability';

export const PUBLIC_CAPABILITY_SEED: PublicCapabilityCard[] = [
  {
    id: 'saab-globaleye',
    displayName: 'Saab GlobalEye',
    side: 'BLUE',
    layer: 'SWEDEN_SAAB_PUBLIC',
    category: 'C2',
    mappedTwin: 'ThreatTwin',
    steelAbstraction: 'AEW&C',
    publicSourceName: 'Saab Official',
    publicSourceUrl: 'https://www.saab.com/products/globaleye',
    confidence: 'HIGH',
    caveat: 'Public specifications only.',
    operatorSummary: 'Multi-role airborne surveillance system with extended range and multi-domain performance.',
    technicalSpecs: {
      range: '>550km',
      endurance: '11h',
      radarType: 'Erieye ER (GaN AESA)'
    },
    tags: ['ISR', 'Multi-role', 'AEW&C']
  },
  {
    id: 'saab-giraffe-1x',
    displayName: 'Saab Giraffe 1X',
    side: 'BLUE',
    layer: 'SWEDEN_SAAB_PUBLIC',
    category: 'SENSOR',
    mappedTwin: 'ThreatTwin',
    steelAbstraction: 'GBAD SENSOR',
    publicSourceName: 'Saab Official',
    publicSourceUrl: 'https://www.saab.com/products/giraffe-1x',
    confidence: 'HIGH',
    caveat: 'Public specifications only.',
    operatorSummary: 'Compact, high-performance X-band 3D AESA radar for ground-based air defense and sea surveillance.',
    technicalSpecs: {
      range: '75km',
      radarType: 'X-band 3D AESA'
    },
    tags: ['Radar', 'GBAD', 'Compact']
  },
  {
    id: 'saab-9air-c2',
    displayName: 'Saab 9AIR C4I',
    side: 'BLUE',
    layer: 'SWEDEN_SAAB_PUBLIC',
    category: 'C2',
    mappedTwin: 'PolicyTwin',
    steelAbstraction: 'AIR C2',
    publicSourceName: 'Saab Official',
    publicSourceUrl: 'https://www.saab.com/products/9air-c4i',
    confidence: 'HIGH',
    caveat: 'System integration varies by customer.',
    operatorSummary: 'Modular, scalable air command and control system providing complete control over air and space domains.',
    tags: ['C4I', 'Air C2', 'Modular']
  },
  {
    id: 'saab-rbs70-ng',
    displayName: 'Saab RBS 70 NG',
    side: 'BLUE',
    layer: 'SWEDEN_SAAB_PUBLIC',
    category: 'EFFECTOR',
    mappedTwin: 'BaseTwin',
    steelAbstraction: 'VSHORAD',
    publicSourceName: 'Saab Official',
    publicSourceUrl: 'https://www.saab.com/products/rbs-70-ng',
    confidence: 'HIGH',
    caveat: 'Requires laser beam-riding guidance.',
    operatorSummary: 'Very short-range air defense system with un-jammable laser guidance.',
    technicalSpecs: {
      range: '>9km',
      radarType: 'Laser beam-riding'
    },
    tags: ['Missile', 'VSHORAD', 'Laser-guided']
  },
  {
    id: 'russia-s400-archetype',
    displayName: 'S-400 Triumph Archetype',
    side: 'RED',
    layer: 'RUSSIA_ARCHETYPE',
    category: 'GBAD',
    mappedTwin: 'ThreatTwin',
    steelAbstraction: 'LONG RANGE SAM',
    publicSourceName: 'OSINT Reference',
    publicSourceUrl: 'https://en.wikipedia.org/wiki/S-400_missile_system',
    confidence: 'MEDIUM',
    caveat: 'Intelligence-based archetype, specific capabilities may vary.',
    operatorSummary: 'Mobile surface-to-air missile system representing a significant threat to all aircraft classes.',
    technicalSpecs: {
      range: '400km',
      altitude: '30km',
      radarType: '92N6E "Grave Stone"'
    },
    tags: ['A2/AD', 'SAM', 'Long Range']
  },
  {
    id: 'nato-patriot-archetype',
    displayName: 'Patriot PAC-3 Archetype',
    side: 'BLUE',
    layer: 'NATO_PUBLIC',
    category: 'GBAD',
    mappedTwin: 'BaseTwin',
    steelAbstraction: 'LONG RANGE SAM',
    publicSourceName: 'NATO Public Docs',
    publicSourceUrl: 'https://www.nato.int/cps/en/natohq/topics_8206.htm',
    confidence: 'HIGH',
    caveat: 'NATO standard capability model.',
    operatorSummary: 'Advanced tactical air defense system designed to counter aircraft and tactical ballistic missiles.',
    technicalSpecs: {
      range: '160km',
      altitude: '24km',
      radarType: 'AN/MPQ-65 AESA'
    },
    tags: ['NATO', 'PAC-3', 'Air Defense']
  }
];
