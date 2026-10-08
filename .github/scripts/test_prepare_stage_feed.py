import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from prepare_stage_feed import share_snapshot


class StageFeedTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.production = Path(self.directory.name) / "production"
        self.stage = Path(self.directory.name) / "stage"
        self.feed = {"schemaVersion": 1, "status": "success", "fetchedAt": "2026-10-08T12:00:00Z",
                     "lastAttemptAt": "2026-10-08T12:00:00Z", "message": "", "jobs": []}
        for checkout in (self.production, self.stage):
            (checkout / "scripts").mkdir(parents=True)
            (checkout / "scripts" / "collect_jobbank.py").write_text("# Synthetic collector\n")
            (checkout / "README.md").write_text(checkout.name)
            self.git(checkout, "init", "--quiet")
            self.commit(checkout)
        (self.production / "public").mkdir()
        self.source = self.production / "public" / "jobs.json"
        self.destination = self.stage / "public" / "jobs.json"
        self.source.write_text(json.dumps(self.feed))

    def git(self, checkout, *args):
        return subprocess.check_output(["git", "-C", str(checkout), *args], text=True, stderr=subprocess.STDOUT)

    def commit(self, checkout):
        self.git(checkout, "add", "scripts", "README.md")
        self.git(checkout, "-c", "user.name=Synthetic QA", "-c", "user.email=qa@example.invalid",
                 "-c", "commit.gpgsign=false", "commit", "--quiet", "--no-verify", "-m", "Synthetic fixture")

    def test_identical_collectors_share_exact_bytes_despite_different_commits(self):
        self.assertNotEqual(self.git(self.production, "rev-parse", "HEAD"), self.git(self.stage, "rev-parse", "HEAD"))
        self.assertTrue(share_snapshot(self.production, self.stage))
        self.assertEqual(self.destination.read_bytes(), self.source.read_bytes())

    def test_changed_collector_runs_stage_instead_of_copying_production(self):
        changed = {**self.feed, "lastAttemptAt": "2026-10-08T13:00:00Z"}
        script = "from pathlib import Path\nPath('public').mkdir(exist_ok=True)\n"
        script += f"Path('public/jobs.json').write_text({json.dumps(changed)!r})\n"
        (self.stage / "scripts" / "collect_jobbank.py").write_text(script)
        self.commit(self.stage)
        subprocess.run([sys.executable, str(Path(__file__).with_name("prepare_stage_feed.py")),
                        str(self.production), str(self.stage)], check=True, capture_output=True)
        self.assertEqual(json.loads(self.destination.read_text()), changed)

    def test_stale_metadata_is_preserved(self):
        self.source.write_text(json.dumps({**self.feed, "status": "stale", "message": "Source unavailable"}))
        self.assertTrue(share_snapshot(self.production, self.stage))
        self.assertEqual(self.destination.read_bytes(), self.source.read_bytes())

    def test_missing_source_fails_with_specific_message(self):
        self.source.unlink()
        with self.assertRaisesRegex(ValueError, "Cannot share production discovery snapshot"):
            share_snapshot(self.production, self.stage)
        self.assertFalse(self.destination.exists())

    def test_invalid_json_does_not_overwrite_existing_stage_data(self):
        self.destination.parent.mkdir()
        self.destination.write_text("previous snapshot")
        self.source.write_text("<html>Unexpected response</html>")
        with self.assertRaisesRegex(ValueError, "Cannot share production discovery snapshot"):
            share_snapshot(self.production, self.stage)
        self.assertEqual(self.destination.read_text(), "previous snapshot")

    def test_invalid_schema_does_not_publish(self):
        for invalid in ({**self.feed, "schemaVersion": 2}, {**self.feed, "jobs": {}},
                        {**self.feed, "status": "unknown"}, {**self.feed, "lastAttemptAt": None}):
            with self.subTest(invalid=invalid):
                self.source.write_text(json.dumps(invalid))
                with self.assertRaisesRegex(ValueError, "unexpected feed schema"):
                    share_snapshot(self.production, self.stage)
                self.assertFalse(self.destination.exists())


if __name__ == "__main__":
    unittest.main()
