# milestone-grilling

The once-per-project origin step. Creates the foundation all other skills read. Cannot run if `milestone-spec.md` already exists.

## Role

- Writes `.flow/` and `milestone-spec.md` - the shared seam every other skill depends on.
- Names the module interfaces: the spine the human owns for the rest of the milestone.
- Classifies the milestone path (establishing vs within-architecture); downstream skills key off whether typed zone fields exist in the spec to decide what is required of them.
- Decides whether phase 1 is a walking skeleton - required whenever the milestone introduces new or unproven seams.

## Forbidden move

- Writing anything under `.flow/phases/` - phase-grilling owns that territory.
- Running when `milestone-spec.md` already exists - this skill has no update path. The spec is written once; downstream skills amend it under defined conditions.

## Constraints

- Module interfaces written here are the human's to own. They cannot change without a decision recorded as an ADR. Naming them carefully matters: they set the grain for every implementer that follows.
- Interface decisions made during grilling that are hard to reverse earn an ADR immediately, not later.
