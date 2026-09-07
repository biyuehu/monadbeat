import subprocess
import tempfile
from pathlib import Path

from app.config import settings


def ghc_typecheck(source: str) -> str | None:
  with tempfile.TemporaryDirectory() as tmpdir:
    tmpfile = Path(tmpdir) / "Judge.hs"
    tmpfile.write_text(source, encoding="utf-8")

    try:
      result = subprocess.run(
        [settings.ghc_binary, "-fno-code", "-fforce-recomp", str(tmpfile)],
        capture_output=True,
        text=True,
        timeout=settings.ghc_timeout_sec,
        cwd=tmpdir,
        check=False,
      )
    except subprocess.TimeoutExpired:
      return f"Type checking timeout (>{settings.ghc_timeout_sec}s)"

    if result.returncode != 0:
      return (
        result.stderr.strip()
        or result.stdout.strip()
        or "GHC compile failed, no output"
      )

    return None
