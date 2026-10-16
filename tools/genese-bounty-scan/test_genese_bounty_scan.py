import unittest
from genese_bounty_scan import parse_items

class ScannerTests(unittest.TestCase):
    def test_detects_stated_reward_but_marks_unverified(self):
        rows = [{"title":"[BOUNTY $75] Accessibility fixes","body":"Reward $75 after accepted PR.","state":"open","html_url":"https://github.com/example/repo/issues/1"}]
        result = parse_items(rows)
        self.assertEqual(len(result), 1)
        self.assertIn("75", result[0].stated_reward)
        self.assertEqual(result[0].status, "CANDIDATE_UNVERIFIED")

    def test_deduplicates_and_ignores_pull_requests(self):
        url = "https://github.com/example/repo/issues/2"
        rows = [
            {"title":"Bounty $20","body":"","state":"open","html_url":url},
            {"title":"Bounty $20","body":"","state":"open","html_url":url},
            {"title":"Bounty $50","body":"","state":"open","html_url":"https://github.com/example/repo/issues/3","pull_request":{"url":"x"}},
        ]
        self.assertEqual(len(parse_items(rows)), 1)

    def test_does_not_invent_amount(self):
        rows = [{"title":"Bounty task","body":"Payment amount to be discussed","state":"open","html_url":"https://github.com/example/repo/issues/4"}]
        self.assertEqual(parse_items(rows)[0].stated_reward, "No explicit amount found")

if __name__ == "__main__":
    unittest.main(verbosity=2)
