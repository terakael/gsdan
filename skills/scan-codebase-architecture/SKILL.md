---
name: scan-codebase-architecture
description: "Accumulated-shape architecture sweep. Scans the code a phase touched for deep-module leaks visible only in aggregate. Returns a structured findings list."
---

A per-ticket diff review is blind to smells that grow one commit at a time. A 13-arm
match never looks wrong when a ticket adds the 13th arm — it looks like "+1 arm". Only
the accumulated shape reveals the leak. This skill is that look.

## Steps

### 1. Load the guardrails

Read these before any code:

- `.flow/milestone-spec.md` — module interfaces and phase list
- `.flow/CONTEXT.md` — glossary and rules
- `.flow/adr/*.md` — accepted decisions

A snapshot of code will look shallow in places that are shallow on purpose: a stubbed
port wired ahead of its phase, a public seam the spine deliberately exposes. The roadmap
is the difference between a real leak and an intended tracer. Hold this before the walk.

### 2. Scope the walk

The code this phase touched, not the whole repo. Derive from files named in
`summaries/*.md`, or from `git diff <phase-base>...HEAD`.

### 3. Explore

Delegate to a recon subagent so file contents stay out of your context. Point it at the
scoped slice and the guardrails from step 1. Use `/codebase-design` vocabulary
throughout: **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**,
**locality**.

Hunt the accumulated smells the diff can't see:

- **Leaked knowledge** — a fact that belongs inside a type re-derived at call sites via
  repeated match cascades. The tell: adding a variant edits several call sites, not one.
- **Duplicated shape** — the same logic shape in more than one place because it grew a
  piece at a time.
- **Shallow interface** — a signature that widened as the code grew until the interface
  is nearly as complex as the body.
- **Seam before variance** — an extension point with one thing behind it and no second
  on the horizon. Check the roadmap first: a spine seam awaiting a named phase is not
  this.

Apply the **deletion test** to each suspect: would removing it concentrate complexity,
or just move it? Only "concentrates" is a finding.

### 4. Return the findings

For each finding:

- **Files** — file:line where possible
- **Problem** — in `/codebase-design` terms
- **Solution** — plain English; propose the change, not the interface design
- **Strength** — `Strong` | `Worth exploring` | `Speculative`
- **Drift-from-vision?** — `yes` if the code drifted from where `milestone-spec.md` says
  the seam goes; `no` if it is a net-new deepening the vision never called for
- **One-ticket-sized?** — `yes` or `no`
- **Spec/ADR conflict?** — `none`, or name it for borderline cases the guardrail read
  didn't settle

A finding is a concrete leak the code exhibits right now — deletion-test positive, not
accounted for in the roadmap. When in doubt, leave it out.
