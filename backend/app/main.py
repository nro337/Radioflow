"""Main.py"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# from fastapi.staticfiles import StaticFiles

from app.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start and shutdown for FastAPI"""
    dataset_path = settings.DATASET_PATH
    if not dataset_path.exists():
        raise RuntimeError(
            "Invalid DATASET_PATH: "
            f"'{dataset_path}' does not exist inside the container. "
            "Check your .env DATASET_PATH and docker-compose volume mount."
        )
    if not dataset_path.is_dir():
        raise RuntimeError(
            "Invalid DATASET_PATH: "
            f"'{dataset_path}' is not a directory inside the container."
        )

    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    print("Directories created.")
    print(f"[startup] Root directory: {settings.ROOT_DIR}")
    print(f"[startup] DATASET_PATH: {dataset_path}")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="RadioFlow API",
    description="BE 645 Final Project",
    version="0.0.1",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes


# Health check
@app.get("/health", tags=["meta"])
async def health_check():
    """Return API health status and version"""
    return {"status": "ok", "version": app.version}


@app.get("/health/dataset", tags=["meta"])
async def dataset_health_check():
    """Return dataset mount diagnostics to confirm container access."""
    dataset_path = settings.DATASET_PATH
    entries = (
        sorted(dataset_path.iterdir(), key=lambda p: p.name)
        if dataset_path.exists()
        else []
    )
    sample_entries = [str(path.relative_to(dataset_path)) for path in entries[:10]]

    image_extensions = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp"}
    image_examples: list[str] = []
    image_count = 0
    if dataset_path.exists() and dataset_path.is_dir():
        for file_path in dataset_path.rglob("*"):
            if not file_path.is_file():
                continue
            if file_path.suffix.lower() in image_extensions:
                image_count += 1
                if len(image_examples) < 10:
                    image_examples.append(str(file_path.relative_to(dataset_path)))

    return {
        "dataset_path": str(dataset_path),
        "exists": dataset_path.exists(),
        "is_dir": dataset_path.is_dir(),
        "top_level_entries_count": len(entries),
        "top_level_entries_sample": sample_entries,
        "image_count": image_count,
        "image_examples_sample": image_examples,
    }
