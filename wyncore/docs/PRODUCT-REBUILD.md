# WYNCORE Platform Rebuild

## Product direction
Rebuild WYNCORE as an integrated activity and participant platform inspired by the publicly described workflow of SL, while keeping WYNCORE's own identity, code, content, and operating rules. This replaces the previous "public opportunities / job links / generic Pix" product direction.

## Core participant experience
1. Account request, login, profile, notifications, and activity history.
2. Home dashboard with current level, assigned activities, pending reviews, and recent updates.
3. Native activity catalog managed inside WYNCORE. Activities have title, description, category, instructions, availability, deadlines, eligibility, and status. No mandatory external source URL.
4. Native video/content library. Admin uploads or manages authorized media inside the platform; video playback is part of the activity page, not a pasted-link workflow.
5. Activity lifecycle: available -> requested/assigned -> in progress -> submitted -> approved/rejected. Participants submit evidence in-platform; reviewers add notes.
6. Progression levels SL1-SL9 as WYNCORE levels, with visible, published criteria and a complete progression history.
7. Teams and invitations as account/coordination features, not paid recruitment.
8. Personal profile, support, notifications, and searchable history.

## Admin and operations
1. Admin creates, edits, schedules, pauses, and archives activities.
2. Admin manages videos and supporting materials.
3. Admin assigns activities or publishes them to eligible participants.
4. Review queue for evidence with approve/reject/request-correction actions and audit trail.
5. Participant management, role permissions, team management, level criteria, and moderation.
6. Reports for activity completion, review times, participation, and team progress.
7. System health, storage, audit, and operational settings in one admin area.

## Explicit removals from the previous product direction
- Public job/apprenticeship/stage directories and unrelated guide pages.
- Manual external campaign/source URL as a required field.
- Generic Pix setup and unrelated Pix proof screen.
- Generic ad-network/webhook setup as a prerequisite for core app operation.
- Cryptocurrency/mining references and unrelated public opportunity messaging.
- Separate modules that duplicate the same activity workflow.

## Architecture requirements
- One canonical activity model used by catalog, assignments, videos, review queue, dashboard, and reports.
- Media stored through a server-side storage adapter; never require participants to paste video URLs.
- Role-based authorization enforced by the server, not only hidden UI.
- Durable database with transactional updates and concurrency protection; current whole-document JSON/blob persistence is not sufficient for a multi-user production workflow.
- Audit events for account, activity, review, level, team, and admin changes.
- Responsive mobile-first UI and installable PWA.
- No hard-coded secrets or credentials in client assets.
- All integrations optional and clearly reported; core activities must work without connecting third-party campaign links.

## Financial and safety boundary
This rebuild does not create fake balances, promise earnings, automate payouts, or reward ad clicks/views or recruitment. Any future real-money program would require an independently verified lawful business model, adult/legal operator authorization, contracts, provider approval, age/eligibility checks, and tested reconciliation. Until then, progression and wallet-like history are non-monetary operational records only.

## Acceptance criteria
- A participant can register, sign in, see eligible activities, watch platform-hosted/authorized content, submit evidence, receive a decision, and see progression/history without pasting external links.
- An admin can create and publish an activity, attach authorized media, assign/publish it, review submissions, manage levels and teams, and export reports without configuring Pix or ad-network integrations.
- Every state transition is validated server-side and audited.
- Automated tests cover permissions, duplicate submissions, review decisions, level criteria, team access, and media authorization.
- Production deployment is not declared complete until tests pass and the deployed build is smoke-tested.
