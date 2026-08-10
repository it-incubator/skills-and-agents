---
name: in-add-global-skill
description: Add a new personal global skill for Claude Code, available in all the developer's projects. Use when the user wants to create/add/register a new skill or slash command globally. Trigger phrases — "добавь скилл", "создай скилл", "add a skill", "create a new skill", "register a global skill", "new slash command".
---

# Add Global Skill

## Purpose
Create a **personal** global skill so it is available in all of the developer's projects via Claude Code.

This is for skills that belong to one developer. **Team skills do not go here** — they live in this repo under `skills/` and reach the developer's global config through `/in-sync-skills`.

## Architecture
A global skill is a plain directory in the developer's home config:

```
~/.claude/skills/<skill-name>/SKILL.md
```

Nothing else. No source-of-truth elsewhere, no symlink: a symlink needs Administrator or Developer Mode on Windows, and a second location is one more thing to keep in sync for no benefit. This matches how `/in-sync-skills` distributes team skills — real directories, never links.

## ⚠️ Before choosing a name — two collision rules

1. **A global skill silently overrides a project skill with the same name.** Precedence for skills is enterprise → personal → project, so `~/.claude/skills/deploy/` wins over `<project>/.claude/skills/deploy/` — and the project's version stops appearing in the model's skill list entirely. Pick a name no project you work on is likely to use.

2. **Do not use the `in-` prefix.** It is this team repo's namespace. `/in-sync-skills` overwrites `~/.claude/skills/in-*` from the repo, so a personal skill called `in-something` will be silently clobbered the moment the team adds a skill by that name.

## Input
The user provides either:
- A skill name + description of what it should do (you generate the SKILL.md content)
- A skill name + ready-made markdown content (you use it as-is or wrap it properly)
- Arguments: `$ARGUMENTS` — treated as the skill name if a single word, or "name: description" if longer

## Steps

1. **Determine the skill name**:
   - Derive from user input or `$ARGUMENTS`.
   - Normalize: lowercase, hyphens instead of spaces, no special chars. Max 64 chars.
   - Example: "Archive Branch" → `archive-branch`
   - Reject a name starting with `in-` (see the collision rules above) and ask for another.

2. **Check whether the skill already exists**:
   ```bash
   ls ~/.claude/skills/<skill-name>/SKILL.md
   ```
   If it exists, ask the user: overwrite or pick a different name?

3. **Create the skill directory**:
   ```bash
   mkdir -p ~/.claude/skills/<skill-name>
   ```

4. **Write `SKILL.md`** at `~/.claude/skills/<skill-name>/SKILL.md`:
   - Must include YAML frontmatter with at least `name` and `description`.
   - `name` must equal the directory name.
   - The `description` field is critical — Claude uses it to decide when to auto-invoke the skill.
   - Include trigger phrases in the description if the user provides them.

   ```yaml
   ---
   name: <skill-name>
   description: <when to use this skill — be specific>
   ---

   <Skill instructions in markdown>
   ```

5. **Verify**:
   ```bash
   ls -la ~/.claude/skills/<skill-name>
   head -5 ~/.claude/skills/<skill-name>/SKILL.md
   ```
   Confirm the directory is a real directory (not a link) and that `name` in the frontmatter matches the directory name.

## Output
After completion, report:
- Skill name
- File path: `~/.claude/skills/<skill-name>/SKILL.md`
- How to invoke: `/<skill-name>`, or the trigger phrases that auto-invoke it

New skills are picked up without restarting the session.

## Guidelines for writing good skills
- `description` in frontmatter should clearly state WHEN to use the skill (Claude auto-invokes based on this)
- Include example trigger phrases if relevant (in English and Russian if the user uses both)
- Keep instructions actionable and specific — tell Claude exactly what to do, not vague guidelines
- Use `disable-model-invocation: true` only if the skill should never be auto-invoked
- Add `user-invocable: false` only if the skill should be invisible from the slash-command menu

## Trigger phrases
- "добавь скилл"
- "создай скилл"
- "add a skill"
- "create a new skill"
- "register a global skill"
- "new slash command"
