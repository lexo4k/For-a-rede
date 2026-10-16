#!/usr/bin/env python3
"""GENESE: search public GitHub bounty leads; advertised rewards are not guaranteed income."""
import argparse, json, re, sys, urllib.parse, urllib.request
from datetime import datetime, timezone

API = "https://api.github.com/search/issues"
QUERIES = ['is:issue is:open bounty', 'is:issue is:open "paid bounty"']
# Leads observed in the first search; preserved as historical examples, not current offers.
HISTORICAL_LEADS = [
 {"title":"Accessibility and motion-preference fixes","url":"https://github.com/Parabola-org/parabola/issues/16","stated_reward":"$75 (unverified)"},
 {"title":"n8n + Claude weekly developer summary","url":"https://github.com/claude-builders-bounty/claude-builders-bounty/issues/5","stated_reward":"$200 (unverified)"},
 {"title":"Agent to review a pull request","url":"https://github.com/claude-builders-bounty/claude-builders-bounty/issues/4","stated_reward":"$150 (unverified)"},
 {"title":"Recipe for GTX 1080 Ti","url":"https://github.com/sybil-solutions/local-ai-registry/issues/218","stated_reward":"$50 (unverified)"},
 {"title":"Attachment Summarizer Service","url":"https://github.com/warpspeedopen-source/warpspeed-bounties/issues/1","stated_reward":"$960 (unverified)"},
]
def amount(text):
 m=re.search(r'\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)',text or '')
 return f"${m.group(1)} (advertised, unverified)" if m else "No explicit amount found"
def parse_items(items):
 out=[]; seen=set()
 for x in items:
  if x.get("pull_request") or x.get("state") not in (None,"open"): continue
  title=str(x.get("title") or ""); body=str(x.get("body") or "")
  if not re.search(r"bounty|reward|paid|payment",title+"\n"+body,re.I): continue
  url=str(x.get("html_url") or "")
  if not url or url in seen: continue
  seen.add(url)
  out.append({"title":title,"url":url,"repository":url.split("/issues/")[0] if "/issues/" in url else "unknown",
              "stated_reward":amount(title+"\n"+body),"status":"CANDIDATE_UNVERIFIED"})
 return out
def fetch(q):
 params=urllib.parse.urlencode({"q":q,"per_page":30,"sort":"updated","order":"desc"})
 req=urllib.request.Request(API+"?"+params,headers={"Accept":"application/vnd.github+json","User-Agent":"GENESE-public-bounty-scanner/1.2"})
 with urllib.request.urlopen(req,timeout=20) as r: data=json.loads(r.read().decode())
 if not isinstance(data.get("items"),list): raise ValueError("Unexpected GitHub API response")
 return data["items"]
def scan(offline=False):
 items=[]; errors=[]; success=0
 if not offline:
  for q in QUERIES:
   try: items.extend(fetch(q)); success+=1
   except Exception as e: errors.append(f"{q}: {type(e).__name__}: {e}")
 return {"scanner":"GENESE public bounty scanner","version":"1.2","checked_at_utc":datetime.now(timezone.utc).isoformat(),
 "live_search":{"attempted":not offline,"source":API,"queries":QUERIES,"successful_queries":success,
 "candidates_found":len(parse_items(items)),"candidates":parse_items(items)[:20],"errors":errors},
 "previously_observed_leads":[dict(x,status="HISTORICAL_LEAD_UNVERIFIED",evidence="Found in initial search; current availability/funding not checked.") for x in HISTORICAL_LEADS],
 "confirmed_payments":0,"note":"No claim, PR submission, or transfer was made. An advertised reward is not proof of funds or guaranteed payment."}
def main():
 p=argparse.ArgumentParser(description=__doc__); p.add_argument("--offline",action="store_true"); p.add_argument("--output")
 a=p.parse_args(); report=scan(a.offline); s=json.dumps(report,ensure_ascii=False,indent=2); print(s)
 if a.output:
  with open(a.output,"w",encoding="utf-8") as f:f.write(s+"\n")
 if not a.offline and report["live_search"]["errors"] and report["live_search"]["successful_queries"]==0:return 2
 return 0
if __name__=="__main__":sys.exit(main())
