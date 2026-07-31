"""Evaluation Step 5"""

import csv
import json
import re
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.classification_jobs import get_job
from app.routes.experiments import _require_experiment
from app.routes.training import _output_dir

router = APIRouter(prefix="/experiments/{experiment_id}/evaluate", tags=["evaluation"])

_TEST_RATIO_DIR_RE = re.compile(r"^TestRatio_(?P<ratio>.+)$")

_COUNT_METRIC_KEYS = {"TP", "FP", "FN", "TN"}


class EvaluationRow(BaseModel):
    """Aggregate metrics for a single test-ratio/scaler/model combination."""

    testRatio: float
    model: str
    scaler: str
    metrics: Dict[str, float]
    countMetrics: Dict[str, str] = {}


class EvaluationResult(BaseModel):
    """Performance metrics for the experiment's trained model."""

    status: str
    rows: List[EvaluationRow] = []
    error: Optional[str] = None


class ConfusionMatrix(BaseModel):
    """Raw confusion matrix and class labels for one trained combination."""

    labels: List[str]
    matrix: List[List[int]]


def _results_dir(experiment_id: str) -> Path:
    return Path(_output_dir(experiment_id))


def _read_metrics_csv(csv_path: Path, test_ratio: float) -> List[EvaluationRow]:
    rows: List[EvaluationRow] = []
    with open(csv_path, newline="", encoding="utf-8") as csv_file:
        for record in csv.DictReader(csv_file):
            model = record.pop("Model", "")
            scaler = record.pop("Scaler", "")
            metrics: Dict[str, float] = {}
            countMetrics: Dict[str, str] = {}
            for key, value in record.items():
                if key in _COUNT_METRIC_KEYS:
                    countMetrics[key] = value
                    continue
                try:
                    metrics[key] = float(value)
                except (TypeError, ValueError):
                    continue
            rows.append(
                EvaluationRow(
                    testRatio=test_ratio,
                    model=model,
                    scaler=scaler,
                    metrics=metrics,
                    countMetrics=countMetrics,
                )
            )
    return rows


@router.get("", response_model=EvaluationResult)
async def evaluate_experiment(experiment_id: str) -> EvaluationResult:
    """Fetch evaluation metrics for the experiment's trained model sweep."""
    _require_experiment(experiment_id)

    job = get_job(experiment_id)
    if job is None:
        raise HTTPException(
            status_code=404, detail="No training job found for this experiment."
        )
    if job.status in ("pending", "running"):
        return EvaluationResult(status=job.status)
    if job.status == "failed":
        return EvaluationResult(status=job.status, error=job.error)

    results_dir = _results_dir(experiment_id)
    rows: List[EvaluationRow] = []
    for test_ratio_dir in sorted(results_dir.glob("TestRatio_*")):
        match = _TEST_RATIO_DIR_RE.match(test_ratio_dir.name)
        csv_path = test_ratio_dir / "Metrics History.csv"
        if match is None or not csv_path.exists():
            continue
        rows.extend(_read_metrics_csv(csv_path, float(match.group("ratio"))))

    return EvaluationResult(status=job.status, rows=rows)


@router.get("/confusion-matrix", response_model=ConfusionMatrix)
async def get_confusion_matrix(
    experiment_id: str, testRatio: float, model: str, scaler: str
) -> ConfusionMatrix:
    """Fetch the raw confusion matrix for one trained model/scaler/test-ratio combination."""
    _require_experiment(experiment_id)

    cm_path = (
        _results_dir(experiment_id)
        / f"TestRatio_{testRatio}"
        / f"{model}_{scaler}_CM.json"
    )
    if not cm_path.exists():
        raise HTTPException(status_code=404, detail="Confusion matrix not found.")

    with open(cm_path, encoding="utf-8") as f:
        payload = json.load(f)
    # Older result files may have numeric labels (saved before labels were
    # cast to str); coerce here so both old and new files load cleanly.
    labels = [str(label) for label in payload["labels"]]
    return ConfusionMatrix(labels=labels, matrix=payload["matrix"])
