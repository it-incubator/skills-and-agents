# Stories & Storybook

## Philosophy

Stories are **living documentation** of UI components in isolation. They also serve as a lightweight integration test: a broken story means a broken component.

**Golden rule**: mock at the network layer (MSW), not at the hook/module layer.

---

## Why MSW, not hook overrides

| | MSW | Hook override |
|---|---|---|
| Hook chain deps | One handler covers the whole tree | Must mock every hook in the dependency chain |
| Realism | Actual React Query logic runs | Mocked return value, skips query internals |
| Maintenance | Mock drifts only if API changes | Mock drifts whenever hook signature changes |
| Reuse | Same handlers usable in Vitest/Playwright | Story-only |

Hook overrides (`jest.mock`, `storybook-addon-module-mock`) are acceptable only for hooks that have **no network calls** (e.g., a Zustand store hook). For anything backed by TanStack Query → MSW.

---

## Setup

### Install

```bash
pnpm add -D storybook@latest @storybook/nextjs@latest msw@latest msw-storybook-addon@latest
pnpm exec msw init public/ --save
```

> Note: Storybook 10 merged essentials addons into the core — no separate `@storybook/addon-essentials` needed.

### `.storybook/main.ts`

```typescript
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["msw-storybook-addon"],
  framework: {
    name: "@storybook/nextjs",
    options: {},
  },
  staticDirs: ["../public"],
};

export default config;
```

### `.storybook/preview.tsx`

```typescript
import type { Preview } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initialize, mswLoader } from "msw-storybook-addon";
import React from "react";
import "../src/app/globals.css";
import { setClientConfig } from "@/shared/api/main-api-client";

// The API client requires baseURL to be set before getClient() is called.
// MSW intercepts all requests before they leave the browser,
// so any non-empty value works here.
setClientConfig({ baseURL: "http://localhost" });

initialize(); // start MSW

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,       // fail fast in stories
        staleTime: Infinity // don't refetch while story is open
      },
    },
  });

const preview: Preview = {
  loaders: [mswLoader],
  decorators: [
    (Story) => (
      <QueryClientProvider client={makeQueryClient()}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  parameters: {
    msw: { handlers: [] }, // default: no handlers (component returns null / loading state)
  },
};

export default preview;
```

A **fresh QueryClient per story** is required — otherwise cached data leaks between stories.

---

## Story file conventions

### Location

Co-located with the component, same folder:

```
_ui/
├── AssessmentInfoCard.tsx
└── AssessmentInfoCard.stories.tsx
```

### File structure (CSF3)

```typescript
import type { Meta, StoryObj } from "@storybook/react";
import { http, HttpResponse } from "msw";
import { AssessmentInfoCard } from "./AssessmentInfoCard";

// --- mock data (top of file, easy to update when schema changes) ---
const mockSession = { ... };
const mockSettings = { ... };

// --- meta ---
const meta: Meta<typeof AssessmentInfoCard> = {
  component: AssessmentInfoCard,
  parameters: {
    msw: {
      handlers: [
        // default handlers shared by all stories in this file
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof AssessmentInfoCard>;

// --- stories ---
export const Default: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/v1/user/me", () => HttpResponse.json(mockMe)),
        http.get("*/api/v1/session/active", () => HttpResponse.json(mockSession)),
        http.get("*/api/v1/settings", () => HttpResponse.json(mockSettings)),
      ],
    },
  },
};

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/v1/developers/me", async () => {
          await delay("infinite"); // MSW built-in — suspends response indefinitely
        }),
      ],
    },
  },
};

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/v1/user/me", () => HttpResponse.json(mockMe)),
        http.get("*/api/v1/session/active", () => HttpResponse.json(null)),
        http.get("*/api/v1/settings", () => HttpResponse.json(mockSettings)),
      ],
    },
  },
};
```

### Required stories per component

Every component must have at minimum:

| Story | What it shows |
|---|---|
| `Default` | Happy path with real-looking data |
| `Loading` | Skeleton / loading state (handler never resolves) |
| `Empty` | Null/empty data (component returns null or empty state) |

Add additional stories for meaningful variants (different grades, error states, edge cases).

---

## Mock data rules

1. **Define mocks at the top of the story file** — easy to find and update when schema changes.
2. **Use realistic values** — use `@example` values from `main-api-schema.ts` as a starting point.
3. **Never import mocks across story files** — if two components share a mock shape, duplicate it. Shared mock fixtures become a maintenance burden.
4. **Handler URL pattern**: use `*/api/v1/...` glob prefix (not a full URL) so stories work regardless of the `baseURL` configured in `main-api-client.ts`.

---

## Module-level shared handlers (optional)

For complex modules with many stories sharing the same base handlers, create a `_mocks/` folder at the module's `shared/` level:

```
src/modules/interview/shared/
└── _mocks/
    ├── session.mock.ts      # mock data objects only
    ├── settings.mock.ts
    └── developer.mock.ts
```

These files export only **plain data objects**, never MSW handlers. Handlers are always defined in the story file itself so the intent is explicit.

---

## `src/shared/api/main-api-schema.ts` and mocks

The codegen schema is the source of truth for mock data shape. When the schema changes (after `pnpm generate:main-api:local`), TypeScript will surface broken mocks at compile time — this is intentional and desirable.

---

## Common pitfalls (learned from first setup)

### 1. globals.css path

The CSS import in `preview.tsx` must use the full path from `.storybook/`:

```typescript
// ✗ wrong
import "../src/globals.css";

// ✓ correct — globals.css lives inside src/app/
import "../src/app/globals.css";
```

---

### 2. API client requires baseURL before first call

`getMainClient()` throws `"baseURL is required"` if `setClientConfig` was never called. In the real app this happens during app bootstrap. In Storybook it never happens, so add it to `preview.tsx`:

```typescript
import { setClientConfig } from "@/shared/api/main-api-client";

// MSW intercepts before any real network I/O, so the value doesn't matter —
// it just needs to be non-null to satisfy the guard in assertApiConfig().
setClientConfig({ baseURL: "http://localhost" });
```

---

### 3. Always verify the actual endpoint the hook calls

Do not assume the endpoint from the hook name. Always read the hook source before writing handlers.

```typescript
// Hook is called useMeDeveloperQuery — but the endpoint is:
getMainClient().GET('/api/v1/user/me')  // NOT /api/v1/developers/me
```

Mock the URL you see in the source, not what you guess from the name.

---

### 4. Verify the full response shape from the schema

MSW returns whatever you give it — TypeScript won't catch a wrong shape at the handler level. Always check the schema for the exact response wrapper.

```typescript
// ✗ wrong — returns ActiveSessionResponse directly
HttpResponse.json(mockSession)

// ✓ correct — endpoint returns ActiveSessionWrapperResponse: { session: ... | null }
HttpResponse.json({ session: mockSession })
```

Check `main-api-schema.ts` → find the operation → find the `200` response schema → use that shape.

---

### 5. Mock every endpoint that fires unconditionally

Queries guarded by `enabled: !!someData` won't fire in a Loading story where that data is pending. But queries with **no `enabled` guard** fire in every story regardless.

```typescript
// This query fires in EVERY story — must be mocked in every story including Loading:
export const useSettingsQuery = () => {
  return useQuery({
    queryKey: ["settings"],
    // no enabled guard → always fires
    queryFn: () => unwrap(getMainClient().GET('/api/v1/settings')),
  });
};
```

If a handler is missing, MSW logs a warning and the request fails with `ERR_FAILED` — check the browser console when a story shows blank.

---

### 6. Use `delay("infinite")` for Loading stories, not manual promises

MSW v2 exports a `delay` utility with built-in modes:

```typescript
import { delay, http, HttpResponse } from "msw";

// ✗ wrong — raw Promise, not the MSW API
http.get("*/api/v1/user/me", async () => {
  await new Promise(() => {});
});

// ✓ correct — MSW built-in, suspends indefinitely
http.get("*/api/v1/user/me", async () => {
  await delay("infinite");
});
```

Other modes: `delay("real")` for randomized realistic latency (100–400ms), `delay(ms)` for exact duration.

---

## Storybook MCP server

`@storybook/addon-mcp` exposes a local MCP server at `http://localhost:6006/mcp` while Storybook is running. Claude Code connects to it and gains three toolsets:

| Toolset | Tools | Purpose |
|---|---|---|
| **docs** | `list-all-documentation`, `get-documentation`, `get-documentation-for-story` | Read real component props, usage examples, stories |
| **dev** | `get-storybook-story-instructions`, `preview-stories` | Get framework-specific story patterns, preview renders |
| **test** | `run-story-tests` | Run story-level accessibility / interaction tests |

This lets the agent use **actual components** from the design system instead of guessing props and patterns.

### Setup (already done in this project)

**1. Install addon**

```bash
pnpm exec storybook add @storybook/addon-mcp
```

This installs `@storybook/addon-mcp` and auto-adds it to `.storybook/main.ts`.

**2. `.storybook/main.ts`** — no extra config needed, components manifest is generated automatically:

```typescript
const config: StorybookConfig = {
  addons: ["msw-storybook-addon", "@storybook/addon-mcp"],
  // ...
};
```

**3. `.mcp.json`** — registers the server for Claude Code (project-scoped):

```json
{
  "mcpServers": {
    "h2d-storybook": {
      "type": "http",
      "url": "http://localhost:6006/mcp"
    }
  }
}
```

**4. `.claude/settings.local.json`** — enables the server:

```json
{
  "enabledMcpjsonServers": ["context7", "playwright", "h2d-storybook"]
}
```

### How to use

**Storybook must be running** (`pnpm storybook`) before the MCP tools are available.

Typical workflow when building a new screen:

1. `list-all-documentation` — discover what components exist and their story IDs
2. `get-documentation` — read real props and examples for components you want to use
3. Build the component using only documented props
4. `preview-stories` — verify the render without opening a browser
5. `run-story-tests` — check accessibility and interactions

### Components manifest

The manifest is generated automatically from CSF/MDX files and available at:

```
http://localhost:6006/manifests/components.json
```

To exclude a story from the manifest (e.g. internal debug stories):

```typescript
export const InternalStory: Story = {
  tags: ["!manifest"],
};
```

---

## Scripts

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

Run with: `pnpm storybook`
