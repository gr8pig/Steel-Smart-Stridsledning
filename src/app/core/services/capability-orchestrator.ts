import { Injectable, signal } from '@angular/core';

export interface PlannedCapabilityInfo {
  id?: string;
  variant?: 'STATIC' | 'POLICY_PROPAGATION' | 'INTENT_COMMITMENT' | 'LAB_HANDOFF';
  name: string;
  operationalFunction: string;
  persona: string;
  decisionImproved: string;
  inputs?: string;
  outputs?: string;
  dependencies?: string[];
  affectedScreens?: string[];
  rationale: string;
  status: 'STUBBED_UI' | 'PARTIAL_FRONTEND' | 'MOCK_DATA' | 'AWAITING_BACKEND' | 'OPERATIONAL' | 'OPERATIONAL_MOCK';
  tier: 'MVP' | 'SECONDARY' | 'STRETCH';
  nextStep: string;
  acknowledgeLabel?: string;
}

@Injectable({ providedIn: 'root' })
export class CapabilityOrchestrator {
  private _activeFeature = signal<PlannedCapabilityInfo | null>(null);
  activeFeature = this._activeFeature.asReadonly();

  // Registry of planned features to keep components clean
  private readonly REGISTRY: Record<string, PlannedCapabilityInfo> = {
    'audit-log-export': {
        id: 'audit-log-export',
        name: 'Governance Audit Export',
        operationalFunction: 'Generates a signed, immutable PDF/JSON export of the session audit log, rationale traces, and policy snapshots for long-term legal and operational accountability.',
        persona: 'Governance & Compliance Officer',
        decisionImproved: 'Post-Mission Accountability',
        rationale: 'Operational decisions involving kinetic effectors require a non-repudiable audit trail for international compliance.',
        status: 'STUBBED_UI',
        tier: 'SECONDARY',
        nextStep: 'Integrate PDF generation library and digital signature service.'
    },
    'policy-propagation': {
        id: 'policy-propagation',
        variant: 'POLICY_PROPAGATION',
        name: 'Policy Propagation Engine',
        operationalFunction: 'Synchronizes the current commander posture across the theater so every downstream station sees the same weights, guardrails, and publication constraints.',
        persona: 'Air Defense Commander / Orchestrator',
        decisionImproved: 'Strategic Alignment & Resource Allocation',
        rationale: 'Decoupling policy from execution leads to orphan intercepts that waste strategic reserves. Propagation ensures vertical coherence.',
        status: 'OPERATIONAL',
        tier: 'MVP',
        nextStep: 'Broadcast the live commander posture to tactical stations and recalculate every engagement priority.',
        acknowledgeLabel: 'ACKNOWLEDGE SNAPSHOT'
    },
    'commander-intent-commitment': {
        id: 'commander-intent-commitment',
        variant: 'INTENT_COMMITMENT',
        name: 'Commander Intent Commitment',
        operationalFunction: 'Publishes the currently selected Course of Action as a live intent token that tactical stations can inherit without losing the commander context.',
        persona: 'Air Defense Commander',
        decisionImproved: 'Tactical Execution Under Uncertainty',
        rationale: 'Tactical operators need bound constraints, not just raw targets. Publishing intent provides the why behind the engagement limits.',
        status: 'OPERATIONAL',
        tier: 'MVP',
        nextStep: 'Tactical Console is now reactively aware of this published intent.',
        acknowledgeLabel: 'ACKNOWLEDGE INTENT'
    },
    'system-config': {
        id: 'system-config',
        name: 'Global Station Configuration',
        operationalFunction: 'Manages low-level station parameters: network sync intervals, interface density mode, biometric re-auth period, and sensor-node peering priority.',
        persona: 'Tactical Operator / Admin',
        decisionImproved: 'Operational Efficiency',
        rationale: 'Station performance must be tunable to local bandwidth and threat-density conditions.',
        status: 'STUBBED_UI',
        tier: 'SECONDARY',
        nextStep: 'Map station parameters to persistence layer.'
    },
    'replay-scrub': {
        id: 'replay-scrub',
        name: 'Temporal Scenario Scrubbing',
        operationalFunction: 'Enables precise timeline scrubbing and event-branch comparison. Analysts can rewind to a specific decision point and test "What if" logic against the Twin.',
        persona: 'Analysis Officer',
        decisionImproved: 'Counterfactual Analysis',
        rationale: 'Understanding failure requires the ability to move through time and isolate critical causality.',
        status: 'PARTIAL_FRONTEND',
        tier: 'MVP',
        nextStep: 'Wire timeline slider to ScenarioStore state-snapshot buffer.'
    },
    'policy-trace': {
        id: 'policy-trace',
        name: 'Policy Logic Trace (Attribution)',
        operationalFunction: 'Exposes the raw boolean and weight-based logic chains that led to a specific COA recommendation. Every shoot/hold decision can be traced to a specific policy line.',
        persona: 'Commander / Auditor',
        decisionImproved: 'System Transparency (No Black Box)',
        rationale: 'Trust in automation requires explicit attribution to commander-authorized policy logic.',
        status: 'STUBBED_UI',
        tier: 'MVP',
        nextStep: 'Implement logic-graph visualization for selected COA.'
    },
    'detailed-alerts': {
        id: 'detailed-alerts',
        name: 'Tactical Alert Manager',
        operationalFunction: 'Deep-dive into system health, sensor link failures, and policy guardrail violations. Aggregates "silent" operational friction points.',
        persona: 'Technical Operator',
        decisionImproved: 'Situational Awareness (Internal)',
        rationale: 'Minor sensor degradation often precedes tactical failure. Alert management turns noise into early warning.',
        status: 'MOCK_DATA',
        tier: 'MVP',
        nextStep: 'Connect to real-time system health stream.'
    },
    'intent-override-logic': {
        id: 'intent-override-logic',
        name: 'Track Intent Override Logic',
        operationalFunction: 'Allows human intelligence to manually pivot the classified intent of a track (e.g. from Decoy to Strike) when sensor confidence is low but situational context is high.',
        persona: 'Analysis Officer',
        decisionImproved: 'Attribution Fidelity',
        rationale: 'Sensors see geometry; humans see context. Intent overrides prevent the system from ignoring subtle deceptive threats.',
        status: 'STUBBED_UI',
        tier: 'MVP',
        nextStep: 'Wire override state to TacticalStore and trigger policy recalculation.'
    },
    'robustness-lab-handoff': {
        id: 'robustness-lab-handoff',
        variant: 'LAB_HANDOFF',
        name: 'Stochastic Handoff Pipeline',
        operationalFunction: 'Transfers a specific track’s uncertainty vector into the Robustness Lab for 10,000-run Monte Carlo simulation to verify if current policy is brittle to this track signature.',
        persona: 'Analysis Officer',
        decisionImproved: 'Policy Robustness Validation',
        rationale: 'Validating decisions against a single geometric point is insufficient. Handoff-to-Lab validates decisions against the entire possible state space.',
        status: 'PARTIAL_FRONTEND',
        tier: 'MVP',
        nextStep: 'Automate navigation to Lab screen after handoff commit.'
    },
    'base-reserve-enforcement': {
        id: 'base-reserve-enforcement',
        name: 'Strategic Reserve Locking',
        operationalFunction: 'Permanently removes a base or specific effector inventory from the automated COA pool, preserving it for unauthorized or catastrophic contingencies.',
        persona: 'Base Readiness Officer',
        decisionImproved: 'Future Wave Survivability',
        rationale: 'Automation will burn everything if not constrained. Locking reserves ensures we are never truly "empty" during a follow-on strike.',
        status: 'STUBBED_UI',
        tier: 'MVP',
        nextStep: 'Integrate into ReadinessStore state and policy solver constraints.'
    },
    'resource-rebalancing': {
        id: 'resource-rebalancing',
        name: 'Sub-Theater Resource Rebalancing',
        operationalFunction: 'Orchestrates the physical or logistical transfer of interceptor stocks and maintenance crews between bases to equalize fatigue and depth.',
        persona: 'Base Readiness Officer',
        decisionImproved: 'Operational Equilibrium',
        rationale: 'Some bases are "over-burned" while others sit idle. Rebalancing maximizes theater-wide endurance.',
        status: 'STUBBED_UI',
        tier: 'SECONDARY',
        nextStep: 'Implement logistical move-order workflow.'
    },
    'maintenance-deep-audit': {
        id: 'maintenance-deep-audit',
        name: 'Maintenance Drag Diagnostic',
        operationalFunction: 'Exposes the raw maintenance logs, component fatigue curves, and crew-rest violations that are currently degrading a base’s sortie capacity.',
        persona: 'Technical Officer',
        decisionImproved: 'Base Resilience Diagnostics',
        rationale: 'Readiness is not just a percentage; it is a complex result of logistics and human exhaustion. Deep audit makes the "why" visible.',
        status: 'STUBBED_UI',
        tier: 'STRETCH',
        nextStep: 'Pull historical maintenance records from theater logistics twin.'
    }
  };

  showFeature(info: PlannedCapabilityInfo | string) {
        if (typeof info === 'string') {
        const registered = this.REGISTRY[info];
        if (registered) {
            this._activeFeature.set(registered);
        } else {
            console.error(`Planned capability feature ID "${info}" not found in registry.`);
        }
    } else {
        this._activeFeature.set(info);
    }
  }

  close() {
    this._activeFeature.set(null);
  }
}
