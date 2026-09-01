# Cagents — Product Requirements and System Specification

Status: living product specification  
Date: 2026-08-31

## 1. Product definition

Cagents is a coordination system for humans and long-running software agents. Its durable coordination record is ordinary Git-backed files, not an opaque application database. The CLI, hosted service, browser client, native clients, provider integrations, and derived indexes all operate on the same semantic graph.

The product is split across three repositories:

- `JayTeeSF/cagents` — the live durable coordination workspace and reference data.
- `JayTeeSF/generic_cagents` — the provider-neutral coordination engine, CLI, templates, invariants, and acceptance tests.
- `JayTeeSF/cagents-application` — hosted service, account/workspace layer, Git-provider adapters, browser UI, and native clients.

The system MUST preserve one semantic authority. A hosted database or local cache may accelerate queries and hold high-frequency operational state, but it MUST NOT become a second durable source of coordination truth.

## 2. Product promise

A Maintainer can supervise multiple persistent agents and task-scoped subagents without relying on any agent remembering a handoff document, reconstructing state from terminal scrollback, or treating a worktree as workflow state.

The key product invariant is:

```text
meaningful human turn / agent response / material finding
                         |
                         v
                 persist in Cagents
                         |
                         v
                     sync Git
                         |
                         v
                 terminal / hosted UI
```

For surfaces that claim the guarded execution guarantee: **NO DURABLE WRITE -> NO DISPLAY.** If the durable write or synchronization fails, the response MUST NOT be released to that guarded user-visible surface.

## 3. Canonical model

Cagents uses stable objects, small changing refs, and derived views.

```text
CANONICAL OBJECTS
prompt / goal / task / actor / decision / evidence / run / session / message / lesson
       |
       | stable identities
       v
LIVE REFS
workflow / owner / waiting / relationships / project membership / leases
       |
       v
DERIVED VIEWS AND INDEXES
now / task show / inbox / hosted UI / search / watchdog
       |
       v
GIT HISTORY
complete historical archive; later compactable without changing current semantics
```

Requirements:

1. One fact has one authoritative representation.
2. Stable objects are not rewritten merely because current workflow changes.
3. Workflow and ownership are represented by refs and changed by narrow transition operations.
4. Current state is queried, not manually summarized into `NOW.md` or task `STATE.md`.
5. Derived indexes are disposable and rebuildable.
6. Git history is the historical archive; the active tree MUST NOT retain a compatibility `archive/` hierarchy merely to preserve old layouts.

## 4. Repository filesystem contract

A live workspace follows this semantic layout:

```text
CAGENTS.md
README.md
agents/<actor>/START.md
agents/<actor>/lessons/lessonN.md
humans/<actor>/START.md
projects/<project>/PROJECT.md
projects/<project>/PROMPT.md
projects/<project>/participants/<actor>.ref
projects/<project>/goals/...
projects/<project>/tasks/<task>/TASK.md
projects/<project>/tasks/<task>/events/...
projects/<project>/tasks/<task>/subagents/<run>/...
projects/<project>/refs/workflow/<state>/<task>
projects/<project>/refs/owner/<actor>/<task>
projects/<project>/messages/posts/<sender>/...
projects/<project>/messages/mailboxes/<recipient>/{unread,read}/...
projects/<project>/sessions/<actor>/<session>/events/...
projects/<project>/decisions/...
projects/<project>/evidence/...
tooling/cagents-tools.version
```

Forbidden current-tree authorities include project `NOW.md`, canonical task `STATE.md`, actor outboxes, acknowledgement databases, handoff journals, todo/done directories, actor memory directories, and parallel workflow systems that duplicate canonical prompts/goals/tasks/decisions/refs.

## 5. Participants and authorization

Global identity and project membership are separate facts.

```text
agents/alice/START.md
        ^
        | exact repo-relative target
projects/hey/participants/alice.ref
```

`projects/<project>/participants/<actor>.ref` is the sole authoritative permanent project-membership record. The ref MUST resolve to exactly one canonical global participant definition under `agents/` or `humans/`.

Requirements:

- CLI senders and direct recipients MUST be project members.
- Hosted-service senders and direct recipients MUST be validated against the same participant refs.
- Browser/project discovery MUST be membership scoped.
- `send --to all` means permanent members of the current project except the sender.
- A task-scoped subagent run may have project-local execution permission without becoming a permanent broadcast member.
- No route layer, service layer, or client may substitute “global actor exists” for project authorization.

## 6. Messaging

Canonical message content and delivery state are separate:

```text
projects/<p>/messages/posts/<sender>/<message>.md
                              |
                              +--> mailboxes/bob/unread/<delivery>.ref
                              +--> mailboxes/carol/unread/<delivery>.ref
```

The post exists once. Each mailbox ref points to that post. Reading/acknowledging moves the recipient ref from `unread` to `read`.

The system MUST NOT create a second outbox or acknowledgement database.

The browser/app uses the same paths and semantics as the CLI. The hosted service performs Git mutations against these canonical records and returns the resulting commit identity.

## 7. Tasks, goals, decisions, evidence and runs

`TASK.md` is the stable task object. It contains stable identity, title, initial scope, priority and stable links; it is not current status.

Current task status and owner are derived from refs. Material changes are task events. Decisions and evidence are typed records that may link to a task.

The two principal views are:

```text
cagents now              -> shallow project-wide board
cagents task show <id>   -> deep one-task view
```

A persistent actor owns a task. Task-scoped subagent runs are attempts made on behalf of that owner. A run's candidate source commit is not integrated merely because the run finished; integration requires an explicit integration record/status.

## 8. Learned constraints

Persistent agents can turn repeated, evidenced experience into typed learned constraints:

```text
agents/<actor>/lessons/lessonN.md
```

Schema requirements include actor, title, creation time, lifecycle status, kind (`require`, `prefer`, `avoid`), scope (`global`, `project`, `task`), and evidence refs where appropriate.

Applicable active lessons are derived into `resume`, `task show`, and dispatched subagent context. Retired lessons remain durable but stop applying.

Precedence is:

```text
system/runtime invariants
  > Maintainer decisions
  > explicit task constraints and canonical decisions
  > learned lessons
```

Lessons are transparent operational records, not hidden memory.

## 9. Sessions and durable display

Ordered session events live under:

```text
projects/<project>/sessions/<actor>/<session>/events/
```

Commands such as `reply`, `emit`, and `capture` MUST buffer content until the corresponding Cagents records have been written, committed, and synchronized for live coordination. They MUST fail closed on persistence/synchronization failure.

`capture` is intended for a concrete subprocess such as:

```sh
bin/cagents capture -- make test
```

The command output is buffered; Cagents persists it to the session; Git is synchronized; only then is the buffered output printed.

## 10. Execution plane

High-frequency execution facts do not belong in Git on every event. Machine-local state lives below `~/.local/state/cagents` and tracks execution ID, provider, provider session, task/run binding, process identity, status, event receipts and pending response obligations.

This plane is operational, not a competing semantic authority.

Statuses include starting, running/processing, waiting, needs-approval, stopped, failed and lost as applicable.

### Observed execution

An observed process is independently rendering. Hooks or adapters may report status, but Cagents cannot truthfully prevent that process from drawing directly.

### Guarded execution

A guarded process MUST be launched by Cagents. Directly labelling an independently launched process as guarded is forbidden.

```sh
bin/cagents execution guard --provider claude -- \
  claude -p "Inspect the current task and report the next safe action."
```

Cagents captures the child's stdout and stderr into private buffers, records execution/session evidence, commits and synchronizes, and only then releases the captured output. If persistence fails, captured output remains undisplayed by the guarded boundary.

The guarded interface SHOULD evolve from raw-stream capture to provider-aware structured streams. Provider adapters SHOULD classify public events such as assistant text, provider-exposed reasoning summaries/thinking blocks, tool calls, tool results, approvals, usage, and final response. Hidden private chain-of-thought is not a required or assumed interface.

For live structured display, Cagents SHOULD batch semantically useful stream events into durable session chunks before rendering them; it MUST NOT create one Git commit per token. Provider event-schema changes MUST fail closed or visibly degrade to raw guarded capture rather than silently misclassify events.

## 11. Provider harnesses

Cagents is harness-neutral. A human may use:

- the Cagents browser/native Slack-like client directly;
- an interactive coding-agent TUI such as Claude Code, Pi, or Codex in observed mode;
- a non-interactive/headless harness launched through `execution guard`;
- future provider SDK/app-server adapters owned by Cagents.

The durable coordination semantics do not change with the harness.

Provider-specific structured adapters are allowed, but the core contract is provider-neutral: provider input becomes a Cagents-bound execution and meaningful output becomes durable Cagents session/message/task evidence before guarded display.

## 12. Hosted product

`cagents-application` adds identity, organizations, workspaces, repository bindings, access control, subscriptions/entitlements, Git-provider adapters, operational presence, derived indexing and web/native clients.

It MUST NOT replace the Git graph with a private durable coordination database.

Hosted requirements:

- authorization resolves canonical project participant refs;
- repository credentials remain server-side;
- mutations produce canonical Cagents Git changes;
- snapshots and search may use derived indexes but must be semantically equivalent to rebuilding from Git;
- clients never need a local checkout;
- clients can show messages, tasks, participants, unread state, execution status and attention views derived from the same graph;
- provider choice (GitHub, GitLab, Bitbucket, Azure DevOps, generic Git) must not alter coordination semantics.

## 13. Derived index

A disposable index may use SQLite, HeyRecord or a hosted data service. It should update incrementally from changed Git paths and commit identities.

Required properties:

- rebuildable from canonical Git records;
- no semantic answer exists only in the index;
- stale index state is detectable by source commit identity;
- index corruption can be repaired by rebuilding;
- stable object IDs allow future path and repository sharding without breaking references.

## 14. Watchdog and presence

Presence is orthogonal to workflow. An actor can be running, paused, stopped, unknown, or unexpectedly lost. Silence alone does not change task lifecycle.

Heartbeat/presence is high-frequency operational state and normally remains outside Git. Intentional pauses MUST not be classified as stale blockers merely because a heartbeat is old.

Watchdog escalation should begin with deterministic facts: workflow ref, owner, heartbeat age, lease, child runs, accepted result and latest durable activity. Agentic reconciliation should be invoked only after deterministic checks cannot resolve the situation.

## 15. Git synchronization and concurrency

Cagents owns narrow Git writes. Live state-changing commands acquire a local write lock and synchronize around their mutations. Raced pushes are resolved with bounded pull/rebase/retry behavior.

Meaningful coordination MUST NOT remain only in a dirty checkout. Worktrees are source-execution resources, never workflow authority.

## 16. Restart contract

`cagents resume <project>` is the restart boundary. It should:

1. validate actor/project membership;
2. reject a dirty coordination checkout;
3. synchronize current Git state;
4. verify the pinned core-tool version;
5. run restart-critical canaries/invariants;
6. establish the current session and presence;
7. render bounded context, applicable learned constraints, derived project/task state, unread messages, child runs, integration status and operational attention.

An agent should not need a hand-maintained handoff to restart correctly.

## 17. Audit and repair model

`doctor` checks structural prerequisites and graph invariants. Graph/context audits reject forbidden parallel authorities and malformed typed records. `execution audit` detects completed observed turns whose durable-response obligation was not satisfied. `restart-gate` composes restart-critical checks.

Future `reconcile` should repair evidence-derived inconsistencies without inventing semantic decisions. Future `gc` may reap disposable local state and compact old history according to explicit policy.

## 18. Scaling and compaction

The active tree is optimized for current truth; Git history is the archive. Git's own object packing is preferred over retaining duplicate current-tree archive directories.

At larger scale Cagents may:

- compact old session/run detail into cold-history packs;
- shard projects into separate repositories;
- use stable cross-repository object URIs;
- rebuild reverse indexes from strong/weak refs;
- expose the same graph through cloud-derived indexes.

These changes MUST preserve semantic equivalence for current queries and stable object identity.

## 19. Security and trust boundaries

- Project participant refs authorize project coordination; global actor existence alone does not.
- Git-provider credentials stay in server/provider infrastructure, not clients or coordination records.
- Guarded processes are only those launched under the Cagents interception boundary.
- Raw provider output is untrusted input and must be escaped/handled safely by UIs.
- Provider structured-event schemas must be versioned or defensively validated.
- A malformed participant ref, mailbox ref, task ref or typed record fails closed.

## 20. Current implementation status

Implemented and acceptance-tested in `generic_cagents` include canonical prompt/goal/task/ref graphs, project participant refs, canonical messaging/mailboxes, session events, typed decisions/evidence, subagent/integration records, learned constraints, restart canaries, cross-platform core acceptance, durable-before-display `reply`/`emit`/`capture`, execution ledger/audit, and real subprocess interception through `execution guard`.

Implemented structurally in `cagents-application` include the hosted coordination service, project-scoped membership authority, Git-backed snapshot/action paths, account/workspace/repository boundaries and shared client contracts. Its current repository does not have a GitHub Actions workflow; full Hey compiler/runtime acceptance therefore remains a deployment/release gate rather than something inferred from source structure.

Provider-native structured streaming is the next quality layer over the already-real generic guarded subprocess boundary. It is not required to call raw subprocess interception “guarded”; it is required for rich live rendering of reasoning summaries, tool activity and partial output without treating raw JSON as the UI.

## 21. Acceptance criteria

A release candidate is acceptable when:

- no superseded workflow/messaging/handoff authority remains in the active core surface;
- generic core acceptance passes on macOS and Linux;
- guarded interception tests prove child output is withheld when Git synchronization fails;
- direct fake `--boundary guarded` creation is rejected;
- project membership is enforced at the semantic service layer as well as external routes;
- browser/native actions create the same canonical records as CLI actions;
- derived views can be rebuilt from Git and match canonical state;
- restart requires no hand-authored handoff;
- documentation distinguishes verified behavior from planned/provider-specific enhancements;
- the how-to uses concrete commands and file paths rather than abstract placeholders.

## 22. Non-goals

Cagents is not a replacement for Git as source control, not a second source-code worktree manager, not a prompt transcript dump of every model token, not a hidden agent-memory database, and not a guarantee that every model provider exposes private internal chain-of-thought. It coordinates work and exposes durable, inspectable facts.
