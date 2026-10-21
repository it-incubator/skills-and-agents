---
name: in-urls-for-project
description: Return a project's production, staging, GitHub, and Dokploy project links from docs/project-links.md in a fixed format. Ask for missing URLs or explicit permission to search; never discover them automatically. Maintain the document using in-docs-write conventions. Use for "project urls", "project links", "prod and staging links", "dokploy project link", "ссылки проекта", "урлы проекта", "ссылки на прод и стейджинг", or "ссылка на проект в dokploy".
---

# URLs for Project

## Purpose
Give developers the project's essential links in one place and preserve them under `docs/` for future sessions and teammates. Return production and staging application URLs, the GitHub repository URL, and the Dokploy project links for production and staging when those environments use Dokploy.

## Steps

### 1. Read only the canonical links document
- Resolve the target repository from the user's context; `git rev-parse --show-toplevel` is allowed to locate its root.
- The canonical URL source is exactly `<repo_root>/docs/project-links.md`, using the format in step 4. Check this exact path and read it if present. Do not search for alternative documents or URLs.
- Project instructions still apply, but ordinary lookup must not scan repository folders, other docs, README files, code, deployment configuration, Git remotes, or external integrations for links. Reading `docs/INDEX.md` for documentation maintenance does not authorize URL discovery through its entries.
- Return only URLs explicitly recorded in the canonical table or supplied by the user in this conversation. Do not derive missing URLs, even the GitHub URL from a remote.
- A lookup alone does not change files or bump `last_reviewed`.

### 2. Ask before discovering missing URLs
If the document is absent, unreadable, malformed, or missing required entries, state the specific problem. Return any valid entries already available; mark unresolved entries as `Unknown`.

Ask one batched question in the user's language with these choices:
- **Provide URLs manually:** ask for production, staging, GitHub, Dokploy production project, and Dokploy staging project (only the unresolved entries). The user may explicitly mark an environment or Dokploy entry as not applicable.
- **Authorize a search:** offer to scan the current repository, or other codebases the user identifies, for the missing URLs.

Wait for an explicit choice before searching. Invoking this skill, asking for project links, or authorizing document creation does not authorize a repository search. Silence does not authorize one either. If the user already explicitly requested a search in this conversation, proceed within that scope without asking again.

Only after search authorization:
- Inspect relevant docs, README sections, deployment workflows, tracked configuration, and Git remotes within the agreed repositories. Do not dump secret files or credentials.
- Convert a confirmed GitHub repository remote to its HTTPS web URL, removing `.git`; distinguish project and upstream/template repositories.
- Keep production and staging separate. Do not substitute localhost, preview deployments, or API URLs for application URLs.
- Find actual Dokploy dashboard project URLs. A webhook, application ID, or dashboard hostname alone is not a project link. Never invent dashboard routes or IDs. The same project URL may serve both environments when supported by evidence.
- Present discovered candidates and their sources, flag conflicts, and ask the user to resolve ambiguity before recording an authoritative value.

Whether links were read, supplied, or discovered, do not infer that an environment does not use Dokploy from missing information. Use `Not applicable` only when confirmed by the user or explicit evidence. Do not automatically probe URL availability; a recorded URL is not a claim that the site is currently live.

### 3. Firmly offer to save missing documentation
If `docs/project-links.md` is absent, always suggest creating it for future sessions and teammates. Combine this proposal with the missing-URL question rather than asking separately:

> 😠 `docs/project-links.md` is missing. Please provide the production, staging, GitHub, and both Dokploy project URLs, or explicitly authorize me to search the codebase for them. Let's save them in this document so you and other developers don't have to repeat this. Shall I create it once we have the values?

- If the document exists but has missing or malformed entries, offer to repair those entries in the same document.
- Be persistent: if the user answers only the URL questions and overlooks the save proposal, bring it up once more after incorporating their answers. On a later invocation, offer again if the document is still missing.
- Respect an explicit refusal or deferral for the current invocation. Do not loop, block useful recorded links, insult the user, or treat silence as consent.
- If the user already asked to create/save/document the links, proceed with supplied or already recorded values without asking again. This still does not authorize searching for missing values.
- If `docs/INDEX.md` is also missing, include the proposal to create a minimal index in the same question. Recommend `/in-docs-audit` for the broader corpus; do not launch a full audit or repository scan automatically.

### 4. Create or update the document with the docs skills
When documentation creation or correction is requested or accepted, read and apply `/in-docs-write`; consult `/in-docs-audit` for the index format when bootstrapping. Locate these sibling skills in the installed skills directory or this repository's `skills/` directory. If unavailable, explain the missing dependency rather than claiming compliance.

- Write exactly `docs/project-links.md`. Follow the project's documentation language for prose and metadata values, but preserve the literal table headers and keys below so future lookups are deterministic.
- Use an appropriate existing taxonomy type; default to `other` for a standalone links reference unless the project defines a suitable extension. Use the `other` template: title, `## Summary`, and free-form sections.
- Include every required field: `type`, `status`, `system`, `entities`, `answers`, `related`, `source_files`, `last_reviewed`. New documents start as `draft` unless instructed otherwise. Use today's date when writing or reviewing the document.
- Make `answers` route readers to these concrete questions: where production and staging are, where the GitHub repository is, and where each environment is managed in Dokploy.
- Use real repo-relative paths for `related` and `source_files`; empty arrays are valid when none exist. Cite the evidence for URLs in the body, including user-provided values when applicable.
- After the required YAML frontmatter, H1 title, and `## Summary`, use this exact table structure under the literal `## Links` heading:

  ```md
  ## Links

  | Key | URL / status |
  | --- | --- |
  | production | Unknown |
  | staging | Unknown |
  | github | Unknown |
  | dokploy-production | Unknown |
  | dokploy-staging | Unknown |
  ```

- Each key occurs exactly once. Replace `Unknown` with an absolute HTTP(S) URL formatted as a Markdown link, or `Not applicable — <confirmed reason>`. Keep unresolved values as `Unknown`; never insert plausible URLs. Duplicate keys, invalid URLs, or a different format require clarification/repair, not a fallback scan.
- Optional `## Notes` may explain sources, conflicts, and shared Dokploy projects. It does not replace the canonical table.
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
