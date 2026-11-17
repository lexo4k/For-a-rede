# WYNCORE

Private, single-owner opportunity and earnings workspace.

## Product rules
- Single-owner workspace. No public participant registration, teams, or referral hierarchy.
- Catalogue for legitimate, externally funded work and campaigns.
- Task tracking from review through provider confirmation and receipt.
- Separate estimates, confirmed receivables, and received amounts.
- No deposits, paid upgrades, recruitment commissions, fabricated balances, or guaranteed earnings.
- Payment integrations stay disabled until an eligible adult business owner and a verified provider configure them lawfully.

## Current implementation
- Responsive dashboard with Overview, Opportunities, Tasks, Wallet, and Reports.
- Manual opportunity registration with HTTPS URL validation.
- Task status tracking and CSV export.
- Local browser persistence using localStorage.
- PWA manifest, app icon, and service-worker shell cache for offline reopening.
- GitHub Actions syntax and required-file checks.

This is still a local prototype. It has no account system, server database, automatic opportunity feed, advertiser integration, task execution, payment reconciliation, or money transfer. Values entered in the UI are records only and are not funds or proof of payment.

## Run
Serve the `wyncore/` directory over HTTPS or localhost, then open `index.html`. Service workers and installable PWA behavior require a secure context. Opening the file directly may work for basic UI but disables offline/PWA registration.

## Next engineering stages
1. Server-side authentication and authorization.
2. Database with auditable, append-only financial events.
3. Verified provider integrations and task evidence.
4. Provider-backed payment reconciliation.
5. Automated browser tests, deployment, and Android packaging.

## Security and compliance
Never put API secrets, bank credentials, private keys, or payment tokens in frontend code or Git. Use test data until backend, provider eligibility, and legal/business arrangements are reviewed. Financial accounts and payment-provider onboarding must follow age and identity requirements and involve a responsible adult where required.
