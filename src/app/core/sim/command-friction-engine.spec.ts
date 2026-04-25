import { describe, it, expect } from 'vitest';
import { CommandFrictionEngine } from './command-friction-engine';

describe('CommandFrictionEngine', () => {
  describe('calculateResilience', () => {
    it('should return 1 when all metrics are 1', () => {
      const metrics = { trust: 1, tempo: 1, cognitive: 1, audit: 1 };
      const score = CommandFrictionEngine.calculateResilience(metrics);
      expect(score).toBeCloseTo(1, 2);
    });

    it('should use a weighted sum model (25/25/30/20)', () => {
      const metrics = { trust: 0.1, tempo: 1, cognitive: 1, audit: 1 };
      const score = CommandFrictionEngine.calculateResilience(metrics);
      // (0.1 * 0.25) + (1 * 0.25) + (1 * 0.30) + (1 * 0.20) = 0.025 + 0.25 + 0.30 + 0.20 = 0.775
      expect(score).toBeCloseTo(0.775, 3);
    });

    it('should return 0.75 if trust is 0 and others are 1', () => {
      const metrics = { trust: 0, tempo: 1, cognitive: 1, audit: 1 };
      const score = CommandFrictionEngine.calculateResilience(metrics);
      // (0 * 0.25) + (1 * 0.25) + (1 * 0.30) + (1 * 0.20) = 0.75
      expect(score).toBe(0.75);
    });
  });

  describe('projectCollapse', () => {
    it('should return null if resilience is improving (current >= prev)', () => {
      const current = 0.8;
      const prev = 0.7;
      const dt = 10;
      const projection = CommandFrictionEngine.projectCollapse(current, prev, dt, 0.1);
      expect(projection).toBeNull();
    });

    it('should return null if dt is 0', () => {
      const current = 0.6;
      const prev = 0.7;
      const dt = 0;
      const projection = CommandFrictionEngine.projectCollapse(current, prev, dt, 0.1);
      expect(projection).toBeNull();
    });

    it('should project time to zero and accelerate by failure probability', () => {
      const current = 0.6;
      const prev = 0.7;
      const dt = 10;
      const pFail = 0.5;
      // velocity = (0.7 - 0.6) / 10 = 0.01 units/sec
      // timeToZero = 0.6 / 0.01 = 60
      // adjusted = 60 * (1 - (0.5 * 0.5)) = 60 * 0.75 = 45
      const projection = CommandFrictionEngine.projectCollapse(current, prev, dt, pFail);
      expect(projection).toBeCloseTo(45, 1);
    });
  });
});
