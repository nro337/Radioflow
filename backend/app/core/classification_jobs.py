"""In-memory job tracking for classification experiment runs, so the API can report live progress."""

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional

from app.core.classification_core import run_classification_experiments

JobStatus = Literal["pending", "running", "completed", "failed"]


@dataclass
class ProgressEvent:
    """A snapshot of job progress, sent to subscribers as it changes."""

    status: JobStatus
    processed: int
    total: int
    currentTask: str = ""
    error: Optional[str] = None
    resultsPath: Optional[str] = None


@dataclass
class Job:
    """Tracks a single classification experiment run for one experiment."""

    id: str
    experimentId: str
    status: JobStatus = "pending"
    processed: int = 0
    total: int = 0
    currentTask: str = ""
    error: Optional[str] = None
    resultsPath: Optional[str] = None
    targetColumn: str = "Class"
    dropFirstColumn: bool = True
    subscribers: List["asyncio.Queue[ProgressEvent]"] = field(default_factory=list)

    def snapshot(self) -> ProgressEvent:
        return ProgressEvent(
            status=self.status,
            processed=self.processed,
            total=self.total,
            currentTask=self.currentTask,
            error=self.error,
            resultsPath=self.resultsPath,
        )


_jobs: Dict[str, Job] = {}


def get_job(experiment_id: str) -> Optional[Job]:
    """Return the most recent classification job for an experiment, if any."""
    return _jobs.get(experiment_id)


def subscribe(job: Job) -> "asyncio.Queue[ProgressEvent]":
    """Register a queue that receives every future progress update for this job.

    Immediately seeds the queue with the current state, so subscribers that join
    after the job started still see where things stand.
    """
    queue: "asyncio.Queue[ProgressEvent]" = asyncio.Queue()
    job.subscribers.append(queue)
    queue.put_nowait(job.snapshot())
    return queue


def _publish(job: Job) -> None:
    for queue in job.subscribers:
        queue.put_nowait(job.snapshot())


async def start_job(
    experiment_id: str,
    features_path: str,
    output_dir: str,
    test_ratios: list,
    scalers: list,
    models: list,
    target_column: str,
    drop_first_column: bool,
) -> Job:
    """Kick off a classification experiment sweep in a background thread and track its progress."""
    job = Job(
        id=str(uuid.uuid4()),
        experimentId=experiment_id,
        targetColumn=target_column,
        dropFirstColumn=drop_first_column,
    )
    _jobs[experiment_id] = job

    loop = asyncio.get_running_loop()

    def on_progress(processed: int, total: int, current_task: str) -> None:
        job.processed = processed
        job.total = total
        job.currentTask = current_task
        loop.call_soon_threadsafe(_publish, job)

    def run() -> str:
        return run_classification_experiments(
            datasetFilename=features_path,
            storageFolderName=output_dir,
            test_ratios=test_ratios,
            scalers=scalers,
            models=models,
            baseDir="",
            targetColumn=target_column,
            dropFirstColumn=drop_first_column,
            progressCallback=on_progress,
        )

    async def worker() -> None:
        job.status = "running"
        _publish(job)
        try:
            results_path = await asyncio.to_thread(run)
            job.status = "completed"
            job.resultsPath = results_path
        except Exception as exc:  # noqa: BLE001 - surface any failure to subscribers
            job.status = "failed"
            job.error = str(exc)
        _publish(job)

    asyncio.create_task(worker())
    return job
