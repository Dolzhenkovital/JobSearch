"""Share public discovery data only when the versioned collectors are identical."""
import json
import subprocess
import sys
from pathlib import Path


def collector_tree(checkout):
    return subprocess.check_output(
        ["git", "-C", str(checkout), "rev-parse", "HEAD:scripts"], text=True
    ).strip()


def share_snapshot(production, stage):
    production_tree, stage_tree = collector_tree(production), collector_tree(stage)
    print(f"Collector trees: production={production_tree}; stage={stage_tree}")
    if production_tree != stage_tree:
        print("Stage collector changed; collect its discovery snapshot separately.")
        return False
    source = production / "public" / "jobs.json"
    try:
        content = source.read_bytes()
        feed = json.loads(content)
        if not (
            isinstance(feed, dict)
            and type(feed.get("schemaVersion")) is int and feed["schemaVersion"] == 1
            and isinstance(feed.get("jobs"), list)
            and feed.get("status") in ("success", "stale", "error")
            and (feed.get("fetchedAt") is None or isinstance(feed["fetchedAt"], str))
            and isinstance(feed.get("lastAttemptAt"), str)
            and isinstance(feed.get("message"), str)
        ):
            raise ValueError("unexpected feed schema")
    except (OSError, ValueError) as error:
        raise ValueError(f"Cannot share production discovery snapshot {source}: {error}") from error
    destination = stage / "public" / "jobs.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(content)
    print(f"Stage shares this run's snapshot: status={feed['status']}; fetchedAt={feed.get('fetchedAt')}")
    return True


def main():
    production, stage = (Path(value).resolve() for value in sys.argv[1:])
    if not share_snapshot(production, stage):
        subprocess.run([sys.executable, str(stage / "scripts" / "collect_jobbank.py")], cwd=stage, check=True)


if __name__ == "__main__":
    main()
