# Security Specification & Payload-First TDD (`security_spec.md`)

## 1. Data Invariants

1. **Private Household Profiles (`/users/{userId}`)**:
   - Only the authenticated, email-verified owner (`request.auth.uid == userId`) can `get`, `create`, `update`, or `delete` their household profile.
   - `list` is strictly denied to prevent user enumeration or PII/profile scraping.
   - `uid` is immutable after creation and must match `request.auth.uid`.
   - `createdAt` is immutable (`request.time` on create; unchanged on update), and `updatedAt` must equal `request.time`.
   - Every string field has strict `.size()` bounds; arrays (`sensitiveGroups`, `indoorGear`) are bounded (`<= 4` and `<= 6`) with first-element type checks when non-empty.

2. **Saved Routines (`/users/{userId}/routines/{routineId}`)**:
   - Master Gate: Parent `/users/{userId}` document MUST exist (`exists(...)`) and belong to `request.auth.uid`.
   - `uid` must match `request.auth.uid` and `userId`, and remain immutable.
   - `list` is explicitly enforced via `resource.data.uid == request.auth.uid` (no `get()` inside `allow list`).
   - All numeric metrics (`aqiAtGeneration`, `pm25AtGeneration`, `estimatedPm25ReductionPct`, `estimatedWeeklyCo2SavedKg`) are bounded to realistic physical ranges.

3. **Public Community Pledges (`/community_pledges/{pledgeId}`)**:
   - Contains zero PII (no email, phone, address). Only `displayAlias`, `city`, `category`, `actionTitle`, `impactExplanation`, `weeklyCo2SavedKg`, `supportersCount`, `visibility`.
   - `allow get, list` strictly checks `resource.data.visibility == 'public'` (no client delegation).
   - `create` requires verified auth, `authorUid == request.auth.uid`, `supportersCount == 1`, `visibility == 'public'`, and `createdAt == request.time`.
   - `update` is partitioned into two explicit actions:
     - **Support Action**: Any verified user can increment `supportersCount` by exactly `+1` (`affectedKeys().hasOnly(['supportersCount', 'updatedAt'])`).
     - **Author Edit Action**: Only `existing().authorUid == request.auth.uid` can update `actionTitle`, `impactExplanation`, `category`, `weeklyCo2SavedKg`, `updatedAt`.
   - `delete` is strictly restricted to `existing().authorUid == request.auth.uid`.

4. **Public Smog Reports (`/smog_reports/{reportId}`)**:
   - Contains zero PII. `allow get, list` strictly checks `resource.data.visibility == 'public'`.
   - `create` requires verified auth, `authorUid == request.auth.uid`, `helpfulCount == 1`, `visibility == 'public'`, `createdAt == request.time`.
   - `update` is partitioned into:
     - **Helpful Vote Action**: Any verified user can increment `helpfulCount` by `+1` (`affectedKeys().hasOnly(['helpfulCount', 'updatedAt'])`).
     - **Author Edit Action**: Only `existing().authorUid == request.auth.uid` can edit `neighborhood`, `severity`, `observedSource`, `note`, `updatedAt`.
   - `delete` is strictly restricted to `existing().authorUid == request.auth.uid`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Identity Spoofing on Profile Create**: User A attempts `create` at `/users/userB` with `{ uid: "userB", ... }`. -> **MUST FAIL (`PERMISSION_DENIED`)**.
2. **Shadow / Privilege Ghost Field on Profile**: User A creates `/users/userA` with extra field `isAdmin: true` or `role: "moderator"`. -> **MUST FAIL via `hasOnly()`**.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create a `community_pledges` doc. -> **MUST FAIL**.
4. **Path ID Poisoning**: User attempts `create` at `/community_pledges/` with a 300-character ID or invalid characters (`../bad$id`). -> **MUST FAIL via `isValidId()`**.
5. **Orphaned Subcollection Write**: User A tries to create `/users/userA/routines/r1` before `/users/userA` exists. -> **MUST FAIL via Master Gate `exists()`**.
6. **Temporal Forgery**: User submits `createdAt` backdated to 2020 instead of `request.time`. -> **MUST FAIL via `incoming().createdAt == request.time`**.
7. **Immutable Owner Tampering**: User A updates `savedRoutine` attempting to change `uid` or `createdAt`. -> **MUST FAIL**.
8. **Supporter Counter Jump Attack**: User B updates `/community_pledges/p1` setting `supportersCount: 9999` instead of `existing().supportersCount + 1`. -> **MUST FAIL**.
9. **Value Poisoning on Whitelisted Key**: User A updates `actionTitle` on their pledge with a 5,000-character string or a boolean `true`. -> **MUST FAIL via `isValidCommunityPledge(incoming())`**.
10. **Unauthorized Blanket List on Users**: User A tries `list` on `/users`. -> **MUST FAIL**.
11. **Visibility Tampering on Public Feed**: User creates a `smog_reports` doc with `visibility: "private"` or updates `visibility`. -> **MUST FAIL**.
12. **Array Resource Exhaustion**: User submits `indoorGear` with 50 items or non-string elements. -> **MUST FAIL via bounded size and type checks**.
