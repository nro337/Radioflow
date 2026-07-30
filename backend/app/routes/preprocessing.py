"""Preprocessing Step 2"""

import csv
import itertools
import json
from typing import List, Optional, Tuple

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.config import settings
from app.core.preprocessing_jobs import get_job, start_job, subscribe, use_fallback
from app.routes.datasets import _get_dataset_root
from app.routes.experiments import _require_experiment

router = APIRouter(
    prefix="/experiments/{experiment_id}/preprocessing", tags=["preprocessing"]
)

# Not experiment-scoped: previews the same pre-generated CSV regardless of experiment,
# so demos can skip straight to results without waiting on a live run.
fallback_router = APIRouter(prefix="/preprocessing", tags=["preprocessing"])


class FirstOrderFeaturesParams(BaseModel):
    turnOn: bool = True


class GLCMParams(BaseModel):
    turnOn: bool = True
    isSymmetric: bool = False
    d: List[float] = [1, 2, 3]
    theta: List[float] = [0, 45]


class GLRLMParams(BaseModel):
    turnOn: bool = True
    theta: List[float] = [0]


class GLSZMParams(BaseModel):
    turnOn: bool = True
    connectivity: List[int] = [4]


class ExtractionParams(BaseModel):
    """Feature extraction parameters, mirroring `preprocessing_core.sample_extraction_params`."""

    targetSize: Tuple[int, int] = (128, 128)
    maxRegions: int = Field(default=2, ge=1)
    isNorm: bool = True
    ignoreZeros: bool = True
    firstOrderFeatures: FirstOrderFeaturesParams = FirstOrderFeaturesParams()
    glcm: GLCMParams = GLCMParams()
    glrlm: GLRLMParams = GLRLMParams()
    glszm: GLSZMParams = GLSZMParams()


class PreprocessingConfig(BaseModel):
    """Request body for running preprocessing (normalization, feature selection, splits)."""

    datasetId: str
    extractionParams: ExtractionParams


class PreprocessingResult(BaseModel):
    """Preprocessing summary/result."""

    status: str
    processed: int = 0
    total: int = 0
    currentFile: str = ""
    error: Optional[str] = None
    featuresPath: Optional[str] = None


def _to_core_params(params: ExtractionParams) -> dict:
    """Translate the API's extraction params into the shape `run_preprocessing` expects."""
    return {
        "FirstOrderFeatures": {"turnOn": params.firstOrderFeatures.turnOn},
        "GLCM": {
            "d": list(params.glcm.d),
            "theta": list(params.glcm.theta),
            "isSymmetric": params.glcm.isSymmetric,
            "turnOn": params.glcm.turnOn,
        },
        "GLRLM": {
            "theta": list(params.glrlm.theta),
            "turnOn": params.glrlm.turnOn,
        },
        "GLSZM": {
            "connectivity": list(params.glszm.connectivity),
            "turnOn": params.glszm.turnOn,
        },
        "targetSize": tuple(params.targetSize),
        "isNorm": params.isNorm,
        "ignoreZeros": params.ignoreZeros,
        "maxRegions": params.maxRegions,
    }


def _output_path(experiment_id: str, params: ExtractionParams) -> str:
    turned_on = [
        name
        for name, enabled in (
            ("FirstOrderFeatures", params.firstOrderFeatures.turnOn),
            ("GLCM", params.glcm.turnOn),
            ("GLRLM", params.glrlm.turnOn),
            ("GLSZM", params.glszm.turnOn),
        )
        if enabled
    ]
    experiment_dir = settings.RESULTS_DIR / experiment_id
    return str(experiment_dir / f"({'-'.join(turned_on)}) Features.csv")


def _to_result(job) -> PreprocessingResult:
    return PreprocessingResult(
        status=job.status,
        processed=job.processed,
        total=job.total,
        currentFile=job.currentFile,
        error=job.error,
        featuresPath=job.featuresPath,
    )


@router.post("", response_model=PreprocessingResult, status_code=202)
async def run_preprocessing_job(
    experiment_id: str, payload: PreprocessingConfig
) -> PreprocessingResult:
    """Start preprocessing on the experiment's radiomics features."""
    _require_experiment(experiment_id)

    existing = get_job(experiment_id)
    if existing is not None and existing.status == "running":
        raise HTTPException(
            status_code=409,
            detail="Preprocessing is already running for this experiment.",
        )

    dataset_root = _get_dataset_root(payload.datasetId)
    core_params = _to_core_params(payload.extractionParams)

    if not any(
        core_params[key]["turnOn"]
        for key in ("FirstOrderFeatures", "GLCM", "GLRLM", "GLSZM")
    ):
        raise HTTPException(
            status_code=422,
            detail="No features are turned on for extraction. Please enable at least one feature.",
        )

    output_path = _output_path(experiment_id, payload.extractionParams)
    job = await start_job(experiment_id, core_params, str(dataset_root), output_path)
    return _to_result(job)


@router.get("", response_model=PreprocessingResult)
async def get_preprocessing(experiment_id: str) -> PreprocessingResult:
    """Get the experiment's preprocessing results."""
    _require_experiment(experiment_id)

    job = get_job(experiment_id)
    if job is None:
        raise HTTPException(
            status_code=404, detail="No preprocessing job found for this experiment."
        )
    return _to_result(job)


@router.post("/use-fallback", response_model=PreprocessingResult)
async def use_fallback_preprocessing(experiment_id: str) -> PreprocessingResult:
    """Skip live preprocessing and treat the pre-generated demo CSV as this experiment's features."""
    _require_experiment(experiment_id)

    path = settings.FALLBACK_FEATURES_CSV_PATH
    if path is None or not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="No fallback features CSV is configured (set FALLBACK_FEATURES_CSV_PATH).",
        )

    job = use_fallback(experiment_id, str(path))
    return _to_result(job)


@router.get("/stream")
async def stream_preprocessing_progress(experiment_id: str) -> StreamingResponse:
    """Server-sent events stream of live preprocessing progress for the UI to follow."""
    _require_experiment(experiment_id)

    job = get_job(experiment_id)
    if job is None:
        raise HTTPException(
            status_code=404, detail="No preprocessing job found for this experiment."
        )

    queue = subscribe(job)

    async def event_source():
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(vars(event))}\n\n"
            if event.status in ("completed", "failed"):
                break

    return StreamingResponse(event_source(), media_type="text/event-stream")


class FallbackFeaturesPreview(BaseModel):
    """A peek at the first few rows of the pre-generated demo features CSV."""

    path: str
    columns: List[str]
    rows: List[List[str]]


@fallback_router.get("/fallback", response_model=FallbackFeaturesPreview)
async def get_fallback_features_preview(limit: int = 10) -> FallbackFeaturesPreview:
    """Preview the CSV at FALLBACK_FEATURES_CSV_PATH, for demos that skip a live run."""
    path = settings.FALLBACK_FEATURES_CSV_PATH
    if path is None or not path.is_file():
        raise HTTPException(
            status_code=404,
            detail="No fallback features CSV is configured (set FALLBACK_FEATURES_CSV_PATH).",
        )

    with open(path, newline="", encoding="utf-8") as csv_file:
        reader = csv.reader(csv_file)
        columns = next(reader, [])
        rows = list(itertools.islice(reader, limit))

    return FallbackFeaturesPreview(path=str(path), columns=columns, rows=rows)
