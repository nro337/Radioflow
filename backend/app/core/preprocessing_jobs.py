"""In-memory job tracking for preprocessing runs, so the API can report live progress."""

import asyncio
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional

from app.core.preprocessing_core import run_preprocessing

JobStatus = Literal["pending", "running", "completed", "failed"]


@dataclass
class ProgressEvent:
    """A snapshot of job progress, sent to subscribers as it changes."""

    status: JobStatus
    processed: int
    total: int
    currentFile: str = ""
    error: Optional[str] = None
    featuresPath: Optional[str] = None


@dataclass
class Job:
    """Tracks a single preprocessing run for one experiment."""

    id: str
    experimentId: str
    status: JobStatus = "pending"
    processed: int = 0
    total: int = 0
    currentFile: str = ""
    error: Optional[str] = None
    featuresPath: Optional[str] = None
    subscribers: List["asyncio.Queue[ProgressEvent]"] = field(default_factory=list)

    def snapshot(self) -> ProgressEvent:
        return ProgressEvent(
            status=self.status,
            processed=self.processed,
            total=self.total,
            currentFile=self.currentFile,
            error=self.error,
            featuresPath=self.featuresPath,
        )


_jobs: Dict[str, Job] = {}


def get_job(experiment_id: str) -> Optional[Job]:
    """Return the most recent preprocessing job for an experiment, if any."""
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


async def start_job(experiment_id: str, extraction_params: dict, dataset_path: str, output_path: str) -> Job:
    """Kick off a preprocessing run in a background thread and track its progress."""
    job = Job(id=str(uuid.uuid4()), experimentId=experiment_id)
    _jobs[experiment_id] = job

    loop = asyncio.get_running_loop()

    def on_progress(processed: int, total: int, current_file: str) -> None:
        job.processed = processed
        job.total = total
        job.currentFile = current_file
        loop.call_soon_threadsafe(_publish, job)

    def run() -> str:
        return run_preprocessing(
            extraction_params,
            dataset_path,
            outputPath=output_path,
            progressCallback=on_progress,
        )

    async def worker() -> None:
        job.status = "running"
        _publish(job)
        try:
            features_path = await asyncio.to_thread(run)
            job.status = "completed"
            job.featuresPath = features_path
        except Exception as exc:  # noqa: BLE001 - surface any failure to subscribers
            job.status = "failed"
            job.error = str(exc)
        _publish(job)

    asyncio.create_task(worker())
    return job
