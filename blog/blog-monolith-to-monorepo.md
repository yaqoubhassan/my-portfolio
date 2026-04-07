# From Monolith to Monorepo: Scaling AgriTrack Africa

*How we restructured a growing agricultural platform into a monorepo — and why the hardest part was not the tooling.*

---

**Published:** April 2026  
**Author:** Yaqoub  
**Tags:** `Monorepo` `Turborepo` `pnpm` `TypeScript` `Architecture` `Developer Experience`

---

## The Repo That Outgrew Itself

AgriTrack Africa started the way most side projects do: a single repository, a single `package.json`, and the blissful naivety of "we will refactor later."

The initial plan was simple. A NestJS API for the backend, a Next.js dashboard for admins, and eventually a React Native app for farmers in the field. Three concerns. One repo. What could go wrong?

Everything, it turns out.

Within weeks, we had a `src/` folder that mixed API controllers with frontend utility functions. TypeScript interfaces were duplicated across directories. A Zod schema for validating phone numbers lived in `api/src/utils/validation.ts` and a near-identical copy lived in `web/src/lib/validators.ts`. When we fixed a bug in the phone regex, we fixed it in one place and forgot the other. The mobile app, when it arrived, introduced a third copy.

This is the story of how we went from that chaos to a clean monorepo — the decisions we made, the tools we chose, the problems we did not expect, and what we would tell anyone considering the same move.

---

## Part 1: Recognizing the Pain

### The Symptoms

Before you can justify a major restructuring, you need to name the pain. Ours had four symptoms:

**1. Duplicated Validation Logic**

Our phone number schema — `z.string().regex(/^\+?\d{7,15}$/)` — existed in three places. Same for email validation, password rules, and date format checks. Every bug fix was a game of "did I update all the copies?" The answer was usually no.

**2. Diverging TypeScript Interfaces**

The API returned a `User` object with `isActive`, `isVerified`, and `roles`. The web dashboard had its own `User` type that was *almost* identical but used `active` instead of `isActive`. The mobile app had a third variation. Type mismatches caused silent bugs that only surfaced at runtime — the worst kind.

**3. Inconsistent Tooling**

The API used one ESLint configuration. The web app used another. The mobile app had Prettier configured with different settings. Code reviews became arguments about formatting instead of logic. Every developer's IDE was configured slightly differently.

**4. Painful Dependency Management**

When we upgraded Zod in the API, we had to remember to upgrade it in the web app too — and check that the schemas still worked the same way. In separate repos, dependency versions drifted silently. We once spent an afternoon debugging a validation difference that turned out to be Zod 3.21 in the API and Zod 3.19 in the web app.

### The Tipping Point

The moment we decided to act was not dramatic. A developer opened a PR that updated the `FeedingSchedule` interface in the API to add a `frequency` field with the type `'DAILY' | 'TWICE_DAILY' | 'THREE_TIMES_DAILY' | 'WEEKLY'`. The mobile app was still using `'daily' | 'weekly'` — lowercase, fewer options. The web dashboard had no type for it at all and was just passing `string`.

Three apps. Three versions of the same concept. Zero compile-time safety across them.

We blocked a full day and started the migration.

---

## Part 2: Choosing the Tools

### Why pnpm Workspaces

We evaluated three workspace solutions: npm workspaces, Yarn (Berry) workspaces, and pnpm workspaces.

**npm workspaces** were the simplest option, but npm's flat `node_modules` hoisting caused phantom dependency issues — packages could accidentally import dependencies they did not declare because a sibling package had hoisted them. In a monorepo with four apps, this was a non-starter.

**Yarn Berry** (with Plug'n'Play) was technically impressive but introduced friction with tools that expected a `node_modules` directory. React Native and Expo, in particular, had compatibility issues with PnP at the time. We did not want to fight our tools.

**pnpm** hit the sweet spot. Its content-addressable store means dependencies are never duplicated on disk. Its strict linking strategy means a package can only import what it explicitly declares in its own `package.json` — no phantom dependencies. And it worked out of the box with every tool in our stack: NestJS, Next.js, Expo, TypeORM, everything.

The workspace configuration was minimal:

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Two lines. That is the entire workspace definition.

### Why Turborepo

A monorepo without a build orchestrator is just a monolith with extra directories. You need something that understands the dependency graph between packages and can run tasks in the right order, in parallel where possible, and skip work that has not changed.

We chose Turborepo over Nx for three reasons:

1. **Zero configuration to start.** Nx requires generators, plugins, and project graphs. Turborepo reads your `package.json` scripts and just works.
2. **Remote caching is trivial.** We are not using it yet, but when CI times grow, enabling Vercel remote cache is a single environment variable.
3. **It stays out of your way.** Turborepo does not own your build — it orchestrates it. Each app still uses its native toolchain (Next.js builds Next.js, NestJS builds NestJS). Turborepo just decides what to run and when.

Our `turbo.json` is under 30 lines:

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "check-types": {}
  }
}
```

The `"dependsOn": ["^build"]` line is the magic. It says: before building any package, first build all of its workspace dependencies. So if `web` depends on `@ata/shared`, Turborepo builds `shared` first, then `web` — automatically. No manual ordering. No Makefile. No custom scripts.

---

## Part 3: The Migration — Step by Step

### Step 1: Draw the Dependency Graph

Before touching a single file, we drew the dependency graph on a whiteboard. Which code was shared? Which was app-specific? Where were the boundaries?

The answer was clearer than expected:

```
                  ┌──────────┐
                  │  shared   │  ← Zod schemas, TS types, constants, API client
                  └────┬─────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
     ┌────▼───┐  ┌────▼───┐  ┌────▼────┐
     │  api   │  │  web   │  │ mobile  │
     └────────┘  └───┬────┘  └─────────┘
                     │
                ┌────▼───┐
                │   ui   │  ← Radix components (web + docs only)
                └────────┘
```

The `shared` package was the clear centerpiece. It needed to export:
- **Zod schemas** — validation logic used everywhere
- **TypeScript types** — inferred from those schemas, plus standalone interfaces
- **Constants** — role names, species enums, frequency options
- **API client utilities** — Axios-based query functions for frontend apps

The `ui` package was web-only (React DOM components built on Radix UI). The mobile app uses React Native and has its own component system via NativeWind.

Two more packages emerged for tooling: `eslint-config` (shared linting rules) and `typescript-config` (shared `tsconfig.json` bases).

### Step 2: Extract the Shared Package

This was the most tedious step. We went through every file in the API, web, and mobile apps, looking for duplicated logic.

The extraction followed a rule: **if it exists in two or more apps and is not UI-specific, it belongs in `shared`.**

The result:

```
packages/shared/
├── src/
│   ├── schemas/       # Zod validation schemas
│   │   ├── auth.ts    # login, register, OTP, password reset
│   │   ├── farm.ts    # farm creation, update
│   │   ├── animal.ts  # animal registration, transfer
│   │   └── index.ts
│   ├── types/         # TypeScript interfaces
│   │   ├── user.ts
│   │   ├── farm.ts
│   │   ├── api.ts     # API response envelope types
│   │   └── index.ts
│   ├── constants/     # Enums and magic strings
│   │   ├── roles.ts
│   │   ├── species.ts
│   │   └── index.ts
│   └── utils/         # Shared utility functions
│       ├── format.ts  # Currency formatting (pesewas → GHS)
│       └── index.ts
├── package.json
└── tsconfig.json
```

The `package.json` uses the `exports` field to expose subpaths:

```json
{
  "name": "@ata/shared",
  "exports": {
    "./schemas": "./src/schemas/index.ts",
    "./types": "./src/types/index.ts",
    "./constants": "./src/constants/index.ts",
    "./utils": "./src/utils/index.ts"
  }
}
```

Now every app imports with clarity:

```typescript
import { loginSchema, registerSchema } from '@ata/shared/schemas';
import { User, Farm, ApiResponse } from '@ata/shared/types';
import { RoleName, Species } from '@ata/shared/constants';
```

No more guessing where a type comes from. No more duplicated definitions. The TypeScript compiler enforces the contract — if the API changes the `User` type in `shared`, the web and mobile apps fail to compile until they handle the change.

### Step 3: Unify Tooling Packages

We created two infrastructure packages:

**`@ata/eslint-config`** — a single ESLint configuration extended by every app. We defined a base config and app-specific overrides:

```javascript
// packages/eslint-config/base.js
module.exports = {
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    // ... shared rules
  },
};
```

Each app extends the base and adds its own rules. The web app and mobile app enforce `--max-warnings 0` — zero warnings allowed. This is strict, but it means warnings never accumulate into a backlog nobody cleans up.

**`@ata/typescript-config`** — shared `tsconfig.json` bases for different contexts:

```
packages/typescript-config/
├── base.json          # Strict mode, ES2022 target
├── nestjs.json        # Extends base + experimentalDecorators
├── nextjs.json        # Extends base + JSX preserve
└── react-native.json  # Extends base + JSX react-native
```

Each app's `tsconfig.json` is now five lines:

```json
{
  "extends": "@ata/typescript-config/nextjs.json",
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

This eliminated an entire class of bugs. Before the migration, the API had `strict: true` but the web app had `strict: false`. Types that were safe in one context were dangerous in another. Now, strictness is uniform.

### Step 4: Wire Up CI

The last step was updating our GitHub Actions pipeline to understand the monorepo structure. The key insight: **not every job needs to run on every change.**

```yaml
- name: Lint changed packages
  run: pnpm turbo run lint --filter="...[origin/main...HEAD]"

- name: Typecheck changed packages
  run: pnpm turbo run check-types --filter="...[origin/main...HEAD]"
```

Turborepo's `--filter` flag with the `...[origin/main...HEAD]` syntax means: "find all packages that have changed between `main` and the current branch, plus all packages that depend on them, and run the task on those."

Change a file in `shared`? Lint all four apps (because they all depend on `shared`). Change a file in `mobile`? Lint only `mobile`. The dependency graph does the thinking for you.

But — and this is important — we run **security jobs against the full codebase every time**:

```yaml
- name: Secret detection
  run: npx secretlint "apps/**/*.{ts,tsx,js,json,env*}" "packages/**/*.{ts,tsx,js,json,env*}"

- name: SAST scan
  run: semgrep scan --config auto --error
```

Security scanning is not something you skip because "those files didn't change." A newly committed file in an unrelated app could still contain a hardcoded secret. We scan everything, every time.

---

## Part 4: The Problems We Did Not Expect

### Problem 1: The Shared Package Became a Bottleneck

Once `shared` existed, every developer's first instinct was to put everything there. Utility functions, React hooks, API response transformers, date formatting helpers — if two apps might use it, into `shared` it went.

Within a month, `shared` was a junk drawer. Worse, because every app depended on it, every change to `shared` triggered lint and typecheck across the entire monorepo. The performance benefit of incremental builds disappeared.

**The fix:** We established a rule. Code goes into `shared` only if it meets *all three* criteria:

1. It is used by **two or more** apps today (not "might be used someday")
2. It is **platform-agnostic** (no React DOM, no React Native, no Node-specific APIs)
3. It is **stable** (not changing weekly)

This immediately moved several things out of `shared` and back into their respective apps. The shared package shrank, and incremental builds became fast again.

### Problem 2: Circular Dependency Nightmares

We almost created a circular dependency when the `ui` package imported types from `shared`, and someone tried to import a UI component utility back into `shared`. pnpm caught this immediately with a clear error, but it was a sign that our dependency graph needed explicit boundaries.

We added a comment at the top of each package's `package.json`:

```json
{
  "name": "@ata/shared",
  "//dependencies": "shared MUST NOT depend on ui, web, mobile, or api"
}
```

Not enforceable by tooling, but visible to every developer who opens the file. Combined with code review, it has been enough.

### Problem 3: IDE Performance With Large Workspaces

VS Code's TypeScript language server struggled with the monorepo initially. It was trying to typecheck every package simultaneously, and the memory usage spiked past 4GB.

The fix was configuring TypeScript project references and ensuring each app's `tsconfig.json` only included its own source files. We also added a root-level `tsconfig.json` that acts as a "solution" file, pointing to each package:

```json
{
  "references": [
    { "path": "apps/api" },
    { "path": "apps/web" },
    { "path": "apps/mobile" },
    { "path": "packages/shared" },
    { "path": "packages/ui" }
  ]
}
```

This told TypeScript: "these are separate projects that reference each other." The language server stopped trying to load everything at once, and IDE responsiveness returned to normal.

### Problem 4: Docker Build Context

When we containerized the API for deployment, we hit an issue: the Dockerfile's build context needed access to `packages/shared` (because `api` depends on it), but the Dockerfile lived in `apps/api/`.

The solution was building from the repository root with a targeted Dockerfile:

```bash
docker build -f apps/api/Dockerfile .
```

The Dockerfile copies the entire workspace structure, installs dependencies with `--frozen-lockfile`, and uses Turborepo's `prune` command to strip everything the API does not need:

```dockerfile
FROM node:20-slim AS pruned
COPY . .
RUN npx turbo prune @ata/api --docker
```

`turbo prune` generates a minimal workspace containing only `api` and its transitive dependencies (`shared`). The final image is small and contains nothing from `web`, `mobile`, or `ui`.

---

## Part 5: The Payoff

### Developer Experience

Before the migration, onboarding a new developer meant: "clone three repos, make sure the TypeScript versions match, copy the `.env.example` files, and pray." Now it is:

```bash
git clone <repo>
pnpm install
pnpm dev
```

One command starts the API, the web dashboard, the mobile dev server, and the docs site — all in parallel, all with hot reload, all sharing the same types and schemas.

### Type Safety Across the Stack

This is the single biggest win. When we added the `AGRONOMIST` role to the `RoleName` enum in `shared`, the TypeScript compiler immediately flagged every switch statement in the web dashboard and mobile app that did not handle the new case. No runtime errors. No forgotten code paths. The compiler told us exactly what to update.

When we changed the `FeedingSchedule` frequency options from four values to five, every form dropdown across every app was updated in the same PR. One change, one review, one merge — and the entire platform is consistent.

### Build Performance

With Turborepo caching, a typical PR that touches one app takes **under 90 seconds** to lint and typecheck in CI. Without caching, the same pipeline takes over four minutes. On a team pushing multiple PRs per day, this adds up.

Local development is even faster. `turbo run build` skips packages whose source files have not changed since the last build. After the initial build, incremental builds complete in seconds.

### Dependency Hygiene

pnpm's strict isolation means we catch dependency issues at install time, not at runtime. When a developer tried to use `dayjs` in the `ui` package without adding it to `ui`'s `package.json`, pnpm refused to resolve it — even though `shared` had `dayjs` installed. This strict behavior is annoying for about five minutes and then saves you hours of debugging phantom import issues.

---

## Part 6: Lessons for Your Monorepo Migration

If you are considering a similar move, here is what we would tell you:

### 1. Migrate Incrementally, Not All at Once

We did not restructure everything in one weekend. We started by extracting the `shared` package and pointing all three apps at it. The apps still lived in their original directory structure for two more weeks while we validated that nothing broke. Only then did we move them into `apps/`.

### 2. The Shared Package Is Not a Dumping Ground

Define clear criteria for what belongs in `shared`. Our rule — used by 2+ apps, platform-agnostic, and stable — has served us well. Without it, `shared` becomes the new monolith.

### 3. Invest in Tooling Packages Early

The `eslint-config` and `typescript-config` packages feel like overkill when you have two apps. By the time you have four, they are essential. Unified linting and type-checking rules eliminate entire categories of code review friction.

### 4. Your CI Must Understand the Graph

Running every check on every package on every PR is the monolith approach to CI. Use your build orchestrator's filtering to run only what is affected by the change. But never skip security scans — those always run against everything.

### 5. Document the Dependency Rules

Write down which packages can depend on which. Put it in the README, in the `package.json` comments, wherever developers will see it. Circular dependencies in a monorepo are exponentially harder to untangle than in separate repos.

### 6. Pre-Commit Hooks Are Non-Negotiable

We use Husky + lint-staged to run ESLint on staged files and commitlint to enforce conventional commit messages. In a monorepo where one bad commit can affect multiple apps, pre-commit hooks are your last line of defense before code enters the shared history.

---

## Where We Are Now

The ATA monorepo houses four applications and four shared packages. A single `pnpm install` sets up the entire development environment. A single PR can update a Zod schema and propagate the change to the API, the dashboard, and the mobile app — with the compiler verifying every consumer.

The migration was not painless. It took planning, discipline, and a few weeks of untangling dependencies. But the result is a codebase where changes are safe, builds are fast, and every developer works with the same tools, the same types, and the same source of truth.

If your project has outgrown the single-repo approach — if you are copying types between apps, fighting inconsistent tooling, or debugging drift between shared logic — the monorepo is not overkill. It is the obvious next step.

The hard part is not choosing Turborepo or pnpm. The hard part is having the discipline to keep the shared layer clean, the dependency graph acyclic, and the CI pipeline honest. The tools are just tools. The architecture is a team decision.

---

*This is Part 1 of a series on building AgriTrack Africa. Part 2 covers our security architecture, offline-first mobile strategy, and the debounce pattern that saved us from email floods.*

*Have questions about monorepo migrations? Reach out — I have opinions and I am happy to share them.*
