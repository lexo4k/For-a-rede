import unittest
from genese_bounty_scan import parse_items, scan, amount
class Tests(unittest.TestCase):
 def test_reward_is_unverified(self):
  r=parse_items([{"title":"Bounty $75","body":"reward $75","state":"open","html_url":"https://github.com/a/b/issues/1"}])
  self.assertEqual(len(r),1); self.assertIn("75",r[0]["stated_reward"]); self.assertEqual(r[0]["status"],"CANDIDATE_UNVERIFIED")
 def test_dedupe_and_ignore_pr(self):
  u="https://github.com/a/b/issues/2"; rows=[{"title":"Bounty $20","state":"open","html_url":u},{"title":"Bounty $20","state":"open","html_url":u},{"title":"Bounty $30","state":"open","html_url":"https://github.com/a/b/issues/3","pull_request":{"url":"x"}}]
  self.assertEqual(len(parse_items(rows)),1)
 def test_no_amount_invented(self): self.assertEqual(amount("payment to be discussed"),"No explicit amount found")
 def test_offline_leads_preserved(self):
  r=scan(offline=True); self.assertFalse(r["live_search"]["attempted"]); self.assertEqual(len(r["previously_observed_leads"]),5); self.assertEqual(r["confirmed_payments"],0)
if __name__=="__main__": unittest.main(verbosity=2)
