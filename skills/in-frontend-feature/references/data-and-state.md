# API, models, state, and forms

## API contract and infrastructure

Use generated OpenAPI types as the contract. Never hand-edit `main-api-schema.ts`, use `any`, or cast to suppress a contract mismatch. Inspect the project's actual generation script before running it; `pnpm generate:main-api:local` and a local swagger-json endpoint are examples, not guaranteed project commands.

Typical global infrastructure:

```text
shared/
├── api/
│   ├── main-api-schema.ts   # Generated
│   ├── main-api-client.ts   # Configured client factory
│   ├── types.ts            # Genuinely common API aliases/enums
│   └── utils/unwrap.ts
├── ui/                     # Cross-module UI primitives
├── config/routes.ts
└── utils/                  # Common date/format helpers
```

Read the client's configuration requirements and `unwrap` behavior. Initialize required configuration before first client use. Queries and mutations should surface API errors through the project's error handling convention; do not treat an error result as a successful mutation.

## Local page model example

The following paths and response fields are illustrative; verify them against the target schema.

```ts
// modules/interview/pages/assessment/model/queryKeys.ts
const NS = "INTERVIEW";
export const assessmentsKeys = {
  all: [NS, "assessments"] as const,
  current: () => [...assessmentsKeys.all, "current"] as const,
  history: (page?: number, limit?: number) =>
    [...assessmentsKeys.all, "history", page, limit] as const,
  skills: () => [...assessmentsKeys.current(), "skills"] as const,
};
```

```ts
// modules/interview/pages/assessment/model/useCurrentAssessmentQuery.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { getMainClient } from "@/shared/api/main-api-client";
import { unwrap } from "@/shared/api/utils/unwrap";
import { assessmentsKeys } from "./queryKeys";

export function useCurrentAssessmentQuery() {
  return useQuery({
    queryKey: assessmentsKeys.current(),
    queryFn: () =>
      unwrap(getMainClient().GET("/api/v1/assessments/current")),
  });
}
```

```tsx
// modules/interview/pages/assessment/ui/index.tsx
"use client";

import { useCurrentAssessmentQuery } from "../model/useCurrentAssessmentQuery";

export default function AssessmentPage() {
  const assessment = useCurrentAssessmentQuery();
  if (assessment.isPending) return <div>Загрузка...</div>;
  if (assessment.isError) return <div>Ошибка загрузки</div>;
  if (assessment.data == null) return <div>Нет текущего assessment</div>;
  return <pre>{JSON.stringify(assessment.data, null, 2)}</pre>;
}
```

Replace the diagnostic rendering with actual feature UI. Calling a query hook in the component is normal; its definition and API/cache logic belong to the local model.

## Promoted models

After entity extraction, place query hooks, keys, and domain aliases in `entities/{entity}/model/`. After feature extraction, place action/mutation/form logic in `features/{feature}/model/`. Before extraction, these can remain local to the page.

Use schema aliases, for example:

```ts
import type { components } from "@/shared/api/main-api-schema";
export type Assessment = components["schemas"]["AssessmentDto"];
export type AssessmentStatus = Assessment["status"];
```

Give module namespaces unique values (`INTERVIEW`, `PAYMENTS`, `AUTH` are examples). Entity key factories distinguish resources and query parameters. For rooms, for example, use `[NS, "rooms", roomId]` for detail and `[NS, "rooms", "my", roomId]` for the current participant. Include inputs that affect the response in cache identity.

Features invalidate through the owning entity's exported keys, rather than copying literal key arrays:

```ts
// features/close-assessment/model/useCloseAssessment.ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMainClient } from "@/shared/api/main-api-client";
import { unwrap } from "@/shared/api/utils/unwrap";
import { assessmentsKeys } from "@/modules/interview/entities/assessment/model/queryKeys";

export function useCloseAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) =>
      unwrap(getMainClient().POST("/api/v1/assessments/close", {
        body: { roomId },
      })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assessmentsKeys.all }),
  });
}
```

Use the project's actual unwrap signature and response handling. Invalidate all affected resources required by the behavior, not only the example key. Context-dependent navigation/toasts belong in the caller or an explicit callback API rather than a reusable feature importing a page.

## State placement

- Server data/cache: TanStack Query, including mutation lifecycle. Hooks may be page-local until promoted.
- Ephemeral local UI state: component `useState`.
- Client state shared by distant components: use a Zustand store when useful, scoped to the actual owner. A page-local store may live in its `model/`; an entity-owned store belongs in that entity's `model/`.
- Store only UI/client state in Zustand, such as selected skill or sidebar state. Do not duplicate server cache there. Do not use React Query for ephemeral UI state.

Sharing client state within one page does not require extracting an entity or making the store global. Persistence across reloads is a separate requirement, not implicit in choosing Zustand.

## Forms

Use React Hook Form. Keep substantial validation, submit logic, and form coordination in the owning page/feature model. Native inputs use `register`; non-native controls use `Controller` with the control's actual value/change API.

```tsx
const form = useForm({ defaultValues: { email: "", level: "" }, mode: "onChange" });

<input {...form.register("email", { required: true })} />;

<Controller
  control={form.control}
  name="level"
  render={({ field }) => (
    <Select value={field.value} onValueChange={field.onChange} />
  )}
/>;
```

Reset from external initial data at the intended lifecycle boundary (for example opening an edit dialog). Track effect dependencies correctly and avoid repeatedly resetting unsaved input because a parent recreates the initial-data object. Read the target control's props rather than blindly spreading `field` into incompatible components.
