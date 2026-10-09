from pathlib import Path

from app.db import engine


def main() -> None:
  sql = Path(__file__).parent.joinpath("seed.sql").read_text(encoding="utf-8")
  with engine.begin() as conn:
    conn.exec_driver_sql(sql)


if __name__ == "__main__":
  main()
