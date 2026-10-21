# Module architecture and Local First

## Domain ownership

The application has domain modules and global composition/infrastructure layers. For example:

```text
src/
├── app/                 # Next.js route entry points, app-wide providers
├── modules/
│   ├── auth/            # Authentication, profile, authentication session
│   ├── interview/       # Rooms, assessments, roadmap, skills
│   └── payments/        # Balance, subscriptions, purchases
├── compositions/        # Cross-module compositions (blocks and whole pages)
└── shared/              # Cross-module primitives, infrastructure, app-wide UI services
```

Use the target project's actual domains. Domain code stays in its owning module regardless of the number of consumers. A dashboard composes a balance from payments and an avatar from auth in `src/compositions/dashboard/`; neither entity moves to global shared.

Modules must not import each other. Coordinate cross-module scenarios in `src/compositions/` through props/callbacks. Extract genuinely common primitives, utilities, or infrastructure to `src/shared/`. Module-specific primitives belong to that module's `shared/`; when one is needed outside its module, move it to `src/shared/` rather than importing a module's shared from outside.

`compositions` is deliberately not named `widgets`: it composes module widgets, which an FSD `widgets` layer could not import from its own rank.

## App-wide UI services

Non-domain client state needed across pages and modules (theme, sidebar, toasts, a globally opened modal) lives in global shared, one purpose-named segment per service:

```text
src/shared/
├── theme/
│   ├── theme.store.ts
│   ├── use-theme.ts
│   └── index.ts         # Public API of the service
├── sidebar/
└── toast/
```

Keep a service's store, hooks, and UI together behind its `index.ts`. Mount its providers, toasters, or pre-hydration scripts from `src/app/layout.tsx`; the app layer only wires them, because modules cannot import from `src/app/`. A service holds UI state only: no domain logic and no imports from modules. Name the segment by purpose (`theme`, `toast`), never by kind (`store`, `services`, `modals`). Domain client state stays in the owning module's entity or page model.

## Layers, slices, segments

- Layers inside a module: `pages`, `widgets`, `features`, `entities`, `shared`.
- Slices are subjects: `pages/assessment`, `features/close-assessment`, `entities/assessment`.
- Segments live inside slices: `ui`, `model`, `config`.

`model` is a segment, never a module-root layer. Shared contains segments directly, without business slices.

```text
modules/{module}/
├── pages/{page}/
│   ├── ui/
│   │   ├── index.tsx
│   │   └── components/{private-component}/index.tsx
│   ├── model/           # Local queries, keys, mutations, types, form/state logic
│   └── {sub-page}/ui/index.tsx  # Optional nested route slice
├── entities/{entity}/
│   ├── ui/{component}/
│   │   ├── index.tsx
│   │   └── components/{private-component}/index.tsx
│   ├── model/           # Promoted queries, keys, types, client store if needed
│   └── config/
├── features/{action}/
│   ├── ui/{component}/index.tsx
│   └── model/           # Promoted action/mutation/form logic
├── widgets/{widget}/
│   ├── ui/index.tsx
│   ├── ui/components/{private-component}/index.tsx
│   └── model/           # Widget-specific coordination/state if needed
└── shared/
    ├── ui/
    ├── utils/
    └── config/
```

Create only the folders a feature needs. Nested page slices model sub-routes, not permission to import another page's private implementation.

## Page First means the page slice

New page-specific code starts in the page slice. Keep rendering in `ui/index.tsx`; put query/mutation definitions, query keys, types, and substantial form/state logic in `model/`. Ordinary ephemeral UI state may remain in the component.

Moving logic into a local model is not premature extraction. A page may be a thin UI orchestrator from the beginning without creating entities/features. Other slices must not import its private model or components.

Grow UI locally: start in the component, split large pieces into `components/`, then promote reusable domain pieces when the criteria below are met. A component's `components/` directory is private to that parent, whether the parent belongs to a page, entity, feature, or widget.

## Extraction criteria

| Destination | Criteria |
|---|---|
| Page `ui/components/` | Private UI for one page |
| Parent UI's `components/` | Private sub-components of that entity, feature, or widget UI |
| `entities/{entity}/` | All three: actual repeated UI/data across 2+ pages; identifiable business object; value in collecting ownership of its model and representation. Also when several slices must read or invalidate the same cached data |
| `features/{action}/` | A non-trivial action: business invariants/validation/branching, coordination of entities, or context-dependent success behavior needing a reusable callback API |
| Module `widgets/{widget}/` | A meaningful self-contained complex composition of entities/features; reuse supports extraction but is not mandatory |
| Module `shared/` | Primitives reused across slices in that module |
| Global `shared/` | Truly cross-module primitives, utilities, infrastructure, app-wide UI services |
| Global `compositions/` | Composition of different modules, even if used once |

Entity UI may be a card or a list; an entity may initially have only a model. A trivial deletion does not require a feature. Merely placing multiple components together does not require a widget. There is no five-use threshold for widgets.

Examples: a skill card repeated on roadmap and assessment pages can become a skill entity UI; a room/assessment close scenario can become a feature; a one-page timer stays local. Cross-module actions are coordinated above modules rather than bypassing their import boundary.

When promoting a local query model to an entity, move query keys with it and preserve their values so cache identity does not change accidentally. Leave page-specific state behind. Local mutations stay in page models until feature extraction is justified.

### Cache invalidation across slices

Page-local query keys are private, and copying literal key arrays is not allowed. A mutation living outside the slice that owns the keys therefore has two legitimate options:

- **One owning page:** the mutation exposes an `onSuccess` callback, and the page that owns the keys invalidates its own cache.
- **Cache shared by several slices:** the keys and queries move to `entities/{entity}/model/`, and every mutation invalidates through the entity's exported keys. Several pages repeating the same invalidation callback is the signal to do this.

## Imports

These rules govern dependencies between slices; files may import their own slice's segments and private children.

| Importer | Allowed dependencies |
|---|---|
| Module pages | Own module widgets, features, entities, shared; global shared |
| Module widgets | Own module features, entities, shared; global shared |
| Module features | Own module entities, shared; global shared |
| Module entities | Own module shared; global shared |
| Module shared | Global shared |
| Global `src/compositions/` | Modules' widgets, features, entities; global shared; its own private implementation |
| Global shared | No module imports |
| `src/app/` | Module pages, compositions, global shared |

Lower layers never import higher layers. Do not import sibling slices' internals. Compositions do not import module pages, module shared, or each other. Story files are the one exception to the module-shared boundary: a composition's stories may import plain fixtures from `modules/*/shared/_mocks/`. Follow any narrower public export conventions already established by the project.

## Router integration

Routes live in `src/app/`; business page implementation lives in the owning module. Route files are thin entry points:

```tsx
// src/app/[matrixId]/roadmap/page.tsx
export { default } from "@/modules/interview/pages/roadmap/ui";

// src/app/dashboard/page.tsx (a separate file)
export { default } from "@/compositions/dashboard/ui";
```

Keep required route-specific Next.js exports at the appropriate entry point.

## Naming

| Item | Convention |
|---|---|
| Folders | `kebab-case` |
| Components | `PascalCase` exports in `index.tsx` |
| Story files | `ComponentName.stories.tsx`, beside `index.tsx`, importing `./index` |
| Query hooks | `use{Entity}Query` or a meaningful contextual variant |
| Mutation hooks | `use{Action}{Entity}` |
| Zustand hooks/files | `use{Owner}Store`, `{owner}.store.ts`; the owner is the slice or service that holds it (`roadmap`, `user`, `sidebar`) |
| Query key objects | `{entity}Keys` in `queryKeys.ts`, singular like the slice name (`assessmentKeys`, `roomKeys`) |
| Utilities | `{domain}.utils.ts` |
| Configuration | `{domain}.config.ts` |

Avoid root-level catch-all `components/`, page implementations at a slice root without `ui/`, module-root `model/`, and extraction based only on anticipated reuse.
