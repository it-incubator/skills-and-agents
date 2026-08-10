---
name: in-delete-global-skill
description: Delete a global Claude Code skill from the developer's `~/.claude/skills/`. Use when the user wants to remove/uninstall/delete an existing global skill or slash command. Trigger phrases — "delete a skill", "remove a skill", "uninstall skill", "удали скилл", "удали глобальный скилл", "delete global skill".
---

# Delete Global Skill

## Purpose
Remove a global skill from the developer's Claude Code config — the mirror of `in-add-global-skill`.

## Architecture
A global skill is a plain directory:

```
~/.claude/skills/<skill-name>/
```

Older setups may leave a **symlink** there instead, pointing at a source directory elsewhere. This skill handles both, but never deletes a symlink's target automatically — see step 5.

## ⚠️ Team skills come back
Skills named `in-*` are this team's namespace: they live in the skills-and-agents repo and are re-installed by `/in-sync-skills`. Deleting one here removes it only until the next sync.

If a team skill should go away for good, it has to be removed from the repo — then `/in-sync-skills` detects it as an orphan and offers to delete it. Warn the user before deleting any `in-*` skill, and mention that `in-sync-skills` itself must never live in a global config at all.

## Steps

### 1. List available global skills
```bash
ls -1 ~/.claude/skills/ 2>/dev/null
```

Note which entries are symlinks rather than real directories — this matters at the confirmation step:

```bash
for s in ~/.claude/skills/*; do
  name=$(basename "$s")
  if [ -L "$s" ]; then
    echo "$name (symlink → $(readlink "$s"))"
  else
    echo "$name (real dir)"
  fi
done
```

If the list is empty, abort with:
> No global skills found in `~/.claude/skills/`. Nothing to delete.

### 2. Ask the user which skill to delete
Present the list as a single-select question. Argument shortcut: if `$ARGUMENTS` already names a skill that exists in the list, skip the question and use that.

If the user names something that isn't in the list, abort with:
> Skill `<name>` was not found in `~/.claude/skills/`. Available: `<list>`.

### 3. Resolve the target
- `target = ~/.claude/skills/<skill-name>`
- It is either a **symlink** (`-L`), a **real directory** (`-d` and not `-L`), or absent.
- If it is a symlink, record `readlink "$target"` — you will report that path, not delete it.

### 4. Show what will be deleted and confirm
```
About to delete skill: <skill-name>

  Path: ~/.claude/skills/<skill-name>   [real dir, N files]
        (or: [symlink → <target>] — the link is removed, the target is left alone)

This is irreversible. Proceed?
```

If the skill is named `in-*`, add:
> This is a team skill. `/in-sync-skills` will re-install it on the next run.

Ask **Proceed?** (yes/no). Default: **No**. Abort on no.

### 5. Delete
```bash
if [ -L "<target>" ]; then
  rm -f "<target>"          # removes only the link, never the target
elif [ -d "<target>" ]; then
  rm -rf "<target>"
fi
```

**Never `rm -rf` a symlink** — always test `-L` first, and never follow a link to delete whatever it points at. If the user wants the old source directory gone too, print its path and let them remove it themselves; it lives outside `~/.claude/skills/` and is not this skill's to delete.

### 6. Verify
```bash
ls ~/.claude/skills/<skill-name> 2>&1 | head -1
```
Should report "No such file or directory".

### 7. Report
```
Deleted skill: <skill-name>
  Removed: ~/.claude/skills/<skill-name>
  Symlink target left in place: <path>   (only if it was a symlink)
```

## Safety rules
- **Always confirm** before deleting. This is irreversible — no `.bak`, no undo.
- **Never delete more than one skill per invocation.** To delete several, re-run the skill.
- **Never delete the parent dir** `~/.claude/skills/` — only the named child.
- **Never follow a symlink with `rm -rf`** — test `-L` first, use `rm -f` on links.
- If the chosen skill is `in-delete-global-skill` itself, warn explicitly: "You are about to delete the delete-skill skill. You won't be able to re-run `/in-delete-global-skill` after this. Proceed?"

## Trigger phrases
- `/in-delete-global-skill`
- "delete a skill"
- "remove a global skill"
- "uninstall skill"
- "удали скилл"
- "удали глобальный скилл"
- "delete global skill"
