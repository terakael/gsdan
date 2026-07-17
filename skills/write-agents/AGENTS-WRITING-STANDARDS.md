# AGENTS.md Writing Standards

Read this file before creating or modifying any AGENTS.md file.

---

## Role of AGENTS.md Files

AGENTS.md files are the durable why, anchored to code location. Together they form a layered contract: an agent or engineer working anywhere in the codebase loads the full ancestor chain and receives complete, non-redundant context for that scope.

Code describes *what* and *how*. AGENTS.md captures *why* — the reasoning that cannot be recovered from reading the code alone.

**The sharp rule:** if a fact answers "what are we building / is it done", it belongs in `.flow/`. If it answers "why is this code shaped this way", it belongs in `AGENTS.md`.

`.flow/` is temporal — organized by the delivery loop, goes stale once a milestone ships. AGENTS.md files are spatial — anchored to directories, outliving any single milestone and accumulating across them.

---

## Capture the Why

The most important content in any AGENTS.md is what disappears when the author leaves:

- **Purpose** — why this component exists; what problem it solves; who depends on it
- **Decision reasoning** — why this approach over the alternatives considered; what was explicitly rejected and why
- **Constraints** — non-negotiable limits and their origin (performance, upstream dependency, historical incident)
- **Patterns** — conventions that are not enforced by tooling but must be followed
- **Forbidden moves** — what must never happen at this layer, and why

If something can be derived by reading the code, it belongs in the code. If it cannot — if it requires context outside the codebase — it belongs here.

---

## Intent-why vs Discovered-why

Two kinds of why arrive at different times.

**Intent-why** is known before writing code: why this component exists, what problem it solves, what it must never do, where the seam goes. Source: the ticket, grilling artifacts, milestone-spec, ADRs. Write this during the red step, alongside the failing tests.

**Discovered-why** only exists after writing code: a constraint hit during implementation, an approach chosen over an alternative that failed, a trade-off that only became visible once the code took shape. Append this during the drive to green.

A layer may have nothing new to say if the ancestor chain already covers both. "Nothing new at this layer" is a valid and correct result — not a redundant restatement.

Design-check bonus: if you can't state, in a sentence, why a seam exists and what it must never do before filling it, the interface is unclear. That is an escalation signal, not something to guess through.

---

## Layer Specificity

Each file covers **only its own layer**. Include only what is universally true for everything in this subtree and not already stated by any ancestor.

Before adding any content, apply these filters:

- **Already in a parent?** Remove it — it is redundant and will drift independently.
- **Only applies to one child directory?** Move it to that child — it is sibling noise for all other children.
- **True for some but not all things in this subtree?** It does not belong at this level.

The correct result: a reader who has loaded all ancestor files needs only this file to fully understand this layer — no more, no less.

---

## Implicit Scope

Describe what a layer *is* precisely enough that what it *isn't* becomes obvious. Explicit exclusion sections ("When not to use", "Do not put here") are a signal the description is not precise enough.

Instead of:
> Adapters wrap external systems. Do not put domain logic here.

Write:
> Adapters translate between domain types and external system types. An adapter contains no domain policy — if it stopped running, the domain model would be unaffected.

The second version makes the boundary self-evident. Any domain policy plainly fails the description.

---

## Token Minimization

Use the fewest tokens needed to fully specify scope.

- Bullet points over prose
- One concept per bullet
- No introductory or summary sentences
- No examples unless the concept cannot be expressed without one
- Tables for comparisons or multi-attribute lists
- Omit anything derivable from context or from reading the code

---

## Format

- **H1**: layer or component name only
- **H2**: section headings
- Bullets for most content; numbered lists only when sequence matters
- Tables for type or option comparisons
- Code blocks only for actual commands or non-obvious code patterns
- No nested bullets beyond two levels

---

## Living Spec

AGENTS.md files evolve with the codebase. Any change that affects a layer's scope, patterns, constraints, or reasoning requires a corresponding update in the same commit.

AGENTS.md ships in the same commit as the code and tests. Spec and code are one artifact — they never land separately. When modifying code, ask: does this change invalidate or extend anything in the relevant AGENTS.md? If yes, update it.
