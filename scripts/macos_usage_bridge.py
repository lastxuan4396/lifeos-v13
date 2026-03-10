#!/usr/bin/env python3
"""
LifeOS Mac usage bridge

Reads macOS Knowledge database (/app/usage), aggregates today's app usage,
and generates a LifeOS autofill URL.

Example:
  python3 scripts/macos_usage_bridge.py --open
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sqlite3
import subprocess
import sys
import urllib.parse
import webbrowser
from typing import Iterable, List, Tuple

CORE_DATA_EPOCH = dt.datetime(2001, 1, 1, tzinfo=dt.timezone.utc)
DEFAULT_DB = os.path.expanduser("~/Library/Application Support/Knowledge/knowledgeC.db")
DEFAULT_SITE = "https://lifeos-v13.onrender.com/"

SQL_DAILY_USAGE = """
SELECT
  ZVALUESTRING AS bundle_id,
  SUM(
    CASE
      WHEN ZENDDATE <= :start_core OR ZSTARTDATE >= :end_core THEN 0
      ELSE MIN(ZENDDATE, :end_core) - MAX(ZSTARTDATE, :start_core)
    END
  ) AS seconds
FROM ZOBJECT
WHERE ZSTREAMNAME = '/app/usage'
  AND ZVALUESTRING IS NOT NULL
  AND ZVALUESTRING != ''
  AND ZENDDATE > :start_core
  AND ZSTARTDATE < :end_core
GROUP BY ZVALUESTRING
HAVING seconds > 0
ORDER BY seconds DESC;
"""


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description="Generate LifeOS autofill URL from macOS app usage")
  parser.add_argument("--date", default=dt.date.today().isoformat(), help="Local date in YYYY-MM-DD")
  parser.add_argument("--db", default=DEFAULT_DB, help="Path to knowledgeC.db")
  parser.add_argument("--site", default=DEFAULT_SITE, help="LifeOS site URL")
  parser.add_argument("--open", action="store_true", help="Open generated URL in browser")
  parser.add_argument("--pbcopy", action="store_true", help="Copy generated URL to clipboard (macOS)")
  parser.add_argument("--json", action="store_true", help="Print JSON summary")
  parser.add_argument("--top-n", type=int, default=5, help="How many top apps to include in summary output")
  return parser.parse_args()


def to_core_data_seconds(local_dt: dt.datetime) -> float:
  utc_dt = local_dt.astimezone(dt.timezone.utc)
  return (utc_dt - CORE_DATA_EPOCH).total_seconds()


def local_day_bounds(date_str: str) -> Tuple[dt.datetime, dt.datetime]:
  day = dt.date.fromisoformat(date_str)
  local_tz = dt.datetime.now().astimezone().tzinfo
  if local_tz is None:
    local_tz = dt.timezone.utc
  start = dt.datetime.combine(day, dt.time.min, tzinfo=local_tz)
  end = start + dt.timedelta(days=1)
  return start, end


def fetch_daily_usage(db_path: str, date_str: str) -> List[Tuple[str, float]]:
  if not os.path.exists(db_path):
    raise FileNotFoundError(f"knowledge db not found: {db_path}")

  start_local, end_local = local_day_bounds(date_str)
  params = {
    "start_core": to_core_data_seconds(start_local),
    "end_core": to_core_data_seconds(end_local),
  }

  conn = sqlite3.connect(db_path)
  try:
    cur = conn.cursor()
    rows = cur.execute(SQL_DAILY_USAGE, params).fetchall()
  finally:
    conn.close()

  result: List[Tuple[str, float]] = []
  for bundle_id, seconds in rows:
    if not bundle_id:
      continue
    sec = float(seconds or 0)
    if sec <= 0:
      continue
    result.append((bundle_id, sec))
  return result


def pretty_minutes(seconds: float) -> int:
  return int(round(seconds / 60.0))


def build_lifeos_url(site: str, date_str: str, usage: List[Tuple[str, float]]) -> str:
  total_seconds = sum(sec for _, sec in usage)
  top_app_name = usage[0][0] if usage else ""
  top_app_minutes = pretty_minutes(usage[0][1]) if usage else 0

  base = site.rstrip("/") + "/"
  params = {
    "source": "mac-knowledge",
    "date": date_str,
    "macUsageMinutes": pretty_minutes(total_seconds),
    "appUsageMinutes": pretty_minutes(total_seconds),
    "topAppName": top_app_name,
    "topAppMinutes": top_app_minutes,
  }
  return base + "?" + urllib.parse.urlencode(params)


def maybe_pbcopy(text: str) -> None:
  try:
    subprocess.run(["pbcopy"], input=text.encode("utf-8"), check=True)
  except Exception as exc:  # noqa: BLE001
    print(f"[warn] pbcopy failed: {exc}", file=sys.stderr)


def main() -> int:
  args = parse_args()

  try:
    usage = fetch_daily_usage(args.db, args.date)
  except Exception as exc:  # noqa: BLE001
    print(f"[error] failed to read usage data: {exc}")
    print("hint: grant Full Disk Access to Terminal/iTerm if needed.")
    return 1

  url = build_lifeos_url(args.site, args.date, usage)
  total_minutes = pretty_minutes(sum(sec for _, sec in usage))
  top = usage[: max(args.top_n, 1)]

  if args.json:
    payload = {
      "date": args.date,
      "totalMinutes": total_minutes,
      "topApps": [
        {"bundle": bundle, "minutes": pretty_minutes(seconds)} for bundle, seconds in top
      ],
      "url": url,
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
  else:
    print(f"date={args.date}")
    print(f"macUsageMinutes={total_minutes}")
    if top:
      print("topApps:")
      for bundle, seconds in top:
        print(f"  - {bundle}: {pretty_minutes(seconds)} min")
    else:
      print("topApps: none")
    print("url:")
    print(url)

  if args.pbcopy:
    maybe_pbcopy(url)

  if args.open:
    webbrowser.open(url)

  return 0


if __name__ == "__main__":
  raise SystemExit(main())
