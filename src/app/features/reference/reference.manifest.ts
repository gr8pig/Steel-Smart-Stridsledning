export interface ReferenceSurfaceManifest {
  id: string;
  label: string;
  summary: string;
  route: string;
  href: string;
  icon: string;
  accent: 'blue' | 'green' | 'amber';
  badge: string;
  detail: string;
}

export const REFERENCE_MANIFEST: ReferenceSurfaceManifest[] = [
  {
    id: 'reference-home',
    label: 'Reference Atlas',
    summary: 'Landing surface for reference-driven analysis, surface discovery, and lateral movement between the new lab views.',
    route: '',
    href: '/reference',
    icon: 'menu_book',
    accent: 'blue',
    badge: 'ENTRY',
    detail: 'Surface index, routing map, and launch pad.'
  },
  {
    id: 'c2-resilience-lab',
    label: 'C2 Resilience Lab',
    summary: 'Command-and-control hardening surface for redundant links, degraded mesh behavior, and comms continuity under pressure.',
    route: 'c2-resilience-lab',
    href: '/reference/c2-resilience-lab',
    icon: 'sensors',
    accent: 'green',
    badge: 'LAB',
    detail: 'Mesh survivability, failover, and spectrum posture.'
  },
  {
    id: 'counterfactual-lab',
    label: 'Counterfactual Lab',
    summary: 'Branch comparison surface for what-if analysis, alternate timelines, and decision delta inspection.',
    route: 'counterfactual-lab',
    href: '/reference/counterfactual-lab',
    icon: 'compare_arrows',
    accent: 'amber',
    badge: 'BRANCH',
    detail: 'Scenario split, alternate assumptions, outcome deltas.'
  }
];
