"""Evaluation Step 5"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/experiments/{experiment_id}/evaluate", tags=["evaluation"])


class EvaluationResult(BaseModel):
    """Performance metrics for the experiment's trained model."""


@router.get("", response_model=EvaluationResult)
async def evaluate_experiment(experiment_id: str) -> EvaluationResult:
    """Run/fetch evaluation metrics for the experiment's trained model."""
    raise NotImplementedError
