# Command Resilience Twin Domain Models Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the core domain models for the command resilience twin in Steel.

**Architecture:** Define TypeScript interfaces and types for the decision fabric health.

**Tech Stack:** TypeScript

---

### Task 1: Create Decision Fabric Domain Model

**Files:**
- Create: `src/app/shared/domain/decision-fabric.ts`

- [ ] **Step 1: Create the file with the specified content**

```ts
export type FabricStatus = 'HEALTHY' | 'STRESSED' | 'DEGRADED' | 'CRITICAL';

export interface DecisionFabricTwin {
  overallResilience: number; // 0-100
  status: FabricStatus;
  cognitiveDebt: number;
  authorityFriction: number;
  decisionEntropy: number;
  simulatedLatencyMs: number;
  lastUpdated: string;
}

export interface FrictionPulse {
  type: 'COGNITIVE' | 'AUTHORITY' | 'ENTROPY' | 'AUDIT';
  magnitude: number;
  rationale: string;
}
```

- [ ] **Step 2: Verify the file exists and has correct content**

Run: `cat src/app/shared/domain/decision-fabric.ts`
Expected: Output matches the code above.

- [ ] **Step 3: Commit the changes**

Run: `git add src/app/shared/domain/decision-fabric.ts && git commit -m "feat(domain): add decision fabric models"`
Expected: Successful commit.
