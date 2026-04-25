from __future__ import annotations
from typing import List, Optional
from ..models import BDTModel


class PolicyDeltas(BDTModel):
    """
    Represent perturbations to the active policy weights.
    Used for counterfactual 'what-if' analysis in the ML pipeline.
    """
    safety: float = 0.0
    sustainability: float = 0.0
    resilience: float = 0.0
