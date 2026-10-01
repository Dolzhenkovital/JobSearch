import unittest
from collect_jobbank import parse_feed

ATOM = b'''<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Office coordinator</title><link href="https://www.jobbank.gc.ca/jobsearch/jobposting/12345"/><updated>2026-10-01T12:00:00Z</updated><summary type="html">&lt;strong&gt;Location:&lt;/strong&gt; Laval (QC)&lt;br /&gt;&lt;strong&gt;Employer:&lt;/strong&gt; Example Co&lt;br /&gt;&lt;strong&gt;Salary:&lt;/strong&gt; $25.00 hourly</summary></entry></feed>'''


class CollectorTests(unittest.TestCase):
    def test_atom_metadata_and_missing_publication_date(self):
        job = parse_feed(ATOM, "2026-10-01T12:00:00Z")[0]
        self.assertEqual(job["id"], "jobbank:12345")
        self.assertEqual(job["employer"], "Example Co")
        self.assertEqual(job["location"], "Laval (QC)")
        self.assertIsNone(job["publishedAt"])
        self.assertEqual(job["completeness"], "snippet")
        self.assertEqual(job["availability"], "unknown")

    def test_empty_success_is_distinct_from_wrong_content(self):
        self.assertEqual(parse_feed(b'<feed xmlns="http://www.w3.org/2005/Atom"/>', "now"), [])
        with self.assertRaises(ValueError):
            parse_feed(b'<html><body>Access challenge</body></html>', "now")

    def test_unrecognized_links_and_doctype_are_rejected(self):
        with self.assertRaises(ValueError):
            parse_feed(ATOM.replace(b"https://www.jobbank.gc.ca/", b"https://example.org/"), "now")
        with self.assertRaises(ValueError):
            parse_feed(b'<!DOCTYPE feed><feed/>', "now")


if __name__ == "__main__":
    unittest.main()
