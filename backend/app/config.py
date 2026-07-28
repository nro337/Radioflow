"""config.py"""

from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """FastAPI Settings

    Args:
        BaseSettings: Default Pydantic settings that allow overriding via env
    """

    # Directories that can be overriden with env vars
    ROOT_DIR: Path = Path("/app")
    DATA_DIR: Path = Path("/app/data")
    UPLOAD_DIR: Path = Path("/app/data/uploads")
    CHECKPOINT_DIR: Path = Path("/app/data/checkpoints")
    RESULTS_DIR: Path = Path("/app/data/results")
    DATASET_PATH: Path = Path("/data")  # Read-only dataset mount within Docker container
    STATIC_DIR: Path = Path("/app/static")  # Only for serving static file in prod

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",  # Vite dev
        "http://localhost:4173",  # Vite preview
        "http://localhost:8000",  # FastAPI static & docs
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
