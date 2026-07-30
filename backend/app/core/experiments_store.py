"""In-memory store for experiment resources (Step 1: problem definition)."""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional


@dataclass
class Experiment:
    """Tracks a single experiment's problem definition and identity."""

    id: str
    name: str
    datasetId: str
    description: Optional[str] = None
    createdAt: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


_experiments: Dict[str, Experiment] = {}


def create_experiment(name: str, datasetId: str, description: Optional[str] = None) -> Experiment:
    """Create and store a new experiment."""
    experiment = Experiment(
        id=str(uuid.uuid4()),
        name=name,
        datasetId=datasetId,
        description=description,
    )
    _experiments[experiment.id] = experiment
    return experiment


def get_experiment(experiment_id: str) -> Optional[Experiment]:
    """Fetch a single experiment by id, if it exists."""
    return _experiments.get(experiment_id)


def list_experiments() -> List[Experiment]:
    """List all experiments, most recently created first."""
    return sorted(_experiments.values(), key=lambda e: e.createdAt, reverse=True)


def delete_experiment(experiment_id: str) -> bool:
    """Delete an experiment by id. Returns whether it existed."""
    return _experiments.pop(experiment_id, None) is not None
