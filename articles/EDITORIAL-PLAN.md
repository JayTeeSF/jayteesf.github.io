# Editorial process of record

Last revised: 2026-08-07

This is the normative editorial process for JayTeeSF articles, dailies, and public status updates. It replaces the old chronological accumulation of rulings. Historical rationale remains in git history; this file keeps the rules that are still binding.

When sources conflict, use this order:

1. Security and embargo rules.
2. Measured current truth from the repository and dated evidence logs.
3. The latest maintainer ruling.
4. The article-specific brief.
5. This general process.

A stale plan never outranks a fresh measurement. Corrections publish at the same volume as claims.

## 1. The editorial workflow

Every narrative piece follows the same path.

### Step 1: Write the one-sentence story

Before drafting, state:

- the verdict;
- what changed or was learned;
- what the reader will understand or be able to do afterward.

If the article needs two unrelated story sentences, split it.

### Step 2: Assemble the evidence packet

The packet contains:

- dated benchmark or gate logs;
- primary-source links for named claims;
- current repository state;
- known weaknesses, failed theories, and unresolved questions;
- the exact commands needed to reproduce the important result.

Source documents are raw material, not the outline.

### Step 3: Draft for one audience

A public article, a maintainer decision memo, and a raw campaign log have different jobs. Never flatten them into one document.

Narrative articles normally contain 800-1200 words of prose, excluding chart labels, glossary text, sources, and receipts. Over budget means cut or split, not compress every sentence until it becomes unreadable.

### Step 4: Editor pass

The editor checks:

- verdict-first clarity;
- story arc;
- reader capability;
- plain English;
- disclosed weakness;
- skim test;
- chart placement and accessibility;
- citations and glossary behavior;
- security composition risk;
- mobile/CSS compatibility;
- metadata, bucket, index, and version formatting.

### Step 5: Fact-check pass

The benchmark lead or designated fact-checker verifies every number against a dated log. No number ships because it was remembered, copied from an older draft, or inherited from another host.

### Step 6: Publish pass

Before commit:

- run the article/index generators;
- ensure every published article appears in `articles/index.html`;
- update `articles/glossary.html` for new terms;
- verify mobile rendering without `color-mix()`;
- verify all links and citations;
- re-check every DID/DOING claim against current state;
- confirm the final file, not a description of it.

## 2. Required article shape

### Verdict first

The first TL;DR bullet states the decision in plain language. Never imply the verdict or hide it behind a clever title.

Use 4-6 TL;DR bullets:

1. the verdict;
2. the strongest result, with unit and condition;
3. the key mechanism or lesson;
4. a disclosed weakness;
5. the reproducibility or falsifiability test as the final bullet.

Every TL;DR number must reappear identically in a table or receipt below.

### Story arc

A narrative article needs:

1. setup;
2. turn or reveal;
3. payoff.

If the sections can be reordered without loss, the piece is probably a catalog rather than a story.

### Reader-first writing

Use concrete examples before abstractions. Give the reader an early win: the verdict, a runnable example, or the one-sentence takeaway.

Each paragraph should make one point that a reader can repeat after one read. Prefer conversational, direct prose. Hedge precisely by naming what is uncertain.

Internal codenames and campaign labels do not belong in public prose. Translate them into plain English.

### Skim test

Read only the title, headings, bold text, TL;DR, and first chart. If that skim can produce the wrong conclusion, restructure the article.

### Humor

Humor is optional, light, dry, family-friendly, and never at the reader's expense. Use none in:

- TL;DRs;
- corrections or retractions;
- user-facing failures;
- benchmark numbers;
- security material.

No humor is better than too much.

## 3. Visuals and terminology

Every narrative article needs at least one self-contained chart or graphic near the TL;DR. Reference pages such as `index.html` and `glossary.html` are exempt.

Each figure needs:

- title;
- subtitle;
- accessible label;
- figcaption with provenance;
- mobile-safe width or its own horizontal scroller;
- static hex/RGBA colors with explicit dark-mode overrides.

A chart should restate the article's message and replace prose, not add a second story.

Expand an unfamiliar unit once at first textual use, for example `microseconds (us)`. Do not repeatedly define it.

Use at most two inline definitions per paragraph. Terms needing a fuller explanation link to `articles/glossary.html`.

Glossary links use the progressive-enhancement popover pattern:

```html
<a class="gloss" href="glossary.html#term" data-def="Short definition.">term</a>
```

With JavaScript disabled, the link must still navigate normally. Existing `.aside.term` boxes remain direct definitions and are not converted.

## 4. Evidence and benchmark rules

### Explain how to read the numbers

Near the top of every benchmark article, state:

- payload;
- concurrency/workers;
- machine and operating system;
- keep-alive behavior;
- quiet-box versus loaded-box state;
- whether the number is a lower bound;
- output and success-rate assertions.

### Use matched conditions

Per-worker tables appear before aggregate totals. Compare Hey, Go, and Ruby under matched worker/core conditions whenever possible.

Required measured axes for full comparisons:

| Axis | Required evidence |
|---|---|
| Throughput per core | 1/2/4/8 worker or core curves |
| Latency tail | p50, p99, p99.9, and full load-tool summary |
| Memory | idle, post-load, post-soak RSS; whole process and per worker |
| Startup | time from exec to first successful request |
| Edit-to-serving | source change to serving result |
| Artifact/deploy size | bytes on disk and runtime dependencies |
| Stability | soak duration and RSS slope |

Also discuss judged axes honestly: ergonomics, correctness confidence, concurrency model, ecosystem/hiring, tooling maturity, and operations. Name at least one important axis where Hey loses.

Use real ratios, not rounded marketing numbers. If the measured values are 481x and 425x, do not call either one 500x.

### Campaign articles are result shells

A campaign article has one goal. Its top chart shows:

- target;
- starting line;
- pending cells;
- dated results as they arrive.

Do not freeze a moving campaign into a one-time verdict. Append dated rows. Write for the reader two years later, not only for the current week.

### Earned trust

Trust is implied by public bets, reproducible receipts, corrections, and links. Never ask the reader to "trust us."

## 5. Article types and buckets

Every published article includes:

```html
<meta name="article-bucket" content="featured|benchmarks|almost|daily">
```

`article-series` is retired. Unknown or missing buckets are errors.

Buckets, in display order:

- `featured`: maintainer-curated best work;
- `benchmarks`: measurement campaigns and benchmark stories;
- `almost`: explored or designed, but not yet shipped; the article also needs an in-body status warning;
- `daily`: edited daily reports, rendered last.

Files beginning with `DRAFT-` are excluded from the index until fact-check clears them.

### Daily reports

A daily is not a raw changelog. Apply the full article process:

- verdict-first TL;DR;
- story arc;
- one audience;
- current truth at publication time;
- no opening glossary or cast of characters.

The glossary is a reference, never the entry point.

## 6. Publishing and CSS rules

### Index

Every published article basename, except `index.html`, must appear in `articles/index.html`. New article, retitle, and removal commits all update the index.

### Version numbers

Show Hey versions short in prose:

```html
<abbr class="ver" title="v0.99.443a">443a</abbr>
```

Verbatim command output stays untouched. Add one footer note explaining the short form.

### CSS

`color-mix()` is banned from articles and the doc-site generator. Also avoid `canvas`, `oklch`, `lab`, `light-dark`, and any color expression that depends on post-parse resolution.

Use static hex/RGBA values and explicit overrides for:

- `prefers-color-scheme: dark`;
- `:root[data-theme="dark"]`;
- `:root[data-theme="light"]` when needed.

Mobile is the primary compatibility target. Verify callouts remain visible when advanced color features are mentally or actually disabled.

## 7. Attribution

Load-bearing claims link to primary sources at first use, not only in a source list.

Named research carries authors and venue when appropriate. Never invent a URL. If the evidence packet lacks one, say so.

Corrections and retractions receive the same prominence as the original claim.

## 8. Security embargo rules

Security rules override normal editorial goals.

1. **Use the composition test.** Ask whether the new piece plus existing public material reveals the finding.
2. **Do not pair observability with reachability.** A trigger plus a measurable symptom can become a scanner.
3. **Use state-free phrasing for unfixed issues.** Do not confirm that a shipped release is currently exposed.
4. **Scrub metadata first.** Remove sensitive content from descriptions, index blurbs, and glossary entries before body prose.
5. **Publish misses with hits.** A process article must disclose what the same review failed to catch.
6. **Bank material rather than weakening it.** Full details can ship with the fix.
7. **Definitions are not safer.** Abstract mechanisms can be more transferable than named instances.
8. **Review the artifact, not the account.** Approval requires reading the actual bytes.
9. **Remember that editorial files are public.** Rules and examples in `articles/` are published too.

## 9. Current three-article series

This section is project-specific; remove it when the series is complete.

### Publication order

Publish C, then B, then A.

- C establishes the honesty and gate discipline.
- B shows the command-line experience and measurement harness.
- A makes the broad web-performance case only after its evidence gate fires.

### Article C

Title: **A Ruby Port Ate 50 GB of RAM. The Bug Wasn't in My Code.**

Structure: case file, Exhibits A-E. Each exhibit follows:

1. symptom;
2. what we believed;
3. what was true;
4. what makes it loud now.

Print discarded theories and retractions in full. Close with a Silence Table: observation, exit code, report, time hidden, and loudness mechanism. The guard is the hero; speed is the reward.

### Article B

Title and URL identity: **Great Command-Line Scripting with Hey.**

Use a dated progression table as the spine. The parity gate is the hook. Name lanes in plain English: "the script you run" and "the binary you build."

### Article A

Title: **From 500 to 100,000 Requests per Second.**

Do not draft the final article until all are true:

- more than 100,000 requests/second aggregate on a quiet box;
- same-minute Hey/Go/Ruby ladder including Puma with eight workers;
- sustained-load weakness fixed or explicitly bounded;
- Hey, Puma, and Go 1/2/4/8 curves;
- p50/p99/p99.9 plus complete load-tool summaries;
- a realistic JSON + SQLite + render payload, not only `/health`;
- at least one Linux run on four or fewer cores;
- matched-condition verdict, win or lose.

State the current per-worker weakness before critics do. Per-worker data appears before totals.

### Cross-linking

C answers why readers should believe A and B. A and B link back to C as the origin of the measurement discipline.

## 10. Final checklists

### Writer

- One story sentence.
- One audience.
- Verdict first.
- 4-6 TL;DR bullets, including weakness and falsifiability.
- Concrete example before abstraction.
- No internal codenames.
- 800-1200 words unless the format is explicitly exempt.
- At least one near-top graphic.

### Editor

- Setup, reveal, payoff.
- Skim test cannot invert the verdict.
- One idea per paragraph.
- Humor restrained and correctly placed.
- Reader can name what each section taught them.
- Security composition test completed.
- Mobile and static-color rules satisfied.

### Fact-checker

- Every number traced to a dated log.
- Conditions and units stated.
- Host-specific results labeled.
- Failed theories and weaknesses retained.
- Current repository state re-checked.

### Publisher

- Bucket metadata present.
- Index updated.
- Glossary updated.
- Primary-source links verified.
- Version formatting correct.
- DRAFT status removed only after approval.
- Final artifact reviewed directly.
