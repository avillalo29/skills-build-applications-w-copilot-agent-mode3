# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- **Presentation tier:** Keep API URL construction and fetch/error handling in `frontend/src/api/client.ts`. Capability pages call the shared client and render semantic headings/lists plus accessible loading (`role="status"`), error (`role="alert"`), empty, and populated states. Pages display server-provided results; they do not calculate points, rankings, or workout relevance.
- **Logic tier:** Keep HTTP handlers in `backend/src/routes/api.ts` thin: invoke service functions, select the success status/body, and forward errors to the app error handler. Services own input validation, reference lookups, point calculation, leaderboard ordering, and workout matching. Invalid request fields or malformed IDs return `400`; well-formed IDs that reference missing records and unknown user emails return `404`; database cast errors must not be used as request validation.
- **Data tier:** Mongoose schemas require user identity and fitness goal, team name and mascot, all activity fields, and workout title/focus/duration/difficulty. Names and string fields are trimmed; email is normalized to lowercase; minutes must be positive; a team's members default to an empty array. Activity creation explicitly sets `occurredAt`. Persistence uses the shared database configuration. The seed script uses stable upserts, removes a demo user's old team membership when moving that fixture, and never clears unrelated records.
- **Activity tracking:** Accept `userId`, `teamId`, `type`, and positive finite `minutes`. Check 24-character hexadecimal ID shape before querying, then confirm that both the user and team exist. Store the matching references and trimmed activity type; use minutes as the points value and set the creation timestamp.
- **Team management:** Return each team's name, mascot, and member references. Creation rejects an empty name or mascot, validates member ID shapes and existence, and preserves the accepted fields without silently dropping invalid references.
- **Leaderboard:** Sum activity points for each team, include teams with no activity at zero points, sort by total points descending (team name breaks ties deterministically), then assign 1-based sequential ranks.
- **Workout suggestions:** Resolve the requested email case-insensitively and return `404` when no user matches. Prefer workouts matching the user's goal and latest activity focus, using activity-type-to-focus matching for common endurance, strength, and mobility activities. Return a human-readable reason with every suggestion and rank matching workouts before other available workouts.
- **Security and scope:** The API remains unauthenticated for this exercise. Do not add authentication; it remains a follow-up challenge.

## Test plan

Run the contract suites in dependency order: data, API, then frontend. A lower-tier failure can invalidate a higher-tier result, so fix and rerun the earliest failing tier first. Once all contracts pass, run both builds to catch backend TypeScript and frontend TypeScript/bundling errors.

- Data tier — `npm run test:data --prefix octofit-tracker/backend`: checks schema requirements and seed idempotency/data preservation. **Latest run: passed, 5/5 tests.**
- API — `npm run test:api --prefix octofit-tracker/backend`: checks activity/team validation and creation, leaderboard totals/ranks, and user-specific workout suggestions. **Latest run: passed, 4/4 tests.**
- Frontend — `npm test --prefix octofit-tracker/frontend`: checks API-backed capability content and accessible loading, empty, and error states. **Latest run: passed, 15/15 tests.**
- Backend build — `npm run build --prefix octofit-tracker/backend`: TypeScript compile check. **Latest run: passed.**
- Frontend build — `npm run build --prefix octofit-tracker/frontend`: TypeScript compile check and Vite production bundle. **Latest run: passed.**
