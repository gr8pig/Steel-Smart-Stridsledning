import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SteelApiService } from '../services/steel-api.service';
import { DrawingBoardStore } from './drawing-board.store';

describe('DrawingBoardStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DrawingBoardStore,
        {
          provide: SteelApiService,
          useValue: {
            getScenarios: () => of([]),
          },
        },
      ],
    });
  });

  it('maps catalog platform data onto drawing units', () => {
    const store = TestBed.inject(DrawingBoardStore);

    const id = store.addCatalogUnit({
      _id: 'Su_35S_Flanker_E',
      _force: 'red_force_russia',
      _category: 'aircraft',
      _platform_id: 'SU_35',
      _origin_country: 'RUSSIA',
      _platform_profile: {
        id: 'SU_35',
        display_name: 'Su-35S Flanker-E',
        nation: 'RUSSIA',
        type: 'AIRCRAFT',
        threat_class: 'AIRCRAFT',
        origin_country: 'RUSSIA',
        armaments: ['SHORT_RANGE_AAM', 'LONG_RANGE_AAM', 'CRUISE_MISSILE'],
        armament: 'KINETIC_STRIKE',
        max_speed_kmh: 2500,
        combat_radius_km: 1600,
        service_ceiling_m: 18000,
        radar_range_km: 200,
      },
      source_ids: ['RUS_SOME_SOURCE'],
    }, 'RED');

    const unit = store.units().find((entry) => entry.id === id);

    expect(unit).toBeTruthy();
    expect(unit?.platform).toBe('SU_35');
    expect(unit?.originCountry).toBe('RUSSIA');
    expect(unit?.armamentLoadout).toBe('KINETIC_STRIKE');
    expect(unit?.platformSpeedKmh).toBe(2500);
    expect(unit?.radarRangeKm).toBe(200);
    expect(unit?.catalogSourceId).toBe('Su_35S_Flanker_E');
    expect(store.selectedUnitId()).toBe(id);
  });
});
