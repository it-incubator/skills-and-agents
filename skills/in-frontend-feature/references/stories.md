# Stories and Storybook

## Purpose and mocking boundary

Stories are living documentation of isolated UI and lightweight integration coverage. A failed story may reveal a component defect, a missing provider, or an incorrect mock; investigate rather than equating every story failure with a component bug.

Mock at the network boundary with MSW. Run real TanStack Query hooks and dependencies. Hook/module overrides are reserved for dependencies with no network behavior, such as a client-only store hook, and should follow the project's test tooling. A network-backed hook must not be replaced with a fabricated return value.

Network handlers preserve hook chains and query behavior; they can also be reused in test tooling when appropriate. This does not require creating a global handler registry: story handlers remain explicit in story files.

## File layout and coverage

```text
ui/assessment-info-card/
├── index.tsx
└── AssessmentInfoCard.stories.tsx
```

Use CSF3 with typed `Meta` and `StoryObj`, importing the component from `./index`. Put mock data at the top of the story file, then metadata/default handlers, then named stories.

Provide `Default` with realistic data. Provide `Loading` and `Empty` wherever these states are meaningful; use an indefinitely delayed response for network loading and the API's real empty shape for empty states. For components without loading or data semantics, cover meaningful prop variants instead of inventing states. Add meaningful error, permission, boundary, and interaction variants for the feature being changed.

## Fixtures: Local First

Start with data in the story file. Never import fixtures from another story file. A shared shape or a few matching fields alone does not justify extraction.

When several stories intentionally model one coordinated scenario and benefit from joint updates, put plain data fixtures in `modules/{module}/shared/_mocks/`. For example, a coherent session/assessment/participants dataset may be shared; unrelated cards can duplicate a simple example user.

Only plain data objects belong there. Define MSW handlers in the story files so the requests creating a state remain visible. Use realistic schema examples where available, not real personal data.

## Generated response types

Every mocked response body must use `satisfies` against the generated endpoint response type. Validate the whole response wrapper, not just the inner DTO. Include story files in TypeScript checking. Generated schema changes cannot check untyped fixtures automatically, and compile-time checking does not establish semantic correctness.

Example for a project whose actual schema has this operation:

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { delay, http, HttpResponse } from "msw";
import type { paths } from "@/shared/api/main-api-schema";
import { AssessmentInfoCard } from "./index";

type ActiveSessionResponse = paths["/api/v1/session/active"]["get"]["responses"][200]["content"]["application/json"];

const emptySession = { session: null } satisfies ActiveSessionResponse;

const meta = {
  component: AssessmentInfoCard,
} satisfies Meta<typeof AssessmentInfoCard>;
export default meta;
type Story = StoryObj<typeof meta>;

// Focused example: include handlers for other unconditional queries in the real story.
export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/v1/session/active", () => HttpResponse.json(emptySession)),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/v1/session/active", async () => {
          await delay("infinite");
          return HttpResponse.json(emptySession);
        }),
      ],
    },
  },
};
```

Add Default using a schema-valid non-empty response for the target component. Do not invent DTO fields from this example. For error responses, derive the appropriate documented status/body type.

## Handler correctness

Read every invoked hook and its dependencies before choosing URLs. A hook named `useMeDeveloperQuery` might call `/api/v1/user/me`, not `/api/v1/developers/me`. The actual code and schema decide.

Use patterns such as `*/api/v1/user/me` to match regardless of the configured host. Match actual methods, paths, and necessary query/body conditions. If the schema returns `{ session: ... | null }`, both populated and empty handlers must preserve that wrapper; a bare session or `null` is incorrect.

Mock every endpoint that fires unconditionally in each story, including Loading. A query gated on pending data may not fire, but independent settings/user queries still do. If using metadata handlers plus story overrides, inspect the installed addon's parameter inheritance behavior; do not assume array handlers merge. Ensure the resulting handler set is complete.

Use imported MSW `delay("infinite")` for indefinite loading instead of an unmanaged never-resolving promise. Use supported finite delays for latency scenarios. Do not rely on missing handlers to produce loading or empty UI: unhandled requests can escape the mock boundary or fail.

## Setup and isolation (only when needed)

Inspect installed Storybook, framework, MSW, and addon versions first. Use compatible project dependencies and configuration; do not blindly install `@latest` or assume version-specific addon registration. Consult official documentation for version-specific setup when necessary.

For a Next.js project, identify its supported Storybook Next.js framework integration. Configure story discovery (for example `../src/**/*.stories.@(ts|tsx)`), static assets, and MSW using the installed integration's supported setup. Generate the MSW worker in the actual public directory when required (`pnpm exec msw init public/ --save` is a typical command).

In preview configuration:

- Import the real global CSS path; in the source project it was `../src/app/globals.css`, not `../src/globals.css`.
- Configure the API client before its first use. A mock base URL still must satisfy the client's URL rules. MSW intercepts matching requests, not automatically every possible request.
- Initialize MSW and register `mswLoader` according to the installed addon's API.
- Provide QueryClientProvider and any other required providers, router context, or client-state resets.
- Give each isolated story run a fresh QueryClient, stable for that mounted story's lifetime. Do not create a new client on every decorator render. Ensure changing stories resets the cache rather than retaining the previous story's data; account for multiple stories rendered on documentation pages.
- Disable query retries and use `staleTime: Infinity` for deterministic ordinary stories when appropriate. Explicitly configure scenarios intended to exercise retries/refetches.
- Configure and inspect unhandled-request reporting; do not silently allow unintended API traffic. Permit legitimate assets/framework requests as required.

Use a stateful provider wrapper for a stable mounted client and an explicit story-boundary remount/reset strategy supported by the installed Storybook setup. Verify switching stories and rerendering controls. Reset relevant Zustand client state as well to avoid leaking it across scenarios.

Typical scripts are `storybook dev -p 6006` and `storybook build`; use the target project's package manager and existing scripts. Add scripts only if setting up Storybook is within the task.

## Storybook MCP (optional)

If a working Storybook MCP integration is available, use it to discover actual component props/stories, obtain story instructions, preview affected stories, and run supported accessibility/interaction checks. Inspect the exposed tools rather than assuming exact names or capabilities.

The source project's example used `@storybook/addon-mcp`, a running Storybook at port 6006, and an HTTP endpoint `http://localhost:6006/mcp`. Tool names included `list-all-documentation`, `get-documentation`, `get-documentation-for-story`, `get-storybook-story-instructions`, `preview-stories`, and `run-story-tests`. Treat these as discovery hints, not a guarantee of the installed version.

Some integrations expose a generated component manifest (the source example used `/manifests/components.json`) and a `!manifest` exclusion tag. Verify support before relying on them. Do not assume the addon, manifest, accessibility tests, or user-specific MCP configuration already exist.

Use project-supported browser/test/build tooling if MCP is unavailable. Do not edit the user's global agent configuration just to finish an ordinary feature. When adding an MCP integration is requested, use its current official setup and register only the intended server; preserve unrelated settings.
