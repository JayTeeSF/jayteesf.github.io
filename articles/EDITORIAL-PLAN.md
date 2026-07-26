# Editorial plan of record — three Hey articles

*Synthesis of the managing-editor strategy (research-backed) and the
staff-writer brainstorm (independent), arbitrated by the benchmark
lead (custodian of all numbers). 2026-07-25.*

The two brainstorms were produced blind to each other and converged
on every load-bearing decision: per-worker tables before totals, the
parity gate as article B's story, the case-file structure for C, the
dated progression table as B's spine, C published first, disclosed
weakness as the house signature. Convergence noted; adopted.

## Rulings

1. **Publication order: C → B → A.** C establishes the honesty
   posture that makes A's eventual claims believable. "Publishing a
   100K article before the silent-miscompile article makes the second
   look like a forced confession; after, the first looks like a track
   record." (Editor. Correct.)
2. **Titles.**
   - C: "A Ruby Port Ate 50 GB of RAM. The Bug Wasn't in My Code."
     with the writer's "Exit 0, No Output" as the section heading for
     the corpse exhibit.
   - B: keep "Great Command-Line Scripting with Hey" (URL identity),
     new sub-lede carrying the fresh multiplier.
   - A (future): "From 500 to 100,000 Requests per Second" — series
     continuity; the per-core twist is the hook, not the title.
3. **C's structure: the case file.** Exhibits A–E with a fixed
   template (symptom → what we believed → what was true → what makes
   it loud now), retractions printed at full prominence (in a case
   file, discarded theories belong in the record), closing "Silence
   Table" (what we saw / exit code / what it reported / how long it
   hid / what made it loud). The guard is the hero; speed is the
   reward, not the subject. The adoption question ("would you ship
   this?") answered inside the article, not left to comments.
4. **B's structure: the article is the harness.** Dated progression
   table as the spine (new measurements add rows, never falsify the
   headline); parity gate promoted from "Rule 2" to the hook and its
   own section; Rule 1 rewritten (not addended) for the post-sidecar
   era with history in an aside; lanes named in plain English — "the
   script you run" vs "the binary you build" — and never "heyc lane".
5. **A's gate (restated, binding):** written only when (a) >100K
   aggregate, quiet-box confirmed, same-minute four-lane ladder
   including puma-x8; (b) the sustained-load stability class is fixed
   or explicitly bounded in print; (c) per-worker curves (1/2/4/8)
   exist for Hey, puma, AND Go (GOMAXPROCS-matched), so the
   "X% of Go at matched conditions" verdict is reportable win or
   lose. Per-worker table appears BEFORE the totals table. The
   current per-worker loss to puma (10.4K vs 14.5K at our w8 vs
   their w4) is stated in our own words before anyone else says it.
6. **House style adopted** (editor's spec, writer's voice):
   - TL;DR: 4–6 bullets; #1 = most dramatic number WITH unit and
     condition; one bullet is ALWAYS a disclosed weakness; last
     bullet is falsifiability (how to reproduce). Every TL;DR number
     reappears identically in a table below.
   - Terms: 12-word test → inline `<dfn>`; needs a "why" → `.aside`
     call-out (left-rule, visually subordinate); mechanism the
     argument doesn't need → collapsed `<details class="deep">`.
     Max two inline definitions per paragraph. Never define twice.
     Foot-of-article glossary on every piece (shared house copy).
   - Shared "How to read these numbers" block early in every piece:
     payload, concurrency, machine, keep-alive, quiet-box vs loaded,
     lower-bound convention, output+success-rate assertion.
   - Voice: plainspoken, evidence-first, self-incriminating, quietly
     funny. Corrections ship at the same volume as claims. The
     writer's corpse-paragraph sample is the register target.
   - Real ratios only: 481x (spread) and 425x (push), never "500x".
     (Already corrected in the live article and the saga doc.)
7. **Measurement asks accepted by the benchmark lead** (feeds the
   standing quiet-window queue; several overlap the toolchain team's
   Go-matrix request):
   - puma 1/2/4/8-worker cells, same minute, same payload  [queued]
   - Go GOMAXPROCS 1/2/4/8 matrix (standing instrument, built)
   - Hey w1/2/4/8 post-407a, all three apps                [queued]
   - p99 + p99.9 + oha full summary (avg/slowest) per cell — now
     mandatory (Little's-law reconciliation, bench lesson 16c; the
     elders p50/p99-vs-mean anomaly must be explained before any
     "median below Go" claim returns)
   - fresh gpi + source-zip benchmarks                      [queued]
   - A second, realistic payload (JSON parse + SQLite read +
     render) — REQUIRED for A; /health alone is dismissible
   - One Linux ≤4-core run — flagged to the maintainer (needs a
     Linux box; the 4-core production example exists)
8. **Cross-linking:** C answers "why believe the RPS articles?"
   (because these gates caught these bugs) and links to A/B; A/B
   link back to C as the methodology's origin story.

## Beyond speed: the full comparison rubric (maintainer mandate, 2026-07-25)

Article A (and, in lighter form, B/C) compares Hey vs Go vs Ruby on
MORE than throughput. Two classes of axis:

**Measured axes (cells in the standing ladder, per lesson 16d):**
| Axis | Why a reader cares | How measured |
|---|---|---|
| Memory under load | Decides the VPS you rent; a 512 MB box runs Go/Hey, not a Rails cluster | RSS idle / post-load / post-soak, whole server AND per worker |
| Latency tail | p99 is your unluckiest user | p50 + p99 + p99.9 + full oha summary (16c) |
| Throughput per core | The only unit that isolates the language | per-worker curves 1/2/4/8 (16b) |
| Startup to first request | Serverless/cold-start + dev loop | time from exec to first 200 |
| Edit-to-serving time | The inner dev loop | build-from-source wall time (Hey ~2.5-5 min compiled app vs Go seconds vs Ruby zero — Hey's honest weak axis today) |
| Artifact/deploy size | Ship a binary or a runtime+gems? | bytes on disk; runtime dependencies count |
| Sustained-load stability | Does it survive Tuesday? | soak duration + RSS slope (gate 3) |

**Judged axes (argued honestly in prose, with receipts where they
exist):**
- Ergonomics: LOC for identical functionality (source-zip: Ruby vs
  Hey line counts — measurable!), readability for a Ruby developer
  (B's "reads like Ruby" section), error-handling model, REPL/
  tooling maturity.
- Correctness confidence: type/guard story, sanitizer support
  (ASAN/TSAN), the parity-gate discipline, silent-failure history
  DISCLOSED (article C is the receipt), fix latency (24 h) vs
  ecosystem maturity (Ruby/Go's decades).
- Concurrency model: workers vs goroutines vs threads/GIL; what the
  programmer must know to be safe.
- Ecosystem & hiring: libraries, docs, community — where Hey loses
  today and says so.
- Operational story: single binary (Go, compiled Hey) vs interpreter
  + dependency tree (Ruby); crash/jetsam behavior; observability.
Rule: every judged axis names at least one lane where Hey LOSES
(edit-to-serving time and ecosystem are the standing candidates) —
same discipline as the numbers.

## Draft workflow (next phase)

Writer agent drafts C, then B, following this plan + fresh numbers
from the quiet window. Editor agent reviews each draft against the
house rules (TL;DR shape, term tiers, density guard, caveat bullet).
Benchmark lead fact-checks EVERY number against the dated evidence
log before commit; no number ships without a log citation. A's
skeleton is banked in this file until its gate fires.

## House rule added 2026-07-26 (maintainer): STORY ARC + HUMOR
Every editorial pass must also judge: (a) does the article have a
compelling STORY ARC — a setup, a turn/reveal, and a payoff — rather
than an annotated catalog of facts? An article whose sections could be
reordered without loss has no arc; fix the structure, not the prose.
(b) Is there appropriate HUMOR — light, dry, in service of the point
(a well-placed aside, a self-deprecating note on our own retractions)
— and NONE where the material is a correction, a retraction, or a
user-facing failure? Humor never at the reader's expense, never in
TL;DRs, never in numbers.

## Humor rules tightened (maintainer, 2026-07-26)
- NO humor is better than TOO MUCH humor — when in doubt, cut.
- All humor must be FAMILY-FRIENDLY.

## Attribution rule (maintainer, 2026-07-26)
The editor pass must verify PROPER ATTRIBUTION: load-bearing claims
link to their primary source (the paper, the official docs, the repo,
the original post) at or near first use — not just a sources list at
the bottom. Named results carry their authors/venue when appropriate
(e.g. "Perceus (Reinking, Xie, de Moura, Leijen — PLDI 2021)"). Never
invent a URL; if the source brief lacks one, say so rather than link
to a guess.

## Index rule (maintainer, 2026-07-26)
articles/index.html must list EVERY published article — updating it is
a mandatory step of every article commit (new article, retitle, or
removal). Verify with: every articles/*.html basename (except index)
appears in index.html. The editor pass checks this.
