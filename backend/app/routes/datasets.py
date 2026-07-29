"""Dataset browsing: list available datasets and preview their images."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/datasets", tags=["datasets"])

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}

# Only the dataset mounted via DATASET_PATH is available today.
LINKED_DATASET_ID = "linked"


class Dataset(BaseModel):
    """A dataset available to run experiments on."""

    id: str
    name: str
    image_count: int


class DatasetImage(BaseModel):
    """Reference to a single image within a dataset."""

    path: str


def _iter_images(root: Path):
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS:
            yield path


def _get_dataset_root(dataset_id: str) -> Path:
    if dataset_id != LINKED_DATASET_ID:
        raise HTTPException(status_code=404, detail="Dataset not found")
    root = settings.DATASET_PATH
    if not root.exists() or not root.is_dir():
        raise HTTPException(status_code=404, detail="Dataset path is not available")
    return root


@router.get("", response_model=list[Dataset])
async def list_datasets() -> list[Dataset]:
    """List datasets available to run experiments on."""
    root = settings.DATASET_PATH
    image_count = sum(1 for _ in _iter_images(root)) if root.exists() and root.is_dir() else 0
    return [Dataset(id=LINKED_DATASET_ID, name=root.name, image_count=image_count)]


@router.get("/{dataset_id}/images", response_model=list[DatasetImage])
async def list_dataset_images(
    dataset_id: str, limit: int = Query(default=60, ge=1, le=500)
) -> list[DatasetImage]:
    """List image references from a dataset, for use as a preview grid."""
    root = _get_dataset_root(dataset_id)
    images: list[DatasetImage] = []
    for path in _iter_images(root):
        images.append(DatasetImage(path=str(path.relative_to(root))))
        if len(images) >= limit:
            break
    return images


@router.get("/{dataset_id}/images/{image_path:path}")
async def get_dataset_image(dataset_id: str, image_path: str) -> FileResponse:
    """Serve a single image file from a dataset."""
    root = _get_dataset_root(dataset_id)
    candidate = (root / image_path).resolve()
    if candidate != root.resolve() and root.resolve() not in candidate.parents:
        raise HTTPException(status_code=400, detail="Invalid image path")
    if not candidate.is_file() or candidate.suffix.lower() not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(candidate)
