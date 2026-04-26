export interface NarrativeCard {
  id: string;
  tag: string;
  title: string;
  body: string;
}

export interface OntologyDomainCard {
  id: string;
  title: string;
  summary: string;
  datapoints: string;
  why: string;
}

export interface UnificationEffect {
  id: string;
  title: string;
  body: string;
}

export interface SlidePreviewCopy {
  lead: string;
  detail: string;
  bullets: string[];
}

export interface SystemComparisonRow {
  label: string;
  legacyText: string;
  benefit: string;
  bdtText: string;
}

export interface ValidationBranch {
  label: string;
  probability: number;
  score: number;
  outcome: string;
  counterfactual: string;
}

export interface ValidationTree {
  id: string;
  title: string;
  premise: string;
  modelHint: string;
  collapseHint: string;
  branches: ValidationBranch[];
}

export const CONSOLE_SEQUENCES: string[][] = [
  // Slide 0 – Hook
  [
    "> Hackathon brief: bygg ett ledningssystem för framtidens luftförsvar",
    "> Användare: luftbevakare / flygstridsledare / command authority",
    "> Kärnfråga: hur möter vi hotet nu utan att tömma nästa våg?",
    "> Steel svarar med policy, validation och ontology",
    "> Presentationen visar den mest intressanta delen av helheten",
  ],
  // Slide 1 – Operator flow
  [
    "> Ingest: radar, track, intent och logistik läses in i samma theater state",
    "> Fusion: RAP byggs och spår prioriteras efter hot, fart och riktning",
    "> Attack: flera inkommande objekt måste mötas i rätt ordning",
    "> Intercept: systemet räknar när vi ska slå till och när vi ska hålla igen",
    "> Supply lines: beslutet måste tas tidigt innan korridoren bryts",
    "> Output: operatören ser vad som händer nu och vad som måste sparas till sen",
  ],
  // Slide 2 – Policy-driven COA
  [
    "> POST /api/coa/solve  [200 OK | 108ms]",
    "> Input: commander posture, reserve floor och hotbild",
    "> COA-MAX väljer snabbast effekt nu men äter av djupet",
    "> COA-BAL balanserar effekt nu mot beredskap för nästa våg",
    "> COA-DST maximerar uthållighet och prioriterar reserve first",
    "> Output: ett val som är lätt att motivera och lätt att följa upp",
  ],
  // Slide 3 – Robustness validation
  [
    "> Decision tree: varje nod frågar vad som händer om antagandet ändras",
    "> ML inferens: varje gren får en sannolikhet och ett förväntat utfall",
    "> Monte Carlo: tusentals körningar stressar risk, friktion och osäkerhet",
    "> Counterfactual handoff: samma beslut testas med andra initialvillkor",
    "> Collapse horizon: när grenen blir för skör får den inte låsas",
  ],
  // Slide 4 – Ontology and unification
  [
    "> Single source of truth för theater state",
    "> Policy, readiness, logistics och labs läser samma modell",
    "> FastAPI är backend-autoritet för state och beslut",
    "> Shared domain models håller betydelsen stabil mellan ytor",
    "> Truth-first betyder att samma data används, inte kopieras",
  ],
  // Slide 5 – Ontology summary
  [
    "> Ontologi laddad: 5 domäner",
    "> Beslutsstöd, lägesbild, logistik, operatörsytor och infrastruktur",
    "> Varje domän beskriver samma verklighet men med eget ansvar",
    "> Utan ontologi får samma ord olika betydelse i olika ytor",
    "> Med ontologi kan staten delas utan att logiken går sönder",
  ],
  // Slide 6 – Unification effects
  [
    "> Governance, logistics och field console delar samma state",
    "> C2 resilience och threat inspector läser samma semantik",
    "> Demo director och scenario injection följer samma kontrakt",
    "> Knowledge graph binder ihop policy, readiness och operations",
    "> Sovereign deployment kan ske utan att byta betydelse",
  ],
  // Slide 7 – Closing
  [
    "> Svar på frågan: bygg ett prototypiskt ledningssystem för luftförsvar",
    "> Visa användarmål, påverkan och de oundvikliga aktiviteterna",
    "> Visa varför policy, validation och ontology måste hänga ihop",
    "> Visa den mest intressanta delen av en komplett lösning",
  ],
];

export const OPERATOR_STEPS: NarrativeCard[] = [
  {
    id: "step-1",
    tag: "01",
    title: "Samla sensordata",
    body: "Bygg RAP från flera källor i realtid, inte från en isolerad vy.",
  },
  {
    id: "step-2",
    tag: "02",
    title: "Fusionera lägesbilden",
    body: "Intent, spår och friktion måste sammanfalla innan beslutet får en riktning.",
  },
  {
    id: "step-3",
    tag: "03",
    title: "Välj bas och effektor",
    body: "Beredskap, räckvidd och eldkraft måste vägas mot varandra för nästa våg.",
  },
  {
    id: "step-4",
    tag: "04",
    title: "Skydda uthålligheten",
    body: "Reserven får inte tömmas nu om systemet ska klara uppföljande anfall.",
  },
];

export const VALIDATION_STEPS: NarrativeCard[] = [
  {
    id: "val-1",
    tag: "DT",
    title: "Decision tree",
    body: "Vi bryter ner frågan i grenar så att varje antagande blir explicit och kan följas.",
  },
  {
    id: "val-2",
    tag: "ML",
    title: "ML inference",
    body: "Varje gren får en uppskattad sannolikhet och ett förväntat utfall från modellen.",
  },
  {
    id: "val-3",
    tag: "MC",
    title: "Monte Carlo",
    body: "Tusentals körningar stressar osäkerhet, saturation och command friction.",
  },
  {
    id: "val-4",
    tag: "CF",
    title: "Counterfactual lab",
    body: "Samma beslut testas med andra ingångsvärden för att se vad som faktiskt ändras.",
  },
  {
    id: "val-5",
    tag: "CH",
    title: "Collapse horizon",
    body: "Vi visar när en gren blir för skör för att låsas som operativ rekommendation.",
  },
];

export const VALIDATION_TREES: ValidationTree[] = [
  {
    id: "tree-1",
    title: "Adversarial Variation (Deceptive Red)",
    premise: "Fler skenmål, splittring, lure-behavior och feints.",
    modelHint:
      'Decision tree filtrerar "probe" och "feint" baserat på kinetisk räckvidd.',
    collapseHint:
      "Om hotet är ett decoy-kluster, ska grenen falla tillbaka till hold för att spara high-value interceptors.",
    branches: [
      {
        label: "Commit intercept",
        probability: 0.12,
        score: 0.21,
        outcome: "Waste reserve",
        counterfactual: "Raise decoy probability and the tree flips to hold.",
      },
      {
        label: "Hold / reconfirm",
        probability: 0.88,
        score: 0.91,
        outcome: "Preserve readiness",
        counterfactual:
          "Lower false positive cost and the hold branch remains dominant.",
      },
    ],
  },
  {
    id: "tree-2",
    title: "Saturation Red",
    premise: "Maximalt antal lågvärdeshot för att dra ut interceptorlager.",
    modelHint:
      'Straffterm för "expensive intercept on low-value target" (Strategic Asymmetry Penalty).',
    collapseHint:
      "COA-MAX blir skör och faller snabbt under R_min (Readiness floor).",
    branches: [
      {
        label: "COA-MAX",
        probability: 0.15,
        score: 0.43,
        outcome: "Depleted for Wave 2",
        counterfactual:
          "Increase reserve floor and MAX loses dominance immediately.",
      },
      {
        label: "COA-BAL",
        probability: 0.52,
        score: 0.84,
        outcome: "Balanced survival",
        counterfactual:
          "Slightly worse posture still keeps BAL as the safest middle.",
      },
      {
        label: "COA-DST",
        probability: 0.33,
        score: 0.88,
        outcome: "Deep reserve protected",
        counterfactual:
          "If the mission becomes time-critical, DST loses to BAL.",
      },
    ],
  },
  {
    id: "tree-3",
    title: "Kinetic Priority Red",
    premise:
      "Färre men högvärdiga hot mot kritiska objekt (Highridge Command, Northern Vanguard).",
    modelHint:
      "Objective function f_safety(x) maximerar skydd av kritiska objekt.",
    collapseHint:
      "Om infrastrukturförlusten överskrider L_max, är policy inte längre livskraftig.",
    branches: [
      {
        label: "Protect Highridge",
        probability: 0.81,
        score: 0.95,
        outcome: "Command survives",
        counterfactual:
          "Remove escort and the branch collapses into supply failure.",
      },
      {
        label: "Intercept forward",
        probability: 0.15,
        score: 0.66,
        outcome: "Forward base depleted",
        counterfactual:
          "Worsen corridor pressure and the forward branch degrades quickly.",
      },
      {
            label: "Delay commitment",
            probability: 0.04,
            score: 0.12,
            outcome: "Asset destroyed",
            counterfactual: "Under higher threat this branch becomes non-viable instantly.",
          },
        ],
      },
      ];

      export interface ShowcaseSlide {
      eyebrow: string;
      title: string;
      subtitle: string;
      content?: string[];
      }

