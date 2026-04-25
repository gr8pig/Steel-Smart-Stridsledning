export class CommandFrictionEngine {
  static calculateResilience(inputs: {
    trust: number;     // 25%
    tempo: number;     // 25%
    cognitive: number; // 30%
    audit: number;     // 20%
  }): number {
    return (inputs.trust * 0.25) + 
           (inputs.tempo * 0.25) + 
           (inputs.cognitive * 0.30) + 
           (inputs.audit * 0.20);
  }

  static projectCollapse(current: number, prev: number, dt: number, pFail: number): number | null {
    if (current >= prev || dt <= 0) return null;
    const velocity = (prev - current) / dt;
    const timeToZero = current / velocity;
    // Heuristic: ML failure probability accelerates collapse
    return timeToZero * (1 - (pFail * 0.5));
  }
}
