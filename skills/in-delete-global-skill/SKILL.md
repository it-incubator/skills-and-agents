---
name: in-delete-global-skill
description: Delete a global Claude Code skill — both the symlink at ~/.claude/skills/ and the source-of-truth at /Users/it-kamasutra/.agents/skills/. Use when the user wants to remove/uninstall/delete an existing global skill or slash command. Trigger phrases: "delete a skill", "remove a skill", "uninstall skill", "удали скилл", "удали глобальный скилл", "delete global skill".
---

# Delete Global Skill

## Purpose
Remove an existing global skill from Claude Code — both ends of the symlink pattern set up by `in-add-global-skill`.

## Architecture (mirror of `in-add-global-skill`)
Global skills live in two places:
- **Source of truth**: `/Users/it-kamasutra/.agents/skills/<skill-name>/`
- **Symlink for Claude Code**: `~/.claude/skills/<skill-name>` → source-of-truth

Some skills may exist as a real directory at `~/.claude/skills/<skill-name>/` without a `.agents/` source (legacy / manually-installed). This skill handles both cases.

## Steps

### 1. List available global skills
```bash
ls -1 ~/.claude/skills/ 2>/dev/null
```

This is the canonical list of what's currently invokable in Claude Code. Note alongside it (for the confirmation step) which of these are symlinks vs real dirs:

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

If the user types a name that isn't in the list, abort with:
> Skill `<name>` was not found in `~/.claude/skills/`. Available: `<list>`.

### 3. Resolve target paths
- `link_path = ~/.claude/skills/<skill-name>`
- `source_path = /Users/it-kamasutra/.agents/skills/<skill-name>`

Check what exists:
- `link_path` may be a **symlink** (`-L`), a **real directory** (`-d` and not `-L`), or absent.
- `source_path` may be a directory or absent.

### 4. Show what will be deleted and confirm
Print a summary like:

```
About to delete skill: <skill-name>

  Symlink/dir: ~/.claude/skills/<skill-name>   [symlink → /Users/it-kamasutra/.agents/skills/<skill-name>]
  Source dir:  /Users/it-kamasutra/.agents/skills/<skill-name>   [exists, N files]

This is irreversible. Proceed?
```

If the source dir doesn't exist, say `(none)` for that line.

Ask **Proceed?** (yes/no). Default: **No**. Abort on no.

### 5. Delete
Order matters: remove the symlink/link first so Claude Code stops seeing the skill, then remove the source.

```bash
# Symlink: rm -f removes only the link, not the target. Safe.
# Real dir: needs rm -rf.
if [ -L "<link_path>" ]; then
  rm -f "<link_path>"
elif [ -d "<link_path>" ]; then
  rm -rf "<link_path>"
fi

# Then remove the source-of-truth, if it exists.
if [ -d "<source_path>" ]; then
  rm -rf "<source_path>"
fi
```

Do **not** use `rm -rf` on a symlink target by mistake — always test `-L` first.

### 6. Verify
```bash
ls ~/.claude/skills/<skill-name> 2>&1 | head -1
ls /Users/it-kamasutra/.agents/skills/<skill-name> 2>&1 | head -1
```

Both should report "No such file or directory".

### 7. Report
Print:

```
Deleted skill: <skill-name>
  Removed: ~/.claude/skills/<skill-name>
  Removed: /Users/it-kamasutra/.agents/skills/<skill-name>   (or "not present")
```

If a restart of Claude Code is needed for the change to take effect, mention it once.

## Safety rules
- **Always confirm** before deleting. This skill is irreversible — no `.bak`, no undo.
- **Never delete more than one skill per invocation.** If the user wants to delete multiple, re-run the skill.
- **Never delete the parent dirs** `~/.claude/skills/` or `/Users/it-kamasutra/.agents/skills/` — only the named child.
- **Never follow a symlink with `rm -rf`** — test `-L` first and use `rm -f` on links.
- If the chosen skill is `in-delete-global-skill` itself, warn explicitly: "You are about to delete the delete-skill skill. You won't be able to re-run /in-delete-global-skill after this. Proceed?"

## Trigger phrases
- `/in-delete-global-skill`
- "delete a skill"
- "remove a global skill"
- "uninstall skill"
- "удали скилл"
- "удали глобальный скилл"
- "delete global skill"
