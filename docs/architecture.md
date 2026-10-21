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

- Presentation tier: Keep API URL construction and fetch behavior in the shared client. Each capability component renders its own API-backed content and accessible loading, empty, success, and error states; do not move business rules into React.
- Logic tier: Implement behavior in explicit service functions, with routes limited to translating HTTP requests into service calls and deliberate responses. Validate request data and references before database writes so malformed IDs and missing records produce 4xx responses rather than cast errors.
- Data tier: Enforce required fields and sensible constraints in Mongoose schemas. Keep persistence in models/services and use the shared database configuration. The seed script must remain idempotent, use upserts for stable demo records, and preserve unrelated user data.
- Activity tracking: Accept `userId`, `teamId`, `type`, and positive `minutes`; validate ID shape and existence of both references before creating an activity. Store the corresponding user/team references, compute points from minutes, and set `occurredAt` when creating the record.
- Team management: List teams with their submitted names, mascots, and members. Creation requires a non-empty name and preserves the accepted team fields and member references.
- Leaderboard: Aggregate activity points per team, order entries by total points descending, and assign ranks starting at 1.
- Workout suggestions: Find the requested user by email; return a deliberate 4xx if no user matches. Recommend available workouts aligned with the user's fitness goal or recent activity, and include a human-readable reason for the first recommendation.

## Test plan

Run tests in dependency order: data contracts, API contracts, then frontend contracts. A failure indicates a contract gap in that tier (or a lower tier it depends on); run both builds after the tests pass to catch TypeScript and bundling errors.

- Data tier — `npm run test:data --prefix octofit-tracker/backend`: **run; currently fails 4 of 5 tests.** User, team, activity, and workout schema validation is missing; the seed/idempotency test passes.
- API — `npm run test:api --prefix octofit-tracker/backend`: **run; currently fails all 4 tests.** Activity and team creation return `501` instead of validating input, the leaderboard is empty, and workout suggestions lack the expected reason/matching behavior.
- Frontend — `npm test --prefix octofit-tracker/frontend`: **run; currently fails all 15 tests.** Capability pages remain placeholders and do not render API data or the required loading, empty, and error states.
- Backend build — `npm run build --prefix octofit-tracker/backend`: run after the backend contracts pass; a failure indicates a backend TypeScript compilation error. **Not run yet.**
- Frontend build — `npm run build --prefix octofit-tracker/frontend`: run after the frontend contract passes; a failure indicates a TypeScript or Vite production-build error. **Not run yet.**
