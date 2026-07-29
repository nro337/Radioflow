"""Prediction Step 6"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/experiments/{experiment_id}/predict", tags=["prediction"])


class PredictionRequest(BaseModel):
    """Request body identifying the image/mask (or features) to predict on."""


class PredictionResult(BaseModel):
    """Prediction result from the experiment's trained model."""


@router.post("", response_model=PredictionResult)
async def predict(experiment_id: str, payload: PredictionRequest) -> PredictionResult:
    """Run inference using the experiment's trained model."""
    raise NotImplementedError
