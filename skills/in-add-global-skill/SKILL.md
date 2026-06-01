---
name: in-add-global-skill
description: Add a new global skill for Claude Code. Use when the user wants to create/add/register a new skill, slash command, or agent capability globally.
---

# Add Global Skill

## Purpose
Create a new global skill so it's available in all projects via Claude Code.

## Architecture
Skills are stored in two places with a symlink pattern:
- **Source of truth**: `/Users/it-kamasutra/.agents/skills/<skill-name>/SKILL.md`
- **Symlink for Claude Code**: `~/.claude/skills/<skill-name>` → `/Users/it-kamasutra/.agents/skills/<skill-name>`

## Input
The user provides either:
- A skill name + description of what it should do (you generate the SKILL.md content)
- A skill name + ready-made markdown content (you use it as-is or wrap it properly)
- Arguments: `$ARGUMENTS` — treated as the skill name if a single word, or "name: description" if longer

## Steps

1. **Determine skill name**:
   - Derive from user input or `$ARGUMENTS`.
   - Normalize: lowercase, hyphens instead of spaces, no special chars. Max 64 chars.
   - Example: "Archive Branch" → `archive-branch`

2. **Check if skill already exists**:
   - Check `/Users/it-kamasutra/.agents/skills/<skill-name>/SKILL.md`
   - If exists, ask user: overwrite or pick a different name?

3. **Create skill directory**:
   ```bash
   mkdir -p /Users/it-kamasutra/.agents/skills/<skill-name>
   ```

4. **Write SKILL.md**:
   - Create `/Users/it-kamasutra/.agents/skills/<skill-name>/SKILL.md`
   - Must include YAML frontmatter with at least `name` and `description`
   - The `description` field is critical — Claude uses it to decide when to auto-invoke the skill
   - Include trigger phrases in the description if the user provides them
   - Format:
     ```yaml
     ---
     name: <skill-name>
     description: <when to use this skill — be specific>
     ---

     <Skill instructions in markdown>
     ```

5. **Create symlink**:
   ```bash
   ln -s /Users/it-kamasutra/.agents/skills/<skill-name> /Users/it-kamasutra/.claude/skills/<skill-name>
   ```
   - If symlink already exists (from a previous version), remove it first:
     ```bash
     rm -f /Users/it-kamasutra/.claude/skills/<skill-name>
     ```

6. **Verify**:
   - Confirm the symlink resolves correctly:
     ```bash
     ls -la ~/.claude/skills/<skill-name>
     cat ~/.claude/skills/<skill-name>/SKILL.md | head -5
     ```

## Output
After completion, report:
- Skill name
- File path: `/Users/it-kamasutra/.agents/skills/<skill-name>/SKILL.md`
- Symlink: `~/.claude/skills/<skill-name>`
- How to invoke: `/<skill-name>` or describe a trigger phrase

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
