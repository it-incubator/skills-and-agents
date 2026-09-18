---
name: in-urls-for-project
description: Find and return a project's production, staging, GitHub, and environment-specific Dokploy project links; maintain a shared links document under docs/ using in-docs-write conventions. Use for "project urls", "project links", "prod and staging links", "dokploy project link", "ссылки проекта", "урлы проекта", "ссылки на прод и стейджинг", or "ссылка на проект в dokploy".
---

# URLs for Project

## Purpose
Give developers the project's essential links in one place and preserve them under `docs/` for future sessions and teammates. Return production and staging application URLs, the GitHub repository URL, and the Dokploy project links for production and staging when those environments use Dokploy.

## Steps

### 1. Find the shared links document
- Resolve the target repository from the user's context; use `git rev-parse --show-toplevel` when working inside it.
- Read project instructions and `docs/INDEX.md` first if present. Follow an existing index entry for project links, environments, or deployment access.
- If necessary, search `docs/` for the links. Reuse an existing document that owns them instead of creating a duplicate. Default for a new document: `docs/project-links.md`.
- Read the document before searching configuration. A lookup alone does not require changing files or bumping `last_reviewed`.

### 2. Resolve missing or conflicting links
- Inspect relevant README sections, deployment workflows, tracked configuration, and Git remotes. Use targeted searches; do not dump secret files or credentials.
- Derive the GitHub web URL from the correct repository remote, converting SSH syntax to HTTPS and removing `.git`. Distinguish the project's repository from a template or upstream remote; if ambiguous, ask which one represents this project.
- Keep production and staging separate. Do not substitute localhost, preview deployments, API URLs, or staging domains for a production application URL. If a project has multiple apps, label each app's links explicitly.
- For Dokploy, find the actual dashboard project URL for each environment from existing docs, configuration, user input, or an available authorized read-only integration. A deploy webhook, application ID, or dashboard hostname alone is not a project link. Never invent dashboard routes or IDs.
- If both environments belong to the same Dokploy project, repeating its URL is correct; label the environments and include environment-specific deep links only when known.
- Record `Not found` for unknown URLs. Use `Not applicable — not hosted on Dokploy` only with evidence that the environment does not use Dokploy. Missing Dokploy configuration alone does not prove this. Similarly, mark an environment as absent only when confirmed.
- When sources disagree, expose the conflict and ask for the authoritative value instead of silently overwriting a documented link. Batch unresolved questions together and return the links already known.
- Do not claim a URL is live merely because it appears in a file. If checking availability is useful, use a read-only request and report the result accurately; a login page or authorization error does not prove a private link is invalid.

### 3. Firmly offer to save missing documentation
If no shared links document exists under `docs/`, always suggest creating one, even if all URLs were found elsewhere. First show the discovered links and the proposed document path so the user can assess what will be saved.

Ask directly in the user's language, for example:

> 😠 These project links aren't saved in `docs/`. Let's put them in `docs/project-links.md` so future you and other developers don't have to hunt for them again. Shall I save the links above and mark the missing ones as unknown?

- Be persistent: if the user answers only the URL questions and overlooks this proposal, bring it up once more after incorporating their answers. On a later invocation, offer again if the document is still missing.
- Respect an explicit refusal or deferral for the current invocation. Do not loop, block the useful links, insult the user, or treat silence as consent.
- If the user already asked to create/save/document the links, that is authorization: proceed without asking again.
- If `docs/INDEX.md` is also missing, include that fact and the proposal to create a minimal index in the same question. Recommend `/in-docs-audit` for the broader documentation corpus; do not launch an unrelated full audit just to save these links.

### 4. Create or update the document with the docs skills
When documentation creation or correction is requested or accepted, read and apply `/in-docs-write`; consult `/in-docs-audit` for the index format when bootstrapping. Locate these sibling skills in the installed skills directory or this repository's `skills/` directory. If unavailable, explain the missing dependency rather than claiming compliance.

- Follow the project's documentation language and placement conventions, keeping this document under `docs/`.
- Use an appropriate existing taxonomy type; default to `other` for a standalone links reference unless the project defines a suitable extension. Use the `other` template: title, `## Summary`, and free-form sections.
- Include every required field: `type`, `status`, `system`, `entities`, `answers`, `related`, `source_files`, `last_reviewed`. New documents start as `draft` unless instructed otherwise. Use today's date when writing or reviewing the document.
- Make `answers` route readers to these concrete questions: where production and staging are, where the GitHub repository is, and where each environment is managed in Dokploy.
- Use real repo-relative paths for `related` and `source_files`; empty arrays are valid when none exist. Cite the evidence for URLs in the body, including user-provided values when applicable.
- Add a `## Links` table with the five entries below, and optional `## Notes` for missing values, conflicts, and shared Dokploy projects. Persist unknown values honestly rather than inserting plausible URLs.
- Save only shareable URLs: omit tokens, passwords, signed access parameters, and deployment webhook secrets.
- Update `docs/INDEX.md` in the same change, with matching metadata, the correct type group, and a domain entry if needed. Preserve unrelated entries.
- Verify complete YAML frontmatter, today's `last_reviewed`, and a matching index entry. Leave the changes uncommitted.

### 5. Return the links
Use clickable Markdown links and keep all five entries visible, including unknown or inapplicable ones:

| Destination | URL / status |
| --- | --- |
| Production | Link or explicit status |
| Staging | Link or explicit status |
| GitHub | Repository link or explicit status |
| Dokploy — production project | Project link or explicit status |
| Dokploy — staging project | Project link or explicit status |

Link to the shared document if it exists. State whether it was read, created, or updated; after writes, report the metadata/index verification. If documentation is still missing, include the firm save proposal from step 3, subject to its refusal and repetition limits.
