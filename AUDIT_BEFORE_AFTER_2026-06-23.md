# Vinayaka Transport - Before/After Audit (2026-06-23)

## Scope Executed In This Pass
- Workspace API (`services/api`) runtime and OTP authentication path.
- Rider portal OTP UX and fallback messaging.
- Local startup diagnostics and resilience.
- Twilio console reachability check from shared browser session.

## Before Fixes
- API local dev startup failed when port `4000` was occupied (`EADDRINUSE`), causing the service to crash.
- OTP request/verify used inconsistent phone normalization (`sanitizeText` in rider flow vs `normalizePhone` in customer flow), which could cause OTP mismatch/failures.
- OTP provider errors were passed through as raw Supabase messages, making it difficult to identify whether Twilio/Supabase Phone Auth was disabled.
- Rider portal only handled one OTP provider error phrase, so fallback guidance was not shown for other common provider messages.
- Twilio console page could be opened, but page content was blank in this automation session, so no authenticated settings changes could be performed from here.

## Implemented Fixes

### 1) API startup resilience
- File: `services/api/src/dev-server.ts`
- Added automatic fallback to the next available port when `EADDRINUSE` is encountered.
- Added bounded retry attempts (`maxPortAttempts = 10`) with explicit startup error logging.
- Fixed duplicate startup logs by clearing stale listeners before each retry.

### 2) OTP reliability and diagnostics
- File: `services/api/api/[...all].ts`
- Strengthened `normalizePhone` to canonical E.164-style output.
  - Preserves `+` prefix correctly.
  - Auto-normalizes 10-digit local numbers to `+91`.
- Switched rider OTP request/verify to use `normalizePhone` (matching customer OTP behavior).
- Added `mapOtpProviderError()` to translate Supabase/Twilio provider errors into actionable messages.
- Applied mapped error responses to:
  - `handleRiderRequestOtp`
  - `handleRiderVerifyOtp`
  - `handleCustomerRequestOtp`
  - `handleCustomerVerifyOtp`

### 3) Rider OTP UX fallback
- File: `apps/rider-portal/src/app/page.tsx`
- Expanded OTP provider-error detection logic to cover more provider failure strings.
- Updated fallback message to guide operators toward Supabase Phone Auth + Twilio Verify setup while enabling password fallback.

## Validation Results (After)
- `npm run build --workspace @vinayaka/api`: PASS
- `npm run build --workspace @vinayaka/rider-portal`: PASS
- `npm run build --workspace @vinayaka/admin-portal`: PASS
- `npm run build --workspace @vinayaka/operations-portal`: PASS
- `npm run build --workspace @vinayaka/tracking-portal`: PASS
- `npm run build`: PASS across all workspaces
- `npm run dev:api` with `API_PORT=4000` while 4000 occupied:
  - Expected log observed: `Port 4000 is already in use. Retrying on 4001...`
  - Service started on `4001` successfully.

## Remaining Blockers For Full OTP Production Readiness
- Supabase Auth Phone provider must be enabled in your actual project settings.
- Twilio Verify credentials must be configured in Supabase Auth provider settings:
  - Account SID
  - Auth Token
  - Verify Service SID
- Phone number sender/country policies in Twilio must allow your target destinations.
- Real OTP end-to-end test required with a real device number in production-like environment.
- `npm audit` still reports 2 dependency vulnerabilities in the tracking portal install path; these need a follow-up dependency review before public release.

## Notes About Twilio Console Access
- URL opened: `https://console.twilio.com/?overrideTreatment=post-signup-dev`
- This session could not read authenticated page contents (blank snapshot), so direct account-side changes were not possible from here.

## Next Execution Batch Recommended
1. Run end-to-end OTP tests against staging (request + verify for rider and customer).
2. Audit and harden refresh/session flows across all portals.
3. Execute full multi-app build/test matrix and compile a unified release gate report.
4. Continue with tracking stack migration and production map/routing implementation.
