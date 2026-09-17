# Module architecture and Local First

## Domain ownership

The application has domain modules and global composition/infrastructure layers. For example:

```text
src/
├── app/                 # Next.js route entry points
├── modules/
│   ├── auth/            # Authentication, profile, authentication session
│   ├── interview/       # Rooms, assessments, roadmap, skills
│   └── payments/        # Balance, subscriptions, purchases
├── widgets/             # Cross-module compositions
└── shared/              # Cross-module primitives and infrastructure
```

Use the target project's actual domains. Domain code stays in its owning module regardless of the number of consumers. A dashboard composes a balance from payments and an avatar from auth in `src/widgets/dashboard/`; neither entity moves to global shared.

Modules must not import each other. Coordinate cross-module scenarios at the top-level composition boundary through props/callbacks. Extract genuinely common primitives, utilities, or infrastructure to `src/shared/`. Module-specific primitives belong to that module's `shared/`.

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
| `entities/{entity}/` | All three: actual repeated UI/data across 2+ pages; identifiable business object; value in collecting ownership of its model and representation |
| `features/{action}/` | A non-trivial action: business invariants/validation/branching, coordination of entities, or context-dependent success behavior needing a reusable callback API |
| Module `widgets/{widget}/` | A meaningful self-contained complex composition of entities/features; reuse supports extraction but is not mandatory |
| Module `shared/` | Primitives reused across slices in that module |
| Global `shared/` | Truly cross-module primitives, utilities, infrastructure |
| Global `widgets/` | Composition of different modules, even if used once |

Entity UI may be a card or a list; an entity may initially have only a model. A trivial deletion does not require a feature. Merely placing multiple components together does not require a widget. There is no five-use threshold for widgets.

Examples: a skill card repeated on roadmap and assessment pages can become a skill entity UI; a room/assessment close scenario can become a feature; a one-page timer stays local. Cross-module actions are coordinated above modules rather than bypassing their import boundary.

When promoting a local query model to an entity, move query keys with it and preserve their values so cache identity does not change accidentally. Leave page-specific state behind. Local mutations stay in page models until feature extraction is justified.

## Imports

These rules govern dependencies between slices; files may import their own slice's segments and private children.

| Importer | Allowed dependencies |
|---|---|
| Module pages | Own module widgets, features, entities, shared; global shared |
| Module widgets | Own module features, entities, shared; global shared |
| Module features | Own module entities, shared; global shared |
| Module entities | Own module shared; global shared |
| Module shared | Global shared |
| Global `src/widgets/` | Modules' entities/features; global shared; its own private implementation |
| Global shared | No module imports |

Lower layers never import higher layers. Do not import sibling slices' internals. Top-level widgets do not import module pages. Follow any narrower public export conventions already established by the project.

## Router integration

Routes live in `src/app/`; business page implementation lives in the owning module. Route files are thin entry points:

```tsx
// src/app/[matrixId]/roadmap/page.tsx
export { default } from "@/modules/interview/pages/roadmap/ui";

// src/app/dashboard/page.tsx (a separate file)
export { default } from "@/widgets/dashboard/ui";
```

Keep required route-specific Next.js exports at the appropriate entry point. Do not assume an old `src/app/profile/assessment-pass/` directory is an architectural reference without inspecting it; the target project's actual implementation may differ.

## Naming

| Item | Convention |
|---|---|
| Folders | `kebab-case` |
| Components | `PascalCase` exports in `index.tsx` |
| Story files | `ComponentName.stories.tsx`, beside `index.tsx`, importing `./index` |
| Query hooks | `use{Entity}Query` or a meaningful contextual variant |
| Mutation hooks | `use{Action}{Entity}` |
| Zustand hooks/files | `use{Entity}Store`, `{entity}.store.ts` |
| Query key objects | `{entity}Keys` in `queryKeys.ts` |
| Utilities | `{domain}.utils.ts` |
| Configuration | `{domain}.config.ts` |

Avoid root-level catch-all `components/`, page implementations at a slice root without `ui/`, module-root `model/`, and extraction based only on anticipated reuse.
