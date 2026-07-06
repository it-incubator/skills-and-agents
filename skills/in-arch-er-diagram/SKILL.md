---
name: in-arch-er-diagram
description: Generate Entity Relationship diagrams in PlantUML format with detailed notes for each table. Use when user asks to create ER diagrams, database diagrams, schema diagrams, or says "er diagram", "erd", "схема базы данных", "диаграмма сущностей", "ER-диаграмма".
---

# ER Diagram Generator with Detailed Notes

Generate an Entity Relationship diagram in **PlantUML (.puml)** format with comprehensive explanatory notes for every table.

## Step 1 — Collect Source Documents

Ask the user to provide links to source documents (technical specifications, requirements, etc.) that describe the system. Read all provided documents before generating the diagram.

Say:
> Укажите ссылки на документы (техническое задание, спецификации, требования), на основе которых нужно построить ER-диаграмму.

Wait for the user to provide document paths. Read each document using the Read tool.

If the user has already provided documents in the current conversation (via @ mentions or direct paths), proceed with those — do not ask again.

## Step 2 — Analyze and Design

Based on the documents, identify:
- All entities (tables) needed
- Fields for each entity with types
- Primary keys, foreign keys, unique constraints
- Relationships between entities (1:1, 1:N, N:M)
- Enums and their values
- Business rules that affect the schema
- **Domain groups** — group tables by business domain or logical function (e.g., "Auth", "Billing", "Messaging", "Analytics")

## Step 3 — Generate the Diagram

### Output Format

**Always PlantUML (.puml) file. Never Mermaid.**

Generate a single `er-diagram.puml` file.

### PlantUML Rules

```plantuml
@startuml ER_Diagram
title Entity Relationship Diagram — [System Name]

skinparam linetype ortho
skinparam classFontSize 12

' ... entities colored by domain, notes, relationships, legend ...

@enduml
```

### Domain Coloring — MANDATORY

Every entity MUST be colored by its business domain. Tables belonging to the same domain share the same background color so that domain grouping is visible at a glance — without any wrapping rectangles or packages.

#### How to apply

1. Identify 2–6 logical domains from the source documents
2. Assign each domain a distinct color from the palette below
3. Apply the color directly to each `entity` using the `#HexColor` suffix
4. Add a legend at the bottom of the diagram listing domain → color mapping

#### Color Palette

Use these colors in order. If more than 8 groups are needed, pick additional pastel colors that are visually distinct.

| #   | Color     | Hex       | Suggested domain type        |
|-----|-----------|-----------|------------------------------|
| 1   | Blue      | `#E3F2FD` | Core / main entities         |
| 2   | Green     | `#E8F5E9` | Users / auth / permissions   |
| 3   | Orange    | `#FFF3E0` | Billing / payments           |
| 4   | Purple    | `#F3E5F5` | Communication / messaging    |
| 5   | Teal      | `#E0F2F1` | Analytics / logs / audit     |
| 6   | Pink      | `#FCE4EC` | Content / media              |
| 7   | Yellow    | `#FFFDE7` | Configuration / settings     |
| 8   | Grey      | `#ECEFF1` | Infrastructure / system      |

The table above is a suggestion — match colors to actual domains from the spec, not mechanically.

#### Syntax

```plantuml
entity "table_name" as alias #HexColor {
    * **id** : uuid <<PK>>
    --
    * field : type
}
```

#### Legend

Add a legend block at the bottom of the diagram (before `@enduml`) to explain the color mapping:

```plantuml
legend right
    | Color | Domain |
    |<#E8F5E9>| Аутентификация |
    |<#FFF3E0>| Биллинг |
    |<#F3E5F5>| Коммуникации |
end legend
```

#### Example

```plantuml
entity "users" as user #E8F5E9 {
    * **id** : uuid <<PK>>
    --
    * email : text <<unique>>
    * password_hash : text
    * role : user_role
}

entity "sessions" as session #E8F5E9 {
    * **id** : uuid <<PK>>
    --
    * user_id : uuid <<FK users>>
    * token : text
    * expires_at : timestamptz
}

entity "payments" as payment #FFF3E0 {
    * **id** : uuid <<PK>>
    --
    * user_id : uuid <<FK users>>
    * amount : numeric(10,2)
}

legend right
    | Color | Domain |
    |<#E8F5E9>| Аутентификация |
    |<#FFF3E0>| Биллинг |
end legend
```

#### Guidelines

- If a table logically belongs to two domains, color it by the primary domain and mention the cross-domain link in the note
- Keep domains to 2–6 for readability
- Legend labels should be in the same language as the source documents

### Entity Syntax

Use PlantUML `entity` syntax:

```plantuml
entity "table_name" as alias {
    * **id** : uuid <<PK>>
    --
    * required_field : type <<constraints>>
    optional_field : type
}
```

- `*` prefix = NOT NULL (required field)
- `**bold**` = primary key
- `<<PK>>`, `<<FK table>>`, `<<unique>>` for constraints
- Use proper SQL-like types: `uuid`, `text`, `integer`, `bigint`, `boolean`, `timestamptz`, `jsonb`, `vector(N)`

### Notes — MANDATORY for Every Table

Every entity MUST have a `note right of` block. This is the key feature of this skill.

Each note must include:
1. **What is this table** — one bold sentence describing the entity
2. **When records are created** — what triggers a new row
3. **Key fields explained** — explain non-obvious fields, enums, computed values
4. **Business rules** — relevant constraints, lifecycle, permissions
5. **Relationships context** — how this table connects to others in business terms

Example:
```plantuml
note right of session
    **Сессия — одно обращение клиента.**
    Новая сессия создаётся, когда клиент
    пишет впервые или после статуса
    "Завершён".

    **ai_attempts_count** — счётчик
    ответов AI в рамках сессии.
    Максимум 3, после чего клиент
    переводится в "Ожидание менеджера".

    **closed_at** — заполняется при
    завершении. Автозакрытие через 24ч
    без активности.
end note
```

Guidelines for notes:
- Write in the same language as the source documents
- Keep lines short (≤40 chars) for readability in PlantUML rendering
- Use **bold** for field names and key terms
- Include specific numbers, thresholds, and limits from the spec
- Explain enum values where applicable
- Mention what the table does NOT store if it's non-obvious

### Relationships

Use PlantUML relationship syntax:
```
entity1 ||--o{ entity2 : "description"   ' one-to-many
entity1 ||--|| entity2 : "description"    ' one-to-one
entity1 }o--o{ entity2 : "description"    ' many-to-many
entity1 }o--o| entity2 : "description"    ' many-to-one (optional)
```

Group relationships by entity with a comment separator:
```plantuml
' === Relationships ===

parent ||--o{ child : "has many"
```

### File Placement

- If a `docs/architecture/` directory exists, place the file there
- Otherwise, place in `docs/` or project root
- Name the file `er-diagram.puml`

## Validate Syntax by Rendering

After writing the `.puml` file, render it to PNG to confirm the PlantUML syntax is valid — a file that fails to render is broken no matter how correct the source looks.

1. Render the generated `.puml` to PNG, e.g. `plantuml -tpng docs/architecture/er-diagram.puml` (adjust the path to wherever the file was placed). If PlantUML is not installed locally, fall back to any available renderer (Docker image `plantuml/plantuml`, the PlantUML server, etc.).
2. If the render fails, read the error, fix the `.puml` source, and re-render until it succeeds.
3. **Delete the generated PNG file once rendering succeeds** — it is only a syntax check, not an artifact of this skill. Leave only the `.puml` source.

Never leave `.png` files behind.

## Quality Checklist

Before finishing, verify:
- [ ] Every entity has a `#HexColor` suffix matching its domain
- [ ] Each domain uses a distinct color from the palette
- [ ] A `legend` block maps colors to domain names
- [ ] Every table has a detailed `note right of` block
- [ ] All foreign keys reference existing entities
- [ ] All relationships are drawn
- [ ] Field types are consistent (e.g., all PKs are `uuid`)
- [ ] Notes explain business logic, not just field types
- [ ] Enum values are documented in notes
- [ ] The diagram renders correctly as standalone PlantUML
- [ ] The `.puml` was rendered to PNG to verify syntax, and the PNG was deleted afterward
