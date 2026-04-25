import { describe, it, expect } from 'vitest';
import { CommandFrictionEngine } from './command-friction-engine';

describe('CommandFrictionEngine', () => {
  describe('calculateResilience', () => {
    it('should return 1 when all metrics are 1', () => {
      const metrics = { trust: 1, tempo: 1, cognitive: 1, audit: 1 };
      const score = CommandFrictionEngine.calculateResilience(metrics);
      expect(score).toBeCloseTo(1, 2);
    });

    it('should return a low score when one metric is very low (Harmonic Mean property)', () => {
      // Harmonic mean is sensitive to low values
      const metrics = { trust: 0.1, tempo: 1, cognitive: 1, audit: 1 };
      const score = CommandFrictionEngine.calculateResilience(metrics);
      // Weights: trust: 0.25, tempo: 0.25, cognitive: 0.30, audit: 0.20
      // 1 / (0.25/0.1 + 0.25/1 + 0.3/1 + 0.2/1) = 1 / (2.5 + 0.25 + 0.3 + 0.2) = 1 / 3.25 = 0.307
      expect(score).toBeLessThan(0.4);
      expect(score).toBeCloseTo(0.307, 2);
    });

    it('should handle zero values by capping at 0.01 to avoid division by zero', () => {
      const metrics = { trust: 0, tempo: 1, cognitive: 1, audit: 1 };
      const score = CommandFrictionEngine.calculateResilience(metrics);
      // 1 / (0.25/0.01 + 0.25/1 + 0.3/1 + 0.2/1) = 1 / (25 + 0.25 + 0.3 + 0.2) = 1 / 25.75 = 0.0388
      expect(score).toBeCloseTo(0.0388, 3);
    });
  });

  describe('projectCollapse', () => {
    it('should return null if velocity is positive (improving resilience)', () => {
      const current = 0.8;
      const prev = 0.7;
      const dt = 10;
      const projection = CommandFrictionEngine.projectCollapse(current, prev, dt, 0.1);
      expect(projection).toBeNull();
    });

    it('should return null if velocity is zero', () => {
      const current = 0.8;
      const prev = 0.8;
      const dt = 10;
      const projection = CommandFrictionEngine.projectCollapse(current, prev, dt, 0.1);
      expect(projection).toBeNull();
    });

    it('should project time to collapse correctly when velocity is negative', () => {
      const current = 0.6;
      const prev = 0.7;
      const dt = 10;
      const pFail = 0.5;
      // velocity = (0.6 - 0.7) / 10 = -0.01 units/sec
      // distance to collapse (0.2) = 0.6 - 0.2 = 0.4
      // multiplier = 1 + 0.5 = 1.5
      // adjusted velocity magnitude = 0.01 * 1.5 = 0.015
      // time = 0.4 / 0.015 = 26.666...
      const projection = CommandFrictionEngine.projectCollapse(current, prev, dt, pFail);
      expect(projection).toBeCloseTo(26.67, 1);
    });

    it('should return 0 if current score is already below threshold', () => {
      const current = 0.15;
      const prev = 0.25;
      const dt = 10;
      const projection = CommandFrictionEngine.projectCollapse(current, prev, dt, 0.1);
      expect(projection).toBe(0);
    });
  });
});
