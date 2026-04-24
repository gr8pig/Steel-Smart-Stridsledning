export type SupplyNodeStatus = 'ACTIVE' | 'DEGRADED' | 'DISRUPTED' | 'OFFLINE';
export type CorridorStatus = 'OPEN' | 'CONTESTED' | 'BLOCKED';
export type ReinforcementStatus = 'STAGED' | 'EN_ROUTE' | 'ARRIVED' | 'COMMITTED';

export interface SupplyNode {
  id: string;
  name: string;
  baseId: string;            // links to BaseTwin.id
  type: 'FUEL' | 'AMMO' | 'MAINTENANCE' | 'COMBINED';
  status: SupplyNodeStatus;
  fuelLevel: number;         // 0-1 fraction of capacity
  ammoLevel: number;         // 0-1 fraction of capacity
  throughput: number;        // resupply rate: 0-1 per hour
  x: number;                 // SVG map coordinate (1670×1300 canvas)
  y: number;
  priority: 'CRITICAL' | 'HIGH' | 'STANDARD';
}

export interface SupplyCorridor {
  id: string;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  status: CorridorStatus;
  estimatedHours: number;    // one-way transit time
  threatExposure: number;    // 0-1
  waypoints: { x: number; y: number }[];
}

export interface ReinforcementGroup {
  id: string;
  name: string;
  destinationBaseId: string;
  status: ReinforcementStatus;
  type: 'INTERCEPTORS' | 'FUEL' | 'CREWS' | 'EQUIPMENT';
  quantity: number;
  eta: string;               // human-readable: "4h", "Arrived", etc.
  x: number;                 // current position on SVG canvas
  y: number;
}

export interface LogisticsSnapshot {
  supplyNodes: SupplyNode[];
  corridors: SupplyCorridor[];
  reinforcements: ReinforcementGroup[];
  generatedAt: string;
}

// ── Seed data aligned with server.ts BASE-1…5 and engagement-map.data.ts ─────

export const SEED_SUPPLY_NODES: SupplyNode[] = [
  {
    id: 'SN-1', name: 'Vanguard Fuel Depot', baseId: 'BASE-1', type: 'FUEL',
    status: 'ACTIVE', fuelLevel: 0.76, ammoLevel: 0.30, throughput: 0.12,
    x: 295, y: 265, priority: 'HIGH',
  },
  {
    id: 'SN-2', name: 'Highridge Combined Depot', baseId: 'BASE-5', type: 'COMBINED',
    status: 'ACTIVE', fuelLevel: 0.91, ammoLevel: 0.88, throughput: 0.20,
    x: 790, y: 118, priority: 'CRITICAL',
  },
  {
    id: 'SN-3', name: 'Boreal Ammo Cache', baseId: 'BASE-2', type: 'AMMO',
    status: 'DEGRADED', fuelLevel: 0.45, ammoLevel: 0.62, throughput: 0.08,
    x: 1080, y: 295, priority: 'HIGH',
  },
  {
    id: 'SN-4', name: 'Strait Hub Maintenance', baseId: 'BASE-4', type: 'MAINTENANCE',
    status: 'ACTIVE', fuelLevel: 0.60, ammoLevel: 0.55, throughput: 0.10,
    x: 660, y: 530, priority: 'STANDARD',
  },
  {
    id: 'SN-5', name: 'Eastern Forward Logistics', baseId: 'BASE-3', type: 'FUEL',
    status: 'ACTIVE', fuelLevel: 0.52, ammoLevel: 0.40, throughput: 0.06,
    x: 1370, y: 215, priority: 'STANDARD',
  },
];

export const SEED_CORRIDORS: SupplyCorridor[] = [
  {
    id: 'CRD-1', name: 'Northern Logistics Spine',
    fromNodeId: 'SN-1', toNodeId: 'SN-2',
    status: 'OPEN', estimatedHours: 3.5, threatExposure: 0.18,
    waypoints: [{ x: 295, y: 265 }, { x: 540, y: 195 }, { x: 790, y: 118 }],
  },
  {
    id: 'CRD-2', name: 'Highridge–Boreal Arc',
    fromNodeId: 'SN-2', toNodeId: 'SN-3',
    status: 'CONTESTED', estimatedHours: 5.0, threatExposure: 0.41,
    waypoints: [{ x: 790, y: 118 }, { x: 970, y: 145 }, { x: 1080, y: 295 }],
  },
  {
    id: 'CRD-3', name: 'Coastal Resupply Run',
    fromNodeId: 'SN-1', toNodeId: 'SN-4',
    status: 'OPEN', estimatedHours: 4.0, threatExposure: 0.25,
    waypoints: [{ x: 295, y: 265 }, { x: 450, y: 390 }, { x: 660, y: 530 }],
  },
  {
    id: 'CRD-4', name: 'Island Hop Route',
    fromNodeId: 'SN-4', toNodeId: 'SN-3',
    status: 'OPEN', estimatedHours: 2.5, threatExposure: 0.32,
    waypoints: [{ x: 660, y: 530 }, { x: 870, y: 450 }, { x: 1080, y: 295 }],
  },
  {
    id: 'CRD-5', name: 'Eastern Link',
    fromNodeId: 'SN-3', toNodeId: 'SN-5',
    status: 'OPEN', estimatedHours: 2.0, threatExposure: 0.20,
    waypoints: [{ x: 1080, y: 295 }, { x: 1230, y: 250 }, { x: 1370, y: 215 }],
  },
];

export const SEED_REINFORCEMENTS: ReinforcementGroup[] = [
  {
    id: 'RNF-1', name: 'Interceptor Resupply Alpha',
    destinationBaseId: 'BASE-2', status: 'EN_ROUTE',
    type: 'INTERCEPTORS', quantity: 8, eta: '2h',
    x: 1035, y: 200,
  },
  {
    id: 'RNF-2', name: 'Fuel Convoy Bravo',
    destinationBaseId: 'BASE-1', status: 'STAGED',
    type: 'FUEL', quantity: 15000, eta: '5h',
    x: 490, y: 390,
  },
  {
    id: 'RNF-3', name: 'Crew Rotation Delta',
    destinationBaseId: 'BASE-3', status: 'ARRIVED',
    type: 'CREWS', quantity: 12, eta: 'Arrived',
    x: 1370, y: 215,
  },
];
