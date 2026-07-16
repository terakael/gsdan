# Per-Iteration Instructions

These instructions apply to every fresh pi instance the implement loop spins up.
You have one job: complete the ticket assigned to you, or fail cleanly with a useful summary.

---

## 1. Orient to the vision

Read `milestone-spec.md` first. Understand the module interfaces in your area. Your
job is to build the minimal slice the ticket asks for — no more (YAGNI on scope) — but
place your seams exactly where the vision says they go (build with the grain on
structure). Use `/codebase-design` vocabulary when thinking about where seams go.

## 2. Check for uncommitted changes

If the prior summary has `status: failed` or mentions an escalation, there may be
uncommitted changes in the working tree from the last attempt. Read the summary to
understand what was tried. Decide: is the partial work worth keeping and building on,
or should you reset it (`git stash` or `git checkout -- .`) and start clean? Document
your choice in the summary you write.

## 3. Write the acceptance tests

Turn every acceptance criterion in the ticket into a failing test, written at the
interface seam named in the ticket's **Interface (test surface)** section. Watch each
fail for the right reason. Do not write production code yet.

Test external behaviour at that seam only — not implementation details. If a criterion
can't be tested cleanly at the seam, stop: the interface is probably the wrong shape.
That's an escalation (see below).

## 4. Test-review gate

Before writing any production code, get the failing tests reviewed by fresh eyes. You
wrote them, so you're the worst judge of their gaps.

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

## 6. Code review

When all acceptance criteria are met and tests are green, run `/code-review` against
the changes since the last commit (use the last commit SHA or `main` as the fixed point,
whichever is appropriate).

The reviewers run a two-axis review (Standards + Spec). For each pass:

- If the reviewers find real issues: implement the changes. Tell the same reviewer
  instances to re-review. Repeat until they are satisfied.
- If the reviewers find issues you disagree with (they conflict with the ticket or the
  milestone vision): note the disagreement in the "Key decisions" section of your summary
  and proceed.
- If review iterations hit 3 without convergence: treat the whole ticket as failed.
  No commit. Write a failed summary explaining review did not converge.

## 7. On success

Commit with:

```
feat(<ticket-slug>): <short description of what was built>
```

Example: `feat(02-auth-middleware): add JWT validation at the HTTP seam`

Then write `.flow/phases/<phase>/summaries/<ticket-slug>.md`:

```
status: done

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
