# Architecture

This document defines the architectural rules for this project. Every feature must follow these conventions.

---

## Module Decomposition

The codebase is split into three domain modules plus a shared layer:

```
src/
├── modules/
│   ├── auth/          # Authentication, user profile, session
│   ├── interview/     # Core domain: rooms, assessments, roadmap, skills
│   └── payments/      # Coins, balance, subscriptions, assessment passes
├── widgets/           # Cross-module compositions (assembled from parts of different modules)
└── shared/            # Cross-module primitives
```

**Rule**: code lives in the module that owns the subdomain. If something is used by 2+ modules, it goes into `shared/`. If a page or block is assembled from parts of different modules, it belongs at the top-level `widgets/`.

---

## FSD Concepts: Layers, Slices, Segments

This project applies FSD (Feature Sliced Design) within each module. Three terms to internalize:

- **Layer** — a top-level folder inside the module: `entities/`, `features/`, `widgets/`, `pages/`, `shared/`
- **Slice** — a domain subject inside a layer: `entities/assessment/`, `features/close-assessment/`, `pages/roadmap/`
- **Segment** — what's inside a slice: `ui/`, `model/`, `config/`

`model` is always a **segment**, never a layer. It lives inside a slice, not at the module root.  
`pages/` is a **layer** — each page inside it is a slice with its own segments.

---

## Module Internal Structure

Every module follows FSD layering internally. The key rule is **Local First**: start by writing everything directly on the page, and only extract to lower layers when real duplication or complexity arises.

```
src/modules/{module}/
├── entities/              # Domain objects: UI + data logic for one business entity
│   └── {entity}/
│       ├── ui/            # Visual representation (card, row, badge, list)
│       │   └── {component}/
│       │       ├── index.tsx
│       │       └── components/   # Local First: private sub-components of this UI
│       │           └── {sub-component}/
│       │               └── index.tsx
│       ├── model/         # Query hooks, query keys, types, store for this entity
│       │   ├── queryKeys.ts
│       │   ├── use{Entity}Query.ts
│       │   └── {entity}.store.ts   # Zustand — only when persistent UI state is needed
│       └── config/        # Entity-specific constants and enums
├── features/              # User actions over entities (complex business scenarios)
│   └── {feature}/
│       ├── ui/            # Form, button, dialog triggering the action
│       │   └── {component}/
│       │       ├── index.tsx
│       │       └── components/   # Local First: private sub-components
│       │           └── {sub-component}/
│       │               └── index.tsx
│       └── model/         # Mutation hook and form logic for this feature
│           └── use{Action}{Entity}.ts
├── widgets/               # Self-contained blocks composing multiple entities + features
│   └── {widget}/
│       ├── ui/
│       │   ├── index.tsx
│       │   └── components/       # Local First: private sub-components
│       │       └── {sub-component}/
│       │           └── index.tsx
│       └── model/         # Widget-level state if needed
├── pages/                 # Pages layer — each page is a slice with segments
│   └── {page}/            # slice
│       ├── ui/            # segment: page component + its private sub-components
│       │   ├── index.tsx  # the page component (thin orchestrator)
│       │   └── components/       # Local First: private to this page
│       │       └── {component}/
│       │           └── index.tsx
│       ├── model/         # segment: page-level state (rare — only when needed)
│       └── {sub-page}/    # nested slice (sub-route)
│           └── ui/
│               ├── index.tsx
│               └── components/
│                   └── {component}/
│                       └── index.tsx
└── shared/                # Module-level primitives reused across slices
    ├── ui/
    ├── utils/
    └── config/
```

### `components/` — Local First within any `ui/` segment

`components/` is the mechanism for applying Local First inside a `ui/` segment. It means: "this sub-component is private to its parent and has not yet been promoted to a lower layer."

The same extraction rules apply inside `ui/` as across layers:
- Start with everything in `index.tsx`
- When a component grows large, split into `components/` sub-folders within the same `ui/`
- When a sub-component is needed in another slice, promote it to the appropriate layer (`entities/`, `features/`, `shared/ui/`)

---

## FSD Decomposition Rules (Local First)

### Principle: Page First

Write all code directly on the page (`pages/{page}/ui/index.tsx`) first. Extract to lower layers only when you feel the pain of real duplication or growing complexity. Premature decomposition is worse than no decomposition.

### When to extract to `entities/`

Extract when **all three** conditions are met:

1. **Actual duplication** — the same UI or data shape repeats across 2+ pages.
2. **Clear business domain** — you can name the real-world object (e.g., "assessment", "subscription"). Never extract without knowing which domain object you are working with.
3. **Collecting responsibility** — you want one place that owns the data structure, visual representation, query hooks, and query keys for this object.

An entity can be a single card **or** a list — both are the same domain area.

### When to extract to `features/`

Extract when a user action becomes non-trivial:

- **Complex business scenario** — the action has multiple invariants, validations, or conditional branching. Simple one-liner deletions do not warrant a feature.
- **Multiple entities involved** — the action requires coordinating different domains (e.g., only a manager-role `User` can delete an `Order`).
- **Context-dependent reaction** — the same action needs different post-success behavior on different pages (e.g., toast on one page, redirect on another). Features expose a clean callback API for this.

### When to extract to `widgets/`

Extract when:

- **Complex composition** — the block combines several entities and features into a meaningful, self-contained UI unit.
- **High reuse of the whole flow** — the same complex chain of actions appears identically in 5+ places.

### Summary table

| Code lives in | Extract when |
|---|---|
| `pages/{page}/ui/components/` | Used on one page only |
| `entities/{entity}/ui/components/` | Sub-component private to one entity UI |
| `features/{feature}/ui/components/` | Sub-component private to one feature UI |
| `entities/{entity}/` | Same domain object UI/data repeats across pages |
| `features/{feature}/` | Action has real complexity or cross-entity coordination |
| `widgets/{widget}/` | Block composes multiple entities + features and recurs |
| `shared/` | Primitive (util, config, base UI) reused across slices in the module |

---

## Real examples

```
src/modules/interview/
├── entities/
│   ├── assessment/
│   │   ├── ui/
│   │   │   └── assessment-card/
│   │   │       ├── index.tsx
│   │   │       └── components/
│   │   │           └── assessment-status-badge/
│   │   │               └── index.tsx
│   │   └── model/
│   │       ├── queryKeys.ts
│   │       ├── useAssessmentQuery.ts
│   │       └── types.ts
│   ├── roadmap/
│   │   └── model/
│   │       ├── queryKeys.ts
│   │       ├── useRoadmapSkillsQuery.ts
│   │       └── useTrainedSkillPathsQuery.ts
│   ├── room/
│   │   └── model/
│   │       ├── queryKeys.ts
│   │       └── useRoomQuery.ts
│   └── skill/
│       ├── ui/
│       │   └── skill-card/
│       │       └── index.tsx        # extracted: SkillCard repeated on roadmap + assessment
│       └── config/
│           └── grades.config.ts
├── features/
│   └── close-assessment/            # extracted: requires room + assessment coordination
│       ├── ui/
│       │   └── close-button/
│       │       └── index.tsx
│       └── model/
│           └── useCloseAssessment.ts
├── pages/
│   ├── roadmap/
│   │   └── ui/
│   │       ├── index.tsx
│   │       └── components/
│   │           ├── skill-tree/
│   │           │   └── index.tsx    # local — used only on this page
│   │           └── action-sidebar/
│   │               └── index.tsx
│   ├── assessment/
│   │   └── ui/
│   │       ├── index.tsx
│   │       └── components/
│   │           ├── skill-timer/
│   │           │   └── index.tsx
│   │           └── rating-controls/
│   │               └── index.tsx
│   └── assessment-lobby/
│       └── ui/
│           ├── index.tsx
│           └── components/
│               └── developer-card/
│                   └── index.tsx
└── shared/
    ├── ui/
    │   └── grade-badge/index.tsx
    └── utils/
        └── grade.utils.ts
```

```
src/modules/payments/
├── entities/
│   ├── balance/
│   │   └── model/
│   │       ├── queryKeys.ts
│   │       └── useBalanceQuery.ts
│   ├── subscription/
│   │   └── model/
│   │       ├── queryKeys.ts
│   │       └── useSubscriptionQuery.ts
│   └── transaction/
│       └── ui/
│           └── transaction-row/
│               └── index.tsx        # extracted: appears in history + balance pages
├── features/
│   ├── purchase-coins/              # extracted: complex dialog + payment provider logic
│   │   ├── ui/
│   │   │   └── purchase-dialog/
│   │   │       ├── index.tsx
│   │   │       └── components/
│   │   │           ├── coin-amount-selector/
│   │   │           │   └── index.tsx
│   │   │           └── payment-summary/
│   │   │               └── index.tsx
│   │   └── model/
│   │       └── usePurchaseCoins.ts
│   └── subscribe/
│       └── model/
│           └── useSubscribe.ts
├── pages/
│   ├── balance/
│   │   ├── ui/
│   │   │   ├── index.tsx
│   │   │   └── components/
│   │   │       ├── balance-header/
│   │   │       │   └── index.tsx
│   │   │       └── transaction-history/
│   │   │           └── index.tsx
│   │   ├── success/
│   │   │   └── ui/
│   │   │       └── index.tsx
│   │   └── reject/
│   │       └── ui/
│   │           └── index.tsx
│   ├── assessment-pass/
│   │   ├── ui/
│   │   │   ├── index.tsx
│   │   │   └── components/
│   │   │       ├── level-pass-card/
│   │   │       │   └── index.tsx
│   │   │       └── payment-selector/
│   │   │           └── index.tsx
│   │   └── history/
│   │       └── ui/
│   │           └── index.tsx
│   └── subscription/
│       └── ui/
│           └── index.tsx
└── shared/
    ├── ui/
    │   └── coin-badge/index.tsx
    └── utils/
        └── currency.utils.ts
```

```
src/modules/auth/
├── entities/
│   └── user/
│       ├── ui/
│       │   └── avatar/
│       │       └── index.tsx
│       └── model/
│           ├── queryKeys.ts
│           ├── useSessionQuery.ts
│           ├── useProfileQuery.ts
│           └── session.store.ts
├── features/
│   └── update-profile/
│       ├── ui/
│       │   └── profile-form/
│       │       └── index.tsx
│       └── model/
│           └── useUpdateProfile.ts
├── pages/
│   └── profile/
│       └── ui/
│           ├── index.tsx
│           └── components/
│               ├── profile-header/
│               │   └── index.tsx
│               ├── profile-info-card/
│               │   └── index.tsx
│               └── profile-nav/
│                   └── index.tsx
└── shared/
    └── config/
        └── session.config.ts
```

---

## Top-level Cross-module Compositions

When a page or block is assembled from parts that belong to **different modules**, it does not belong inside any single module. Use the top-level FSD layers for this:

```
src/
├── widgets/
│   └── {widget-name}/
│       └── ui/
│           ├── index.tsx
│           └── components/    # local sub-components, same Local First rules
│               └── {sub-component}/
│                   └── index.tsx
└── shared/
    └── ...                     # unchanged cross-module primitives
```

Top-level pages in `src/app/` that orchestrate cross-module widgets are thin entry points. The actual composition lives in `src/widgets/`.

**Example**: A dashboard page showing the user's balance (payments), active assessment (interview), and profile avatar (auth) is composed in `src/widgets/dashboard/ui/index.tsx` and re-exported from the app router entry point.

**Cross-module import rule**: modules must NOT import from each other. If module A needs something from module B, extract it to `src/shared/` or compose at the top-level `src/widgets/` layer.

---

## Router Integration

Modules provide pages, but routes live in `src/app/`. The `src/app/` file is a thin entry point that re-exports from the module's page `ui/`:

```
src/app/
├── [matrixId]/
│   ├── roadmap/
│   │   └── page.tsx     → re-exports from modules/interview/pages/roadmap/ui
│   ├── assessment/
│   │   └── page.tsx     → re-exports from modules/interview/pages/assessment/ui
│   └── assessment-lobby/
│       └── page.tsx     → re-exports from modules/interview/pages/assessment-lobby/ui
└── profile/
    ├── page.tsx         → re-exports from modules/auth/pages/profile/ui
    ├── balance/
    │   └── page.tsx     → re-exports from modules/payments/pages/balance/ui
    └── assessment-pass/
        └── page.tsx     → re-exports from modules/payments/pages/assessment-pass/ui
```

Entry point pattern:

```typescript
// src/app/[matrixId]/roadmap/page.tsx
export { default } from "@/modules/interview/pages/roadmap/ui";
```

For cross-module pages, the entry point wires a top-level widget:

```typescript
// src/app/dashboard/page.tsx
export { default } from "@/widgets/dashboard/ui";
```

---

## Query Keys

Query keys belong to the entity that owns the data. Each entity slice has its own `queryKeys.ts` inside its `model/` segment.

```typescript
// src/modules/interview/entities/assessment/model/queryKeys.ts

const NS = 'INTERVIEW'; // module namespace — must be unique across modules

export const assessmentsKeys = {
  all: [NS, 'assessments'] as const,
  current: () => [...assessmentsKeys.all, 'current'] as const,
  history: (page?: number, limit?: number) => [...assessmentsKeys.all, 'history', page, limit] as const,
  skills: () => [...assessmentsKeys.current(), 'skills'] as const,
};
```

```typescript
// src/modules/interview/entities/room/model/queryKeys.ts

const NS = 'INTERVIEW';

export const roomsKeys = {
  all: [NS, 'rooms'] as const,
  detail: (roomId?: string) => [...roomsKeys.all, roomId] as const,
  myParticipant: (roomId?: string) => [...roomsKeys.all, 'my', roomId] as const,
};
```

Features that invalidate an entity's cache import the keys from that entity's `model/`:

```typescript
// src/modules/interview/features/close-assessment/model/useCloseAssessment.ts
import { assessmentsKeys } from '@/modules/interview/entities/assessment/model/queryKeys';
```

Namespaces per module:
- `INTERVIEW` — interview module
- `PAYMENTS` — payments module
- `AUTH` — auth/user module

---

## API Layer

### Codegen

Types are generated from the OpenAPI schema. **Never edit `main-api-schema.ts` by hand.**

```bash
pnpm generate:main-api:local
# runs: openapi-typescript http://localhost:5005/api/v1/swagger-json
#   -o ./src/shared/api/main-api-schema.ts
```

### Query hooks (in entity `model/`)

```typescript
// src/modules/interview/entities/assessment/model/useAssessmentQuery.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { getMainClient } from "@/shared/api/main-api-client";
import { unwrap } from "@/shared/api/utils/unwrap";
import { assessmentsKeys } from "./queryKeys";

export const useCurrentAssessmentQuery = () => {
  return useQuery({
    queryKey: assessmentsKeys.current(),
    queryFn: () => unwrap(getMainClient().GET('/api/v1/assessments/current')),
  });
};
```

### Mutation hooks (in feature `model/`)

```typescript
// src/modules/interview/features/close-assessment/model/useCloseAssessment.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMainClient } from "@/shared/api/main-api-client";
import { assessmentsKeys } from "@/modules/interview/entities/assessment/model/queryKeys";

export const useCloseAssessment = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) =>
      getMainClient().POST('/api/v1/assessments/close', { body: { roomId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: assessmentsKeys.all });
    },
  });
};
```

### Types (in entity `model/`)

```typescript
// src/modules/interview/entities/assessment/model/types.ts
import { components } from "@/shared/api/main-api-schema";

export type Assessment = components["schemas"]["AssessmentDto"];
export type AssessmentStatus = Assessment["status"];
```

---

## Shared Layer

`src/shared/` contains only what is truly cross-module:

```
src/shared/
├── api/
│   ├── main-api-schema.ts    # CODEGEN — do not edit
│   ├── main-api-client.ts    # getMainClient() factory
│   ├── types.ts              # Common API types (enums shared across modules)
│   └── utils/
│       └── unwrap.ts         # Unwrap openapi-fetch response
├── ui/                       # Primitives used across modules
│   ├── page-header/
│   └── empty-state/
├── config/
│   └── routes.ts             # Route constants
└── utils/
    ├── date.utils.ts
    └── format.utils.ts
```

**What does NOT belong in `shared/`**: anything that only one module uses.

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Folders | `kebab-case` | `assessment-lobby/` |
| Components | `PascalCase` export, `index.tsx` file | `export function SkillCard()` |
| Query hooks | `use{Entity}Query` | `useAssessmentQuery` |
| Mutation hooks | `use{Action}{Entity}` | `useCloseAssessment` |
| Stores | `use{Entity}Store` | `useSessionStore` |
| Query key objects | `{entity}Keys` | `assessmentsKeys` |
| Types from schema | Alias with `= components["schemas"]["..."]` | `type Assessment = ...` |
| Utils | `{domain}.utils.ts` | `grade.utils.ts` |
| Config files | `{domain}.config.ts` | `grades.config.ts` |

---

## State Management Decision Tree

```
Is the data from the server?
  YES → TanStack Query (useQuery / useMutation)
        → lives in entity/model/ or feature/model/
  NO  → Is it shared across multiple distant components?
          YES → Zustand store in entities/{entity}/model/{entity}.store.ts
          NO  → useState in component
```

Zustand stores hold only UI/client state (e.g., active skill in roadmap, sidebar open). Server state always lives in React Query cache.

---

## Forms

All forms use **React Hook Form**:

```typescript
const form = useForm({ mode: "onChange" });

// Native inputs
<input {...register("email", { required: true })} />

// Non-native (shadcn Select, etc.)
<Controller
  control={form.control}
  name="level"
  render={({ field }) => <Select {...field} />}
/>

// Sync with external data (dialog open state)
useEffect(() => {
  if (open) form.reset(initialData);
}, [open]);
```

---

## Import Rules

Allowed imports by layer (within a module):

| From | Can import |
|---|---|
| `pages/` | `widgets/`, `features/`, `entities/`, `shared/` (own module), `shared/` (global) |
| `widgets/` | `features/`, `entities/`, `shared/` (own module), `shared/` (global) |
| `features/` | `entities/`, `shared/` (own module), `shared/` (global) |
| `entities/` | `shared/` (own module), `shared/` (global) |
| `shared/` (module) | `shared/` (global) only |
| `src/widgets/` (top-level) | any `modules/*/entities/`, any `modules/*/features/`, `shared/` — **not** `modules/*/pages/` |
| `shared/` (global) | nothing from `modules/` |

**Cross-module imports are forbidden.** Modules must not import from each other. Extract to global `shared/` or compose at top-level `src/widgets/`.

**Layer import direction**: `pages` → `widgets` → `features` → `entities` → `shared`. Lower layers must not import from higher layers.

---

## Anti-patterns (do not do these)

- `model/` as a top-level layer inside a module — `model` is a segment inside slices, not a layer
- `pages/{page}/page.tsx` at the slice root without a `ui/` segment — pages are slices and need segments
- Importing `components/` from a sibling slice — `components/` is always private to its parent `ui/`
- Extracting to `entities/`, `features/`, or `widgets/` before there is real duplication or complexity (premature abstraction)
- Generic `components/` folder at the root with unrelated things mixed together
- Putting query hooks directly in page files
- Editing `src/shared/api/main-api-schema.ts` by hand
- Using `any` or casting to bypass schema types
- Zustand for server cache (use React Query)
- React Query for ephemeral UI state (use useState)
- Importing between modules directly (use global `shared/` or top-level `widgets/` instead)
- Lower layers importing from higher layers (e.g., `entities/` importing from `pages/`)

---

## Reference Implementation

`src/app/profile/assessment-pass/` is the reference for page structure.  
`src/modules/interview/entities/assessment/model/queryKeys.ts` is the reference for query key factories.  
`docs/instruction.md` has code templates for all layer files.
