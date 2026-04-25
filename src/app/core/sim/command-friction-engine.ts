export class CommandFrictionEngine {
  static calculateResilience(metrics: { trust: number, tempo: number, cognitive: number, audit: number }): number {
    const weights = { trust: 0.25, tempo: 0.25, cognitive: 0.30, audit: 0.20 };
    // Prevent division by zero with Math.max(0.01, val)
    const weightedInverseSum = 
      (weights.trust / Math.max(0.01, metrics.trust)) +
      (weights.tempo / Math.max(0.01, metrics.tempo)) +
      (weights.cognitive / Math.max(0.01, metrics.cognitive)) +
      (weights.audit / Math.max(0.01, metrics.audit));
    
    return Math.max(0, Math.min(1, 1 / weightedInverseSum));
  }
  
  static projectCollapse(currentScore: number, prevScore: number, dtSeconds: number, failureProbability: number): number | null {
    const velocity = (currentScore - prevScore) / (dtSeconds || 1);
    if (velocity >= 0) return null;
    
    // Collapse threshold is 0.2
    const distanceToCollapse = currentScore - 0.2;
    if (distanceToCollapse <= 0) return 0;
    
    // ML Surrogate's failureProbability acts as a complexity multiplier (1 + pFail)
    const projectedTime = distanceToCollapse / (Math.abs(velocity) * (1 + failureProbability));
    return Math.max(0, projectedTime);
  }
}
