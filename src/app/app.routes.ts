import {Routes} from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'overview',
    pathMatch: 'full'
  },
  {
    path: 'commander',
    loadComponent: () => import('./features/c2/c2-orchestrator.component').then(m => m.CommanderOrchestrator)
  },
  {
    path: 'readiness',
    loadComponent: () => import('./features/readiness-console').then(m => m.ReadinessConsole)
  },
  {
    path: 'robustness-lab',
    loadComponent: () => import('./features/robustness-lab').then(m => m.RobustnessLab)
  },
  {
    path: 'counterfactual-lab',
    loadComponent: () => import('./features/counterfactual-lab').then(m => m.CounterfactualLab)
  },
  {
    path: 'governance',
    loadComponent: () => import('./features/governance').then(m => m.Governance)
  },
  {
    path: 'authority',
    loadComponent: () => import('./features/c2/authority-dashboard.component').then(m => m.AuthorityDashboard)
  },
  {
    path: 'reference',
    loadChildren: () => import('./features/reference/reference.routes').then(m => m.referenceRoutes)
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
    path: 'c2-resilience',
    loadComponent: () => import('./features/c2-resilience-lab').then(m => m.C2ResilienceLabComponent)
  },
  {
    path: 'drawing-board',
    loadComponent: () => import('./features/drawing-board').then(m => m.DrawingBoard)
  },
  {
    path: 'showcase',
    loadComponent: () => import('./features/showcase/showcase-root.component').then(m => m.ShowcaseRootComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/showcase/components/showcase.component').then(m => m.ShowcaseComponent)
      }
    ]
  },
  {
    path: '',
    loadComponent: () => import('./features/ops/ops-root.component').then(m => m.OpsRootComponent),
    children: [
      {
        path: 'overview',
        loadComponent: () => import('./features/ops/mission-overview.component').then(m => m.MissionOverview)
      },
      {
        path: 'tactical',
        loadComponent: () => import('./features/ops/tactical-console.component').then(m => m.TacticalConsole)
      },
      {
        path: 'threat-inspector',
        loadComponent: () => import('./features/ops/threat-inspector.component').then(m => m.ThreatInspector)
      },
      {
        path: 'logistics',
        loadComponent: () => import('./features/ops/logistics-console.component').then(m => m.LogisticsConsole)
      },
      {
        path: 'field',
        loadComponent: () => import('./features/ops/field-console.component').then(m => m.FieldConsole)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'overview'
  }
];
