# WYNCORE

Private, single-owner opportunity and earnings workspace.

## Scope
- Single-owner dashboard; no public participant registration or referral hierarchy.
- Opportunity catalogue for legitimate, externally funded work and campaigns.
- Task status tracking: discovered, reviewed, applied, completed, awaiting provider confirmation, paid.
- Ledger separates estimates, confirmed receivables, and received payments.
- No deposits, paid upgrades, recruitment commissions, simulated balances, or guaranteed earnings.
- Payment integrations remain disabled until an eligible adult business owner and a verified provider configure them lawfully.

## Current stage
Initial responsive frontend prototype. Data is stored in this browser only. It does not connect to advertisers, execute paid tasks, create receivables, or transfer money.

## Run
Open `index.html` in a browser. No build step is required.

## Next engineering stages
1. Backend authentication and server-side authorization.
2. Database with immutable ledger entries and audit trail.
3. Verified opportunity-provider integrations and evidence of task completion.
4. Provider-backed payment reconciliation; no client-side balance mutation.
5. Automated tests, deployment, and Android packaging.

## Safety and privacy
Never put API secrets, bank credentials, private keys, or payment tokens in frontend code or Git. Use test data only until the backend and legal/business arrangements are reviewed.
