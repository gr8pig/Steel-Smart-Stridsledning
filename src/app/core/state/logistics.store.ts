import { Injectable, signal, computed, inject } from '@angular/core';
import { AuditLogger } from '../services/audit-logger';
import { BdtApiService } from '../services/bdt-api.service';
import {
  SupplyNode, SupplyCorridor, ReinforcementGroup,
  SEED_SUPPLY_NODES, SEED_CORRIDORS, SEED_REINFORCEMENTS,
} from '../../shared/domain/logistics-ontology';

@Injectable({ providedIn: 'root' })
export class LogisticsStore {
  private audit = inject(AuditLogger);
  private api   = inject(BdtApiService);

  private _supplyNodes     = signal<SupplyNode[]>(SEED_SUPPLY_NODES.map(n => ({ ...n })));
  private _corridors       = signal<SupplyCorridor[]>(SEED_CORRIDORS.map(c => ({ ...c })));
  private _reinforcements  = signal<ReinforcementGroup[]>(SEED_REINFORCEMENTS.map(r => ({ ...r })));
  private _lastRefreshed   = signal<string | null>(null);
  private _loading         = signal(false);

  supplyNodes    = this._supplyNodes.asReadonly();
  corridors      = this._corridors.asReadonly();
  reinforcements = this._reinforcements.asReadonly();
  loading        = this._loading.asReadonly();
  lastRefreshed  = this._lastRefreshed.asReadonly();

  activeNodes = computed(() =>
    this._supplyNodes().filter(n => n.status !== 'OFFLINE')
  );

  openCorridors = computed(() =>
    this._corridors().filter(c => c.status === 'OPEN')
  );

  enRouteReinforcements = computed(() =>
    this._reinforcements().filter(r => r.status === 'EN_ROUTE')
  );

  // Aggregate theater supply health: mean of fuel + ammo levels across active nodes
  supplyHealth = computed(() => {
    const nodes = this.activeNodes();
    if (!nodes.length) return 0;
    const total = nodes.reduce((acc, n) => acc + (n.fuelLevel + n.ammoLevel) / 2, 0);
    return total / nodes.length;
  });

  // Nodes keyed by baseId for ReadinessConsole enrichment
  supplyByBase = computed(() => {
    const map = new Map<string, SupplyNode[]>();
    for (const node of this._supplyNodes()) {
      const list = map.get(node.baseId) ?? [];
      list.push(node);
      map.set(node.baseId, list);
    }
    return map;
  });

  refresh() {
    this._loading.set(true);
    this.api.getLogistics().subscribe({
      next: snapshot => {
        this._supplyNodes.set(snapshot.supplyNodes);
        this._corridors.set(snapshot.corridors);
        this._reinforcements.set(snapshot.reinforcements);
        this._lastRefreshed.set(snapshot.generatedAt);
        this._loading.set(false);
      },
      error: () => {
        // Backend unavailable — seed data remains, degrade silently
        this._loading.set(false);
      },
    });
  }

  updateCorridorStatus(corridorId: string, status: SupplyCorridor['status']) {
    const prev = this._corridors().find(c => c.id === corridorId);
    if (!prev || prev.status === status) return;

    this._corridors.update(list =>
      list.map(c => c.id === corridorId ? { ...c, status } : c)
    );
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Corridor Status Update',
      rationale: `${prev.name} status changed from ${prev.status} to ${status}. Logistics routing adjusted.`,
      category: 'READINESS',
    });
  }

  updateNodeStatus(nodeId: string, status: SupplyNode['status']) {
    const prev = this._supplyNodes().find(n => n.id === nodeId);
    if (!prev || prev.status === status) return;

    this._supplyNodes.update(list =>
      list.map(n => n.id === nodeId ? { ...n, status } : n)
    );
    this.audit.log({
      actor: 'OPERATOR',
      action: 'Supply Node Status Update',
      rationale: `${prev.name} declared ${status}. Downstream base resupply capacity affected.`,
      category: 'READINESS',
    });
  }
}
