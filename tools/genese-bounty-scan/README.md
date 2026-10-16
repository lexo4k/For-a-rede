# GÊNESE Public Bounty Scanner
Searches public GitHub issues for possible paid open-source work. Five leads observed in the first search are preserved separately as historical and unverified examples.

Run:
```bash
python -m unittest -v
python genese_bounty_scan.py --output scan-results.json
```
Use `--offline` to print the historical leads without attempting internet access.

GitHub Actions supports manual runs in the repository's Actions tab and a weekly scheduled run. It runs tests, attempts the live GitHub API search, and uploads the JSON report.

Important: advertised rewards are not proof of reserved funds or guaranteed payout. Historical leads may be closed or unavailable. The scanner does not claim issues, comment, submit code, access payment accounts, or transfer money. Review task rules and approval requirements and verify any actual payout independently. This tool does not connect to Mercado Pago or generate income by itself.
