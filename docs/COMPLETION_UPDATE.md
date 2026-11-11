# Completion update — 11 November 2026

The local application now has one administrator access level, a refined salon administration interface and a documented 0 DH launch path. No hosted project or real salon database has been connected or deployed.

## Access model

Migration `202611110008_single_admin.sql` converts every existing application profile to equal full administrator access and preserves its active/inactive state. The database rejects creation of any other permission level. The fixed legacy `owner` value remains internally so existing SQL functions and RLS continue to work. The UI and server helpers no longer branch on owner/manager/staff permissions. The last active administrator cannot be disabled.

Every active administrator can manage content, appointments, settings, privacy operations and other accounts. Scheduling staff and equipment remain resources and require no login. Existing account-to-resource links are retained as historical data but are no longer part of the permission model.

The first administrator can be attached to an existing confirmed Supabase Auth user with `npm run owner:create -- --user-id UUID`, avoiding an SMTP dependency for the initial launch. No password is seeded or printed.

## Administration and public UX

The design retains the French beauty-house concept: ivory surfaces, restrained rose accents, serif headings and quiet geometric decoration. Administration now has grouped navigation, current-page indicators, a mobile menu, account identification, content-management cards and a database-backed configuration checklist. Money statistics keep the amount and MAD label readable on narrow cards.

Public pages have a responsive menu and current-page indication, a branded abstract hero when real photography is absent, booking progress indicators and an administration entry in the footer. The fixed mobile basket appears only after selection, keeping the main call to action visible when the basket is empty. Real photographs and business details are still supplied by the salon through the dashboard.

The development-only `/admin/preview` remains read-only, clearly labels fictional data and returns 404 in production. Desktop and mobile screenshots were generated and visually reviewed under ignored `test-results/admin-preview/` and `test-results/final-public/` directories.

## Booking corrections

Guest cancellation, rescheduling and slot requests must now include the booking ID displayed in the tab. The server checks it against the cookie capability before acting, preventing one tab from modifying a different booking opened in another tab.

Migration `202611110009_reschedule_expiry.sql` updates the private-link expiry to 90 days after the revised appointment end. Rescheduling retains transactional rollback and financial snapshots.

## Free deployment preparation

Use [ZERO_DH_LAUNCH.md](ZERO_DH_LAUNCH.md) for the complete setup and cost limits. It recommends Netlify Free, Supabase Free and an included hosting subdomain. `netlify.toml` configures the Next.js build and Node 24. `TRUST_PROXY=netlify` selects the provider connection-IP header; verify forwarding on the actual deployment. Source uploads are capped at 4 MiB to fit the host's buffered binary request limit.

No new application dependency was added and `package-lock.json` is unchanged. Checks used the exact locked packages with a project-local Node 24.22.2 runtime; the system Node installation was not changed. Temporary tooling and caches are ignored by Git. Next.js development generated the repository's `AGENTS.md` guidance file.

## Executed verification

| Check                                                             | Result                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| Strict TypeScript                                                 | Passed                                                          |
| ESLint                                                            | Passed; changed UI/config files checked again after refinements |
| Final production build                                            | Passed                                                          |
| Unit and API regression tests                                     | 18 passed                                                       |
| Disposable PostgreSQL integration suite                           | 28 passed                                                       |
| Full desktop/mobile production browser suite                      | 18 passed; 4 connected Supabase journeys skipped                |
| Final dashboard preview suite                                     | 2 passed                                                        |
| Homepage, selection and navigation rechecked after visual changes | 6 passed                                                        |
| Formatting of final UI refinements / Git whitespace check         | Passed                                                          |

Database tests exercise the original migration behavior before applying the single-admin upgrade and checking equal access, inactive-account rejection and last-admin protection. The rescheduling test also verifies the revised token expiry. Windows test clusters use synchronous I/O so native worker processes shut down cleanly. Tests use disposable data, not a salon database.

## Remaining launch work and limits

Create/connect the real Supabase and Netlify projects, configure secrets and Auth URLs, apply all nine migrations, provision the administrator and enter approved salon data. Verify real authentication, storage uploads, booking persistence, origin/IP forwarding and owner acceptance on the deployed site before opening bookings. The local SQL fixtures do not verify Supabase HTTP integrations or the Netlify adapter.

The first single-admin launch does not need invitation delivery. Before enabling additional-account invitations or email recovery, configure and verify SMTP. Auth invitation and profile creation remain separate operations; a partial failure requires operator inspection/repair before retrying.

Free plans have quotas and can pause service; they are not unlimited production hosting. Arrange private database exports and separate image backups. Pending requests still reserve capacity until manually processed. Automatic booking notifications, payments, reminders and Arabic/English translation are outside this implementation. The earlier IMPLEMENTATION_REPORT.md is a historical report of the initial version; this update describes the current changes.
