---
name: write-agents
description: "Create or update an AGENTS.md file for a target directory by reading flow artifacts and the code diff. Shared by the implementer (leaf layers) and phase-reorient (higher layers)."
---

Create or update an AGENTS.md file for a target directory. Sources the why from `.flow/` artifacts and the code diff — no human interview. Applies the layer specificity, redundancy, and token minimization rules from `AGENTS-WRITING-STANDARDS.md`.

## Instructions

### Step 1: Initialize

1. **Resolve target directory.** Use the argument if provided. Otherwise use the directory most directly touched by the current ticket.

2. **Read writing standards.** Read `AGENTS-WRITING-STANDARDS.md` at the repo root. Apply it to all output produced by this skill.

3. **Detect layer** from position in the repo:

   | Signal | Layer |
   |---|---|
   | Repo root | `root` |
   | Top-level named module or package directory | `module` |
   | Subdirectory inside a module | `component` |
   | Innermost directory containing the code being touched | `leaf` |

4. **Check for existing AGENTS.md:**
   - If `{target_dir}/AGENTS.md` exists → go to **Update Existing** below.
   - Otherwise → continue to Step 2.

**Update Existing:**

1. Read the existing `{target_dir}/AGENTS.md`.
2. Re-derive from current code (Step 3) and current artifacts (Step 4).
3. Identify:
   - **Stale content** — references code that no longer exists, or decisions that have been superseded.
   - **Gaps** — new why visible in the diff or artifacts that is not documented.
   - **Thin sections** — rationale that exists but lacks the decision-reasoning behind it.
4. Present findings before writing. Only change what has changed. Preserve accurate content.

---

### Step 2: Load Ancestor Chain

1. Walk from the target directory up to the repo root.
2. Read every `AGENTS.md` in ancestor directories.
3. Build an internal summary of what is already documented at parent levels.
4. Use this to filter output: never restate anything already covered by an ancestor.

---

### Step 3: Scout Directory

1. Read the source files in the target directory (and immediate subdirectory listing for non-leaf layers).
2. Understand what modules, interfaces, or components are in scope.
3. Read the diff for this ticket — `git diff HEAD` or against the commit before this ticket started — to see what actually landed.

---

### Step 4: Load Flow Artifacts

Read the artifacts that capture the why behind this code:

| Artifact | What it provides |
|---|---|
| `.flow/phases/<phase>/tickets/<slug>.md` | Acceptance criteria, interface named, constraints — primary intent-why source |
| `.flow/phases/<phase>/summaries/<slug>.md` | Key decisions from implementation — primary discovered-why source |
| `.flow/phases/<phase>/phase-spec.md` | Phase goal, testing decisions, architecture assertions |
| `.flow/milestone-spec.md` | Module interfaces, zone, allowed deps, forbidden move |
| `.flow/CONTEXT.md` | Ubiquitous language and project rules |
| `.flow/adr/*.md` | Hard decisions relevant to this area |

For higher-layer writes (invoked by `phase-reorient`): also read all task summaries from the phase and the phase-reorient summary, and all tickets in the phase. Cross-task patterns only visible at the phase level are the primary input for higher-layer why.

If grilling output exists for this phase (inline grilling notes, prior phase-spec drafts), read those too — they are the richest source of intent-why.

---

### Step 5: Derive Why

Combine the code scout (Step 3) and flow artifacts (Step 4) to answer, for this layer only:

- **Purpose** — why does this layer / component exist? what problem does it solve?
- **Intent-why** — why this seam? what must it never do? (from ticket + spec + grilling artifacts)
- **Discovered-why** — what was only learned during implementation? (from done-summary + diff)
- **Constraints** — non-negotiable limits and their origin
- **Patterns** — conventions that tooling does not enforce

Apply layer specificity before writing: anything already in an ancestor, or only true for one child, does not belong here. If the ancestor chain fully covers the why, the correct output is nothing — do not write a redundant restatement.

---

### Step 6: Write or Update AGENTS.md

Produce `{target_dir}/AGENTS.md` using this format:

```markdown
# {Layer or Component Name}

{1-sentence scope description precise enough to make what doesn't belong self-evident.}

## Purpose

{Why this layer exists and what problem it solves.}

## Decisions

{Why this approach over alternatives. What was rejected and why.}

## Constraints

{Non-negotiable limits and their origin.}

## Patterns

{Conventions that tooling does not enforce.}
```

Omit any section that has nothing new to say after the ancestor filter. An AGENTS.md with only one non-empty section is correct if that is all that is new at this layer.

Before writing, validate against `AGENTS-WRITING-STANDARDS.md`:

- No content duplicating a parent AGENTS.md.
- No explicit "do not" exclusion sections — sharpen the scope description instead.
- Bullets over prose. No introductory or summary sentences.
- No nested bullets beyond two levels.

---

### Step 7: Confirm

State:
1. The file written or updated (path).
2. What was new at this layer — the non-inherited content added.
3. What was left out because an ancestor already covers it.
