import subprocess
import tempfile
import threading
from pathlib import Path

from app.config import settings

# Global bounded semaphore to restrict concurrent GHC processes
_ghc_semaphore = threading.BoundedSemaphore(settings.max_concurrent_ghc)


def _sanitize(output: str, tmpdir: str) -> str:
  return (
    output.replace(str(Path(tmpdir) / "Judge.hs"), "Judge.hs")
    .replace(tmpdir, "<sandbox>")
    .strip()
  )


def _ensure_module_header(source: str) -> str:
  lines = source.splitlines()
  insert_idx = 0
  for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped.startswith("module "):
      return source
    if (
      stripped == ""
      or stripped.startswith("--")
      or (stripped.startswith("{-#") and stripped.endswith("#-}"))
    ):
      insert_idx = i + 1
      continue
    break

  lines.insert(insert_idx, "module Judge where")
  return "\n".join(lines)


def ghc_typecheck(source: str) -> str | None:
  # Acquire semaphore so at most settings.max_concurrent_ghc processes run at once
  acquired = _ghc_semaphore.acquire(timeout=settings.ghc_timeout_sec)
  if not acquired:
    return "Server is currently experiencing high load. Please try again shortly."

  try:
    with tempfile.TemporaryDirectory() as tmpdir:
      tmpfile = Path(tmpdir) / "Judge.hs"
      tmpfile.write_text(_ensure_module_header(source), encoding="utf-8")

      try:
        result = subprocess.run(
          [
            settings.ghc_binary,
            "-c",
            "-fno-code",
            "-fforce-recomp",
            str(tmpfile),
            "+RTS",
            f"-M{settings.ghc_memory_mb}m",
            "-RTS",
          ],
          capture_output=True,
          text=True,
          timeout=settings.ghc_timeout_sec,
          cwd=tmpdir,
          check=False,
        )
      except subprocess.TimeoutExpired:
        return f"Type checking timeout (>{settings.ghc_timeout_sec}s)"

      if result.returncode != 0:
        detail = _sanitize(result.stderr, tmpdir) or _sanitize(result.stdout, tmpdir)
        return detail or "GHC compile failed, no output"

      return None
  finally:
    _ghc_semaphore.release()
