"""Preprocessing Step 2"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(
    prefix="/experiments/{experiment_id}/preprocessing", tags=["preprocessing"]
)


class PreprocessingConfig(BaseModel):
    """Request body for running preprocessing (normalization, feature selection, splits)."""


class PreprocessingResult(BaseModel):
    """Preprocessing summary/result."""


@router.post("", response_model=PreprocessingResult)
async def run_preprocessing(
    experiment_id: str, payload: PreprocessingConfig
) -> PreprocessingResult:
    """Run preprocessing on the experiment's radiomics features."""
    raise NotImplementedError


@router.get("", response_model=PreprocessingResult)
async def get_preprocessing(experiment_id: str) -> PreprocessingResult:
    """Get the experiment's preprocessing results."""
    raise NotImplementedError
