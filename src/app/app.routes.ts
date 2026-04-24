import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'overview',
    loadComponent: () => import('./features/mission-overview').then(m => m.MissionOverview)
  },
  {
    path: 'tactical',
    loadComponent: () => import('./features/tactical-console').then(m => m.TacticalConsole)
  },
  {
    path: 'commander',
    loadComponent: () => import('./features/commander-orchestrator').then(m => m.CommanderOrchestrator)
  },
  {
    path: 'readiness',
    loadComponent: () => import('./features/readiness-console').then(m => m.ReadinessConsole)
  },
  {
    path: 'threat-inspector',
    loadComponent: () => import('./features/threat-inspector').then(m => m.ThreatInspector)
  },
  {
    path: 'robustness-lab',
    loadComponent: () => import('./features/robustness-lab').then(m => m.RobustnessLab)
  },
  {
    path: 'governance',
    loadComponent: () => import('./features/governance').then(m => m.Governance)
  },
  {
    path: 'authority',
    loadComponent: () => import('./features/authority-dashboard').then(m => m.AuthorityDashboard)
  },
  {
    path: 'logistics',
    loadComponent: () => import('./features/logistics-console').then(m => m.LogisticsConsole)
  },
  {
    path: 'knowledge-graph',
    loadComponent: () => import('./features/knowledge-graph').then(m => m.KnowledgeGraph)
  },
  {
    path: 'demo',
    loadComponent: () => import('./features/demo-director').then(m => m.DemoDirector)
  },
  {
    path: 'field',
    loadComponent: () => import('./features/field-console').then(m => m.FieldConsole)
  },
  {
    path: '**',
    redirectTo: 'overview'
  }
];
