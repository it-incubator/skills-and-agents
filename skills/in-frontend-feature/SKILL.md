---
name: in-frontend-feature
description: Implement new React/Next.js frontend functionality using module-scoped FSD, Local First page models, TanStack Query, and schema-checked MSW Storybook stories. Use for new screens, forms, and user actions in projects adopting these conventions. Triggers include "build a frontend feature", "add a screen", "новая функциональность фронтенда", "создай страницу", "добавь фичу по FSD". Not for backend-only work or imposing this architecture on unrelated stacks.
---

# Frontend Feature

## Purpose

Implement the requested frontend functionality with clear domain ownership, page-local logic, and realistic isolated UI stories. These instructions incorporate the agreed architectural and Storybook conventions into one consistent workflow.

Apply to React/Next.js projects adopting module-scoped FSD. Respect explicit user decisions and the target project's instructions. Do not migrate unrelated code or install a new stack just to match the examples. Module names, endpoint paths, API schema names, and commands in references are examples to verify in the target repository.

## Steps

### 1. Establish the feature's boundaries

Read project instructions, the relevant route and neighboring slices, dependencies, API client, generated schema, and existing Storybook configuration. Identify the owning domain module, existing reusable entities/features, required states, and actual endpoints. Reuse established slices; Local First does not mean duplicating existing domain logic.

Read [references/architecture.md](references/architecture.md) for every feature. Read [references/data-and-state.md](references/data-and-state.md) when implementing queries, mutations, forms, or shared client state. Read [references/stories.md](references/stories.md) when creating or changing UI stories; its setup section applies only if Storybook setup needs work.

### 2. Implement locally, extract deliberately

Start new page-specific UI in `pages/{page}/ui/` and its logic in `pages/{page}/model/`. Defining a query hook does not require an entity; defining a mutation does not require a feature. Calling a model hook from UI is expected.

Keep private sub-components in their parent's `ui/components/`. Promote code only when the criteria in the architecture reference are met. Compose different modules in top-level `src/widgets/`; never introduce direct imports between domain modules or move domain entities to global shared just because multiple consumers need them.

### 3. Cover observable UI states

Add co-located stories for the new or changed UI, following the stories reference. Use real query/mutation hooks with MSW network handlers. Keep fixtures local by default; shared fixtures are for one deliberately coordinated scenario. Check complete mock responses with generated endpoint types using `satisfies`.

Show Default and applicable Loading/Empty states, plus meaningful error or action variants. Do not invent loading states for purely presentational components. Do not treat a successfully rendered story as proof that interactions or accessibility were tested.

### 4. Verify and report

Run the project's relevant typecheck, including story files, and the affected tests or Storybook checks available in the repository. Inspect relevant renders and interactions when tools are available. Verify handlers match actual requests and do not leave unexpected requests unhandled. Add meaningful interaction tests for consequential behavior rather than tests that restate implementation.

Report implemented behavior, placement decisions that matter, completed checks, and any checks that could not run. Do not claim a build, browser render, or MCP test passed without executing it. The skill does not request a commit, deployment, global configuration change, or unrelated documentation rewrite.
