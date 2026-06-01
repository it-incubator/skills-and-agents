---
name: swagger-fix
description: Organize and complete Swagger decorators for NestJS controllers. Creates proper decorator files, DTOs, response types with full ApiProperty coverage. Use when user says "swagger fix", "fix swagger", "swagger decorators", "приведи swagger в порядок", "swagger декораторы", "исправь свагер".
---

# Skill: Fix / Organize Swagger Decorators for NestJS

## Purpose
Analyze one specific controller (or every controller in the project) and bring its Swagger documentation to a complete, production-quality state:

- Every endpoint gets a **dedicated combined decorator function** (via `applyDecorators`) that lives in a separate file.
- Every `@Body()`, `@Query()`, and response type has a **proper DTO / output class** with exhaustive `@ApiProperty()` annotations.
- Enum fields carry `enumName`.
- Nullable fields explicitly set `nullable: true` and a concrete `type`.
- All realistic HTTP status codes are documented.
- Query-parameter DTOs are registered via `ApiExtraModels` and linked in the operation description with `genAnchorForQueryParamSchema`.

## Input

The user will invoke the skill in one of two ways:

1. **Single controller** — the user names a specific controller file or the file is open in the IDE.
2. **All controllers** — the user says "all" / "все" / "all controllers" / "для всех контроллеров".

If unclear, ask the user which controller(s) to process using `AskUserQuestion`.

## File Layout Convention

For a controller at:
```
src/modules/<module>/controllers/<name>.controller.ts
```

Create decorator files under:
```
src/modules/<module>/controllers/<name>.controller/decorators/<EndpointName>.decorator.ts
```

Also create an **index.ts** barrel that re-exports every decorator from that folder.

If the controller sits directly inside a module folder (not in `controllers/`), use the same pattern relative to the controller file.

## Steps

### 1. Discover controllers
- If the user specified a controller, read that file.
- If "all", glob for `**/*.controller.ts` under `src/` and read each one.

### 2. For each controller, for each endpoint method:

#### a) Identify inputs and outputs
- Read the method signature: `@Body() dto`, `@Query() query`, `@Param()` params.
- Trace the return type / service call to understand the response shape.
- Read existing DTOs / entities / response classes used.

#### b) Ensure a proper Query DTO exists
- If query parameters are declared inline (e.g. `@Query('foo') foo: string`), create a new DTO class with `@ApiProperty()` on each field and refactor the controller to use `@Query() query: <DtoName>`.
- Place the Query DTO in the module's `domain/` folder (or `dto/` if that pattern exists).

#### c) Ensure a proper Response / Output class exists
- If the endpoint returns a raw entity or an untyped object, create a dedicated output class with full `@ApiProperty()` annotations.
- Place it alongside existing response files in the module.

#### d) Annotate every `@ApiProperty()` thoroughly

For each property in every DTO / output class touched:

| Scenario | Required `@ApiProperty()` options |
|---|---|
| **string** | `{ type: 'string' }` (can omit if obvious, but always add for nullable) |
| **number** | `{ type: 'number' }` |
| **boolean** | `{ type: 'boolean' }` |
| **enum** | `{ enum: MyEnum, enumName: 'MyEnum' }` |
| **nullable** | `{ type: 'string', nullable: true }` — always set both `type` AND `nullable` |
| **optional** | `{ required: false }` |
| **array** | `{ type: [ItemClass] }` or `{ type: 'string', isArray: true }` |
| **nested object** | `{ type: () => NestedClass }` |
| **Date** | `{ type: 'string', format: 'date-time' }` |

#### e) Create the combined endpoint decorator

```typescript
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiExtraModels } from '@nestjs/swagger';
import { genAnchorForQueryParamSchema } from '<path-to-util>';
// …imports…

export function <EndpointName>Decorator() {
  return applyDecorators(
    // If there is a query DTO — register it and link in description
    ApiExtraModels(QueryDto),
    ApiOperation({
      summary: '<short summary>',
      description: genAnchorForQueryParamSchema('QueryDtoName'),
    }),
    // 2xx
    ApiResponse({ status: 200, description: 'OK: …', type: OutputClass }),
    // 4xx / 5xx — all that realistically apply
    ApiResponse({ status: 400, description: 'Bad Request: …' }),
    ApiResponse({ status: 401, description: 'Unauthorized: …' }),
    ApiResponse({ status: 403, description: 'Forbidden: …' }),
    ApiResponse({ status: 404, description: 'Not Found: …' }),
    // etc.
  );
}
```

- If there is no query DTO for the endpoint, omit `ApiExtraModels` and `genAnchorForQueryParamSchema`.
- Choose status codes that make sense for the specific endpoint (don't blindly add all of them).

#### f) Apply the decorator to the controller

Replace the existing inline Swagger decorators on the method with the single combined decorator:

```typescript
@CreatePlanDecorator()
@Post('/plans')
async createPlan(@Body() dto: CreatePlanDto, @Param('ownerId') ownerId: string) { … }
```

Remove any now-redundant individual `@ApiOperation`, `@ApiResponse`, `@ApiOkResponse` etc. from the method — they live in the decorator now. Keep non-swagger decorators (`@UseGuards`, `@HttpCode`, etc.) on the method.

### 3. Create / update the `genAnchorForQueryParamSchema` utility

If the utility does not exist in the project, create it at:
```
src/core/swagger/gen-anchor-for-query-param-schema.ts
```

```typescript
export const genAnchorForQueryParamSchema = (schemaName: string) => {
  return `Query-parameters schema → [\`${schemaName}\`](#model-${schemaName})`;
};
```

### 4. Create barrel index files

For each decorator folder created, add an `index.ts` that re-exports all decorators:
```typescript
export * from './CreatePlan.decorator';
export * from './UpdatePlan.decorator';
// …
```

### 5. Verify imports

After all changes, make sure:
- Every new file has correct relative imports.
- The controller imports decorators from the barrel.
- No circular dependencies introduced.
- Run TypeScript compilation check if possible (`npx tsc --noEmit`).

## Rules

- **Do NOT remove non-swagger decorators** (`@UseGuards`, `@HttpCode`, `@Param`, `@Body`, `@Query`, route decorators).
- **Do NOT change business logic** — only swagger / documentation concerns.
- **Preserve existing comments** in controllers.
- **Use PascalCase** for decorator function names: `CreatePlanDecorator`, `GetPlansDecorator`.
- **Use PascalCase** for decorator file names: `CreatePlan.decorator.ts`.
- For `@Param()` parameters — do NOT create a separate DTO; use `@ApiParam()` inside the combined decorator if needed.
- When an endpoint uses `@UseGuards(ServerAuthGuard)` or similar, add the relevant auth error codes (401/403).
- Respect project's existing import style (relative paths, barrel imports, etc.).
- If a DTO or output class already exists and is well-annotated, reuse it — don't create duplicates.
- If a DTO exists but annotations are incomplete, fix the annotations in place.

## Trigger phrases
- "swagger fix"
- "fix swagger"
- "swagger decorators"
- "приведи swagger в порядок"
- "swagger декораторы"
- "исправь свагер"
- "fix swagger decorators"
- "организуй swagger"
