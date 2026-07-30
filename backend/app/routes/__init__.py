"""Pull into one router"""

from fastapi import APIRouter

from app.routes import (
    datasets,
    evaluation,
    experiments,
    models,
    prediction,
    preprocessing,
    training,
)

router = APIRouter()
router.include_router(datasets.router)
router.include_router(experiments.router)
router.include_router(preprocessing.router)
router.include_router(preprocessing.fallback_router)
router.include_router(models.router)
router.include_router(training.router)
router.include_router(evaluation.router)
router.include_router(prediction.router)
