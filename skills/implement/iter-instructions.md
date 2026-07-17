# Per-Iteration Instructions

These instructions apply to every fresh pi instance the implement loop spins up.
You have one job: complete the ticket assigned to you, or fail cleanly with a useful summary.

---

## 1. Orient to the vision

Read `milestone-spec.md` first. Understand the module interfaces in your area. Your
job is to build the minimal slice the ticket asks for — no more (YAGNI on scope) — but
place your seams exactly where the vision says they go (build with the grain on
structure). Use `/codebase-design` vocabulary when thinking about where seams go.

Also read the ancestor chain of `AGENTS.md` files for the directories this ticket will
touch (walk from the target directory up to the repo root, read each one). This is your
best local context for why the code around you is shaped the way it is.

## 2. Check for uncommitted changes

If the prior summary has `status: failed` or mentions an escalation, there may be
uncommitted changes in the working tree from the last attempt. Read the summary to
understand what was tried. Decide: is the partial work worth keeping and building on,
or should you reset it (`git stash` or `git checkout -- .`) and start clean? Document
your choice in the summary you write.

## 3. Write the acceptance tests and intent-why

**Before writing any code**, do two things in the red step:

**a. Intent-why into AGENTS.md.** Run `/write-agents` for each directory the ticket
will touch. State the intent-why not already covered by the ancestor chain: why this
seam exists, what it must never do, the constraints from the ticket. "Nothing new at
this layer" is a valid and correct output — do not restate what ancestors already
cover. If you cannot state, in a sentence, why the seam exists and what it must never
do, the interface is unclear — treat that as an escalation signal, exactly like "this
criterion can't be tested cleanly at the seam."

**b. Failing tests.** Turn every acceptance criterion in the ticket into a failing
test, written at the interface seam named in the ticket's **Interface (test surface)**
section. Watch each fail for the right reason. Do not write production code yet.

Test external behaviour at that seam only — not implementation details. If a criterion
can't be tested cleanly at the seam, stop: the interface is probably the wrong shape.
That's an escalation (see below).

## 4. Test-review gate

Before writing any production code, get the failing tests reviewed by fresh eyes. You
wrote them, so you're the worst judge of their gaps. The AGENTS.md intent-why should
also be staged at this point — it goes into the same commit, and a reviewer who sees
both can flag a mismatch early.

Spawn a reviewer subagent. Give it: this ticket (acceptance criteria, Interface,
Constraints), the phase-spec's Testing Decisions and Architecture Assertions, the
`milestone-spec.md` entry for the interface the ticket names, and the failing tests
you just wrote.

Tell it to **enumerate the missing test cases** — not just approve. A reviewer that
must list gaps can't rubber-stamp. Its checklist:

- **Adversarial / invalid inputs** — malformed, empty, out-of-range.
- **Boundary conditions** — zero, max, off-by-one, edges of the grid/range.
- **Generative or randomised behaviour** — multiple seeds or properties, not one
  example tuned to pass.
- **Behaviour, not trivia** — no "type is exported" tests; each test asserts real
  behaviour.
- **Right seam** — tests sit on the ticket's declared interface, not on internals,
  and don't span two interfaces.

Add the cases it finds as failing tests. If it finds the outcome can't be tested
cleanly at the seam, that's a design problem — escalate.

Bounded: if you and the reviewer haven't converged after 3 rounds, treat the ticket as
failed and write a failed summary.

## 5. Drive to green

Use `/tdd` to make the tests pass — one red-green slice at a time. Add finer-grained
inner tests as needed. Don't skip ahead. The ticket is code-complete when every
acceptance test and every case the reviewer added is green.

As decisions emerge during implementation — a constraint hit, an approach chosen over
an alternative that failed, a trade-off that only became visible once the code took
shape — append the discovered-why to AGENTS.md for the touched directories. Run
`/write-agents` again with the updated diff if it's easier than editing directly.

## 6. Code review and AGENTS fidelity review

When all acceptance criteria are met and tests are green, run two reviews in parallel:

**Code review:** run `/code-review` against the changes since the last commit (use the
last commit SHA or `main` as the fixed point, whichever is appropriate). Two-axis
review (Standards + Spec). Handle findings as before.

**AGENTS fidelity review:** spawn a fresh reviewer subagent. Give it: the code diff
and the AGENTS.md files for every directory this ticket touched. Have it check:

- Does the code actually do what the why claims?
- Is there a decision visible in the diff that the why doesn't explain?
- Is any stated rationale invented or contradicted by the code?

This is a green-side fresh-eyes check, complementing the test-review gate's red-side
check. Record the outcome — `pass`, `fail`, or `pass-with-notes` — for the
done-summary attestation.

For both reviews:

- If real issues are found: fix them. Ask the same reviewer to re-review. Repeat until
  satisfied.
- If you disagree with a finding (it conflicts with the ticket or milestone vision):
  note the disagreement in the summary's Key decisions section and proceed.
- If review iterations hit 3 without convergence: treat the ticket as failed.
  No commit. Write a failed summary.

## 7. On success

Commit tests, code, and AGENTS.md together:

```
feat(<ticket-slug>): <short description of what was built>
```

Example: `feat(02-auth-middleware): add JWT validation at the HTTP seam`

All three go in the same commit. Spec and code are one artifact.

If this phase-reorient step produces new tickets (fix-up or follow-on work), each new
ticket file **must start with YAML frontmatter** so the implement loop can parse it:

```markdown
---
slug: <ticket-slug>
blocks:
  - <blocking-slug>
  - <another-blocking-slug>
---
```

Use `blocks: []` when there are no blocking edges. The `blocks` list contains plain
slugs only — no backticks, no descriptions. Descriptions belong in the prose body.

Then write `.flow/phases/<phase>/summaries/<ticket-slug>.md`:

```
status: done

Module zone: <pure | shell | port>
Allowed dependencies: <values only | ports only | external system>
Forbidden move: <from the interface spec>
Pure boundary intact: <yes — evidence: ... | N/A - pure core>

AGENTS fidelity review: <pass | fail | pass-with-notes> — <brief finding or reviewer id>

## What was built
<one or two sentences: what the ticket delivered>

## Key decisions
<any implementation decisions made mid-task not already in CONTEXT.md or ADRs>
<be thorough — task-reorient reads this to harvest decisions>

## Files touched
<a short list>
```

## 8. On failure

No commit. Write `.flow/phases/<phase>/summaries/<ticket-slug>.md`:

```
status: failed

## What was tried
<what approach was attempted>

## Why it failed
<the specific wall that was hit>

## What the next iteration should try differently
<a concrete suggestion if you have one>
```

---

## Escalation

When you hit a wall you cannot resolve from disk alone — an interface-level decision
that would change a module interface in `milestone-spec.md`, or a discovery that the
phase premise itself is wrong — **do not guess and do not resolve it silently**.

Interface decisions are the human's to make. Recording one is gated: any write to an
ADR under `.flow/adr/`, or any edit to `milestone-spec.md`, hard-blocks and waits for
Dan to approve it in the tmux pane. You cannot self-approve an interface change. If he
rejects, the write does not happen and you keep grilling — do not proceed as if it
landed.

`milestone-spec.md` is frozen mid-phase. Do not try to edit it. Record an interface
change as an ADR instead; phase-reorient folds approved ADRs back into the spec at the
phase boundary.

Escalation is one action:

1. Stop implementing.
2. Run inline grilling in this session. Dan is in the tmux pane and will answer.
   Scope the grilling to what's needed: a single hard question and an ADR, or a full
   phase-grilling re-run if the phase premise is broken. Update the on-disk artifacts
   as you go — CONTEXT.md glossary entries, an ADR for the decision (this will prompt
   Dan for approval), revised tickets. Never edit `milestone-spec.md`.
3. Write the summary:

```
status: failed

## Escalation
<what wall was hit and what question needed human input>

## What was resolved
<what was decided and what artifacts were updated>

## Next iteration
<what the fresh instance should pick up from>
```

4. Exit without committing. Do not resume implementing in this session.

The loop re-globs on the next tick. The fresh instance has a clean context window and
the updated artifacts.

---

## Constraints

- No live oracle. If a question can't be answered from the disk artifacts, escalate.
- YAGNI on scope. Build what the ticket asks for, nothing more.
- Build with the grain on structure. Seams go where `milestone-spec.md` says they go.
- One commit per completed ticket. Never commit on failure or escalation.
- Summary file path: `.flow/phases/<phase>/summaries/<ticket-slug>.md`
  Write it at the end of every attempt — success or failure. The loop depends on it.
