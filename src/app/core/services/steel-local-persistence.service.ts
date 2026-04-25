import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DecisionFabricSnapshot } from '../../shared/domain/decision-fabric';
import {
  OperationalDirective,
  ReadinessSnapshot,
  TacticalSnapshot,
} from '../../shared/domain/models';

type StorageValue = TacticalSnapshot | ReadinessSnapshot | DecisionFabricSnapshot | OperationalDirective[];

@Injectable({ providedIn: 'root' })
export class SteelLocalPersistenceService {
  private platformId = inject(PLATFORM_ID);

  private readonly keys = {
    tactical: 'steel.tactical.snapshot',
    readiness: 'steel.readiness.snapshot',
    decisionFabric: 'steel.decision-fabric.snapshot',
    directives: 'steel.operational-directives',
  } as const;

  loadTacticalSnapshot(): TacticalSnapshot | null {
    return this._read<TacticalSnapshot>(this.keys.tactical);
  }

  saveTacticalSnapshot(snapshot: TacticalSnapshot): void {
    this._write(this.keys.tactical, snapshot);
  }

  loadReadinessSnapshot(): ReadinessSnapshot | null {
    return this._read<ReadinessSnapshot>(this.keys.readiness);
  }

  saveReadinessSnapshot(snapshot: ReadinessSnapshot): void {
    this._write(this.keys.readiness, snapshot);
  }

  loadDecisionFabricSnapshot(): DecisionFabricSnapshot | null {
    return this._read<DecisionFabricSnapshot>(this.keys.decisionFabric);
  }

  saveDecisionFabricSnapshot(snapshot: DecisionFabricSnapshot): void {
    this._write(this.keys.decisionFabric, snapshot);
  }

  loadOperationalDirectives(): OperationalDirective[] {
    return this._read<OperationalDirective[]>(this.keys.directives) ?? [];
  }

  saveOperationalDirectives(directives: OperationalDirective[]): void {
    this._write(this.keys.directives, directives);
  }

  private _read<T extends StorageValue>(key: string): T | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  private _write(key: string, value: StorageValue): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota / serialization errors and continue with in-memory state.
    }
  }
}
