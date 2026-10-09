import subprocess
import tempfile
from pathlib import Path

from app.config import settings


def _sanitize(output: str, tmpdir: str) -> str:
  return (
    output.replace(str(Path(tmpdir) / "Judge.hs"), "Judge.hs")
    .replace(tmpdir, "<sandbox>")
    .strip()
  )


def _ensure_module_header(source: str) -> str:
  for line in source.splitlines():
    stripped = line.strip()
    if stripped == "" or stripped.startswith("--"):
      continue
    return source if stripped.startswith("module ") else f"module Judge where\n{source}"
  return f"module Judge where\n{source}"


def ghc_typecheck(source: str) -> str | None:
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
