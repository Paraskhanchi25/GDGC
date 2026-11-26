import logging
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".csv", ".txt", ".json"}
ALLOWED_MIME_TYPES = {
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "text/plain",
    "application/json",
}


class StorageService:
    """Manages user-scoped files under the persistent VPS storage root."""

    def __init__(self, root: Path | None = None) -> None:
        settings = get_settings()
        self.root = (root or settings.storage_path).resolve()
        self.max_bytes = settings.max_upload_bytes
        self._ensure_base_dirs()

    def _ensure_base_dirs(self) -> None:
        for sub in ("uploads/transactions", "exports", "logs", "temp"):
            (self.root / sub).mkdir(parents=True, exist_ok=True)

    def _safe_user_dir(self, category: str, user_id: str) -> Path:
        safe_uid = "".join(c for c in str(user_id) if c.isalnum() or c in ("-", "_"))
        if not safe_uid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user scope.")
        target = (self.root / category / safe_uid).resolve()
        if not str(target).startswith(str(self.root)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid storage path.")
        target.mkdir(parents=True, exist_ok=True)
        return target

    def _safe_file_path(self, base_dir: Path, filename: str) -> Path:
        clean_name = Path(filename).name
        if not clean_name or clean_name in (".", ".."):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")
        resolved = (base_dir / clean_name).resolve()
        if not str(resolved).startswith(str(base_dir)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Path traversal detected.")
        return resolved

    async def save_upload(self, user_id: str, file: UploadFile, subdir: str = "uploads/transactions") -> tuple[str, Path, bytes]:
        ext = Path(file.filename or "").suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported MIME type '{file.content_type}'.",
            )

        content = await file.read()
        if len(content) == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
        if len(content) > self.max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum size of {self.max_bytes // (1024 * 1024)} MB.",
            )

        user_dir = self._safe_user_dir(subdir, user_id)
        stored_name = f"{uuid.uuid4().hex}{ext}"
        dest = self._safe_file_path(user_dir, stored_name)
        dest.write_bytes(content)
        logger.info("Saved upload %s for user %s (%d bytes)", stored_name, user_id, len(content))
        return stored_name, dest, content

    def save_bytes(self, user_id: str, subdir: str, filename: str, data: bytes) -> Path:
        user_dir = self._safe_user_dir(subdir, user_id)
        dest = self._safe_file_path(user_dir, filename)
        dest.write_bytes(data)
        return dest

    def read_file(self, user_id: str, subdir: str, filename: str) -> bytes:
        user_dir = self._safe_user_dir(subdir, user_id)
        target = self._safe_file_path(user_dir, filename)
        if not target.exists() or not target.is_file():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
        return target.read_bytes()

    def delete_file(self, user_id: str, subdir: str, filename: str) -> bool:
        user_dir = self._safe_user_dir(subdir, user_id)
        target = self._safe_file_path(user_dir, filename)
        if target.exists() and target.is_file():
            target.unlink()
            return True
        return False

    def list_user_files(self, user_id: str, subdir: str = "uploads/transactions") -> list[str]:
        user_dir = self._safe_user_dir(subdir, user_id)
        return sorted(p.name for p in user_dir.iterdir() if p.is_file())

    def file_exists(self, user_id: str, subdir: str, filename: str) -> bool:
        user_dir = self._safe_user_dir(subdir, user_id)
        target = self._safe_file_path(user_dir, filename)
        return target.exists() and target.is_file()

    def cleanup_temp(self) -> int:
        temp_dir = (self.root / "temp").resolve()
        removed = 0
        if temp_dir.exists():
            for p in temp_dir.iterdir():
                if p.is_file():
                    p.unlink()
                    removed += 1
        return removed
