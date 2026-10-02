"""Fetch public Job Bank discovery metadata; never read candidate data."""
from __future__ import annotations

import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

FEED_URL = "https://www.jobbank.gc.ca/jobsearch/feed/jobSearchRSSfeed?sort=D"
PREVIOUS_URL = "https://dolzhenkovital.github.io/JobSearch/jobs.json"
MAX_BYTES = 5 * 1024 * 1024
ROOT = Path(__file__).resolve().parents[1]


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag in ("br", "p", "div"):
            self.parts.append("\n")

    def handle_data(self, data):
        self.parts.append(data)


def request(url):
    request = urllib.request.Request(url, headers={"User-Agent": "JobSearch/0.1 (+https://github.com/Dolzhenkovital/JobSearch)", "Accept": "application/atom+xml, application/xml, application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        content = response.read(MAX_BYTES + 1)
        if len(content) > MAX_BYTES:
            raise ValueError("Response exceeds the size limit")
        return content


def parse_feed(content, now):
    if b"<!DOCTYPE" in content.upper():
        raise ValueError("Unexpected XML document type")
    root = ET.fromstring(content)
    entries = root.findall("{*}entry")
    if not entries and root.tag.split("}")[-1] != "feed":
        raise ValueError("Expected a Job Bank Atom feed")
    jobs = {}
    for entry in entries:
        def text(tag):
            return (entry.findtext("{*}" + tag) or "").strip()

        links = [node for node in entry.findall("{*}link") if node.attrib.get("rel", "alternate") == "alternate"]
        url = links[0].attrib.get("href", "") if links else ""
        match = re.match(r"https://(?:www\.)?jobbank\.gc\.ca/jobsearch/jobposting/(\d+)", url)
        if not match:
            continue
        parser = PlainText()
        parser.feed(text("summary"))
        summary = "".join(parser.parts)

        def field(label):
            result = re.search(r"(?:" + label + r")\s*:\s*([^\n]+)", summary, re.I)
            return result.group(1).strip() if result else ""

        job_id = f"jobbank:{match.group(1)}"
        published = text("published")
        # Atom updated is not automatically a publication timestamp.
        try:
            published = datetime.fromisoformat(published.replace("Z", "+00:00")).isoformat() if published else None
        except ValueError:
            published = None
        employer, location, salary = field("Employer|Employeur"), field("Location|Lieu de travail"), field("Salary|Salaire")
        jobs[job_id] = {
            "id": job_id, "title": text("title"), "employer": employer,
            "location": location, "salary": salary, "url": url, "source": "Job Bank",
            "description": "\n".join(x for x in [employer, location, salary] if x),
            "completeness": "snippet", "publishedAt": published, "firstSeenAt": now,
            "checkedAt": now, "availability": "unknown",
        }
    if entries and not jobs:
        raise ValueError("Feed structure changed; no recognized job links")
    return list(jobs.values())


def main():
    now = datetime.now(timezone.utc).isoformat()
    output = ROOT / "public" / "jobs.json"
    previous = None
    try:
        previous = json.loads(output.read_text(encoding="utf-8") if output.exists() else request(PREVIOUS_URL))
        if previous.get("schemaVersion") != 1 or not isinstance(previous.get("jobs"), list):
            previous = None
    except Exception:
        previous = None
    try:
        jobs = parse_feed(request(FEED_URL), now)
        seen = {j["id"]: j.get("firstSeenAt") for j in (previous or {}).get("jobs", [])}
        for job in jobs:
            job["firstSeenAt"] = seen.get(job["id"]) or now
        result = {"schemaVersion": 1, "fetchedAt": now, "lastAttemptAt": now, "status": "success", "message": "", "jobs": jobs}
        print(f"Job Bank: retrieved {len(jobs)} public discovery records; full descriptions not fetched.")
    except Exception as error:
        has_previous = previous is not None and previous.get("fetchedAt")
        result = {
            "schemaVersion": 1, "fetchedAt": previous.get("fetchedAt") if has_previous else None,
            "lastAttemptAt": now, "status": "stale" if has_previous else "error",
            "message": "Job Bank update temporarily unavailable; serving the last good snapshot where available.",
            "jobs": previous.get("jobs", []) if has_previous else [],
        }
        print(f"Job Bank: {type(error).__name__}; keeping the last good snapshot where available.", file=sys.stderr)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
