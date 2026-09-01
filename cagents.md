# Cagents — full system specification

Status: current target architecture, 31 August 2026

This document is the implementation contract for the Cagents system across:

- `JayTeeSF/cagents` — durable coordination records and project data;
- `JayTeeSF/generic_cagents` — provider-neutral semantic engine, CLI, invariants, transitions, runtime bridge and adapters;
- `JayTeeSF/cagents-application` — hosted service, authentication, indexing/realtime and web/macOS/iOS/Android clients.

It intentionally describes only the current architecture. Superseded models belong in Git history, not in compatibility folders or parallel state systems.

---

## 1. Product statement

Cagents lets a human Maintainer coordinate persistent and ephemeral software agents through one durable project graph.

The Maintainer is the default communication hub. Project membership does **not** imply that every actor can talk directly to every other actor. Direct actor-to-actor communication is an explicit, revocable Maintainer-issued grant.

Provider wrappers connect Claude, Pi, Codex, local models and future systems to the same Cagents actor contract. The wrapper is transport plumbing, not a second coordinator.

```text
                         MAINTAINER
                       project authority
                             |
                             v
                         CAGENTS
                durable Git-backed project graph
                  /           |            \
                 /            |             \
          messages         tasks/refs       grants
             |                                |
             v                                v
      actor mailbox  <---------------- direct edge policy
             |
             v
       provider wrapper
             |
             v
 Claude / Pi / Codex / local model
             |
             v
 normalized semantic activity
             |
             +---------------------------> CAGENTS
```

The application is a client of this graph. Realtime is a projection of durable state, not a second source of truth.

---

## 2. Non-negotiable invariants

### 2.1 One fact, one semantic authority

Examples:

| Fact | Authority |
| --- | --- |
| task intent | `TASK.md` |
| current workflow | one workflow ref |
| accountable owner | one owner ref |
| project membership | participant ref |
| message body | canonical post |
| unread/read | mailbox delivery ref |
| communication grant decision | grant object |
| whether grant is currently active | active communication ref |
| decision | decision object |
| evidence | evidence object / linked artifact |
| learned constraint | typed lesson |
| provider PID / heartbeat | machine-local execution state |

No `STATE.md` should duplicate task workflow. No hosted database row should compete with the Git record for message delivery, permission or task state.

### 2.2 Active tree is current truth; Git history is archive

There is no compatibility museum in the active tree. When the semantic model changes, migrate meaningful current records and remove obsolete paths. Git history preserves old forms.

### 2.3 Stable objects, moving refs

Canonical objects remain stable while small refs represent changing relationships and current state.

```text
projects/hey/tasks/ownership-repair/TASK.md

projects/hey/refs/workflow/in_progress/ownership-repair.ref
projects/hey/refs/owner/orchestrator/ownership-repair.ref
```

### 2.4 Durable display boundary

For output controlled by Cagents:

```text
NO DURABLE WRITE -> NO DURABLE DISPLAY
```

Provider activity may be accumulated into bounded semantic batches. Once a batch is considered a Cagents-visible durable event, it must be persisted/synchronized before clients are told it is durable.

### 2.5 Provider independence above the adapter boundary

Project semantics must not contain Claude-specific, Pi-specific or Codex-specific assumptions. Provider-native session protocols are translated below the actor adapter contract.

---

## 3. Actors and identity

Persistent actors have stable identities:

```text
agents/<actor>/START.md
humans/<actor>/START.md
```

`START.md` contains the minimum durable startup contract for that actor. It should teach the actor how to resolve its current Cagents context rather than embed a stale project snapshot.

Ephemeral subagent runs do not require permanent global identities unless they become persistent actors.

---

## 4. Project membership

Permanent project membership is explicit:

```text
projects/<project>/participants/<actor>.ref
```

The ref resolves exactly to one canonical global identity:

```text
agents/<actor>/START.md
```

or

```text
humans/<actor>/START.md
```

A global actor may exist without belonging to a project.

Task-scoped run actors may act only through explicit task/run provenance and do not automatically become project broadcast participants.

Membership answers only:

> Is this actor part of this project?

It does **not** answer:

> May this actor directly message every other participant?

and it does **not** answer:

> How authoritative are this actor's instructions?

---

## 5. Maintainer communication authority

The Maintainer is the default communication router for the project.

Default topology:

```text
overseeer -> Maintainer -> orchestrator
linux     -> Maintainer -> orchestrator
worker    -> Maintainer -> overseer
```

The Maintainer can communicate directly with project actors by virtue of Maintainer authority.

Peer actors require a communication grant to bypass Maintainer mediation.

This creates three independent axes:

```text
membership
    !=
communication permission
    !=
command authority
```

A direct communication grant never silently upgrades a peer actor's command authority.

---

## 6. Communication grants

### 6.1 Canonical grant object

Recommended canonical path:

```text
projects/<project>/grants/<grant-id>.md
```

Schema: `cagents-communication-grant-v1`.

Required fields:

```yaml
schema: cagents-communication-grant-v1
id: comm-017
project: hey
issuer: maintainer
from: overseer
to: orchestrator
mode: continuous
scope: project
authority: advisory
created_at: 2026-08-31T00:00:00Z
```

Allowed `mode`:

- `once` — one accepted direct delivery consumes the active grant;
- `scoped` — direct delivery while the named task/run/session scope remains active;
- `continuous` — direct delivery until Maintainer revokes the grant.

Allowed scope forms:

```yaml
scope: project
```

or

```yaml
scope: task
task: ownership-repair
```

or

```yaml
scope: run
run: static-lane-a
```

or

```yaml
scope: session
session: <session-id>
```

The implementation may support unidirectional grants by default and explicit duplex grants by creating two directional grants or one clearly modeled bidirectional object. Direction must never be implicit.

### 6.2 Active grant ref

A canonical grant object records the decision. A small ref records that it is active.

Recommended path:

```text
projects/<project>/refs/communication/<from>/<to>/<grant-id>.ref
```

The ref targets the canonical grant object.

For `once`, successful direct acceptance consumes the grant by removing/moving the active ref and appending a consumption event/receipt.

For `scoped`, the active ref is invalid when its scope is closed. Reconciliation/doctor tooling must detect and clean stale active refs.

For `continuous`, the active ref remains until explicitly revoked.

### 6.3 Forwarding through Maintainer

When no direct grant exists, a peer-to-peer request is not delivered directly to the target. It is routed/queued for Maintainer mediation.

The application should expose:

```text
[ Send ] [ Edit & send ] [ Ignore ]
[ Allow direct once ] [ Allow scoped ] [ Allow continuously ]
```

Forwarded messages preserve provenance with stable linkage to the original message.

Suggested metadata:

```yaml
forwarded_from: overseer
source_message: <stable message id or path>
```

The receiver must be able to distinguish original author, Maintainer forward, and Maintainer-authored content.

---

## 7. Command authority

Communication permission is transport authorization, not semantic precedence.

Receivers resolve instruction precedence algorithmically from roles, project policy, task decisions and message provenance.

A default policy may be:

```text
system/runtime safety constraints
    > Maintainer instructions
    > binding project/task decisions
    > explicitly delegated authority
    > overseer/peer guidance
    > actor's own plan
    > subagent suggestions
```

Exact policy must be represented in project/actor configuration or durable decisions, not inferred from the provider.

Every delivered message should be explainable as:

```text
WHO sent it?
WHY may they reach this actor?
WHICH grant or Maintainer authority authorized delivery?
WHAT scope applies?
WHAT semantic authority does the sender have?
```

---

## 8. Messages

Canonical project-owned layout:

```text
projects/<project>/messages/
├── posts/<sender>/<year>/<month>/<message>.md
└── mailboxes/<recipient>/
    ├── unread/<year>/<month>/<delivery>.ref
    └── read/<year>/<month>/<delivery>.ref
```

The post exists once.

A delivery ref is per recipient.

Acknowledgement moves the delivery ref from unread to read. It does not mutate the post and does not create a second acknowledgement database.

### 8.1 Message send authorization

When sending from actor A to actor B:

1. A must be authorized to act in the project.
2. B must be a valid recipient in the project or valid task/run actor for the scope.
3. If A is Maintainer, direct delivery is permitted.
4. If B is Maintainer, delivery is permitted for project actors.
5. Otherwise Cagents resolves an active A -> B communication grant.
6. If a valid direct grant exists, write the post + B unread ref atomically.
7. If no grant exists, route the request for Maintainer mediation instead of delivering directly to B.
8. If the sender is not authorized at all, fail closed.

### 8.2 Atomicity

Creation of a post and its initial mailbox delivery refs should be one semantic mutation. The system must not publish a post without the required deliveries or deliveries pointing at a missing post.

---

## 9. Tasks

Canonical task object:

```text
projects/<project>/tasks/<task-id>/TASK.md
```

Current workflow is represented by exactly one workflow ref.

Recommended states:

```text
todo
in_progress
waiting
blocked
done
cancelled
```

Transitions use semantic operations that:

1. validate current state;
2. move the workflow ref;
3. update owner/waiting refs as required;
4. append a durable task event;
5. link evidence/decisions/results;
6. persist/sync atomically at the semantic boundary.

There is no canonical task `STATE.md`.

### 9.1 Ownership

Each task has one accountable persistent owner at a time.

Subagent runs are attempts/work lanes, not additional accountable owners.

### 9.2 Subagent runs

A task may have multiple child runs for parallel static investigation.

Heavy local builds/benchmarks should be serialized where machine-resource safety or benchmark validity requires it.

Each run records:

- parent task;
- run actor/provider/model where applicable;
- assignment/scope;
- start/end/status;
- events/findings;
- result/evidence;
- failure/cancellation provenance.

Failed runs remain durable evidence and may be compacted later according to retention policy.

---

## 10. Decisions, evidence and lessons

### Decisions

Binding decisions are durable objects linked from affected tasks/goals. They outrank learned lessons.

### Evidence

Evidence is canonical or linked with stable provenance. Test receipts, benchmark outputs, source citations and implementation commits can all be evidence.

### Lessons

Persistent agent lessons live under:

```text
agents/<actor>/lessons/lessonN.md
```

Schema: `cagents-lesson-v1`.

Lessons are typed constraints such as `require`, `prefer`, `avoid`, scoped globally/project/task. They are reusable learned behavior, not hidden memory.

Precedence:

```text
system / Maintainer / task decisions > learned lessons
```

---

## 11. Sessions and normalized activity

Cagents records durable actor sessions:

```text
projects/<project>/sessions/<actor>/<session>/events/
```

Provider-native events are normalized into semantic Cagents event classes such as:

```text
started
status
plan
read
tool_start
tool_result
finding
dispatch
subagent_status
decision
edit
test
approval_requested
reasoning_summary
response
result
failed
stopped
```

Exact names may evolve, but clients consume a stable provider-neutral contract.

### 11.1 Reasoning boundary

Cagents may retain:

- provider-exposed reasoning/thinking summaries or blocks;
- explicit plans;
- tool calls/results;
- file reads/edits;
- findings;
- subagent activity;
- tests;
- decisions;
- blockers;
- final responses.

Cagents must not claim access to hidden private chain-of-thought that a provider does not expose.

### 11.2 Batching

Do not commit per token.

Adapters/runtime aggregate native deltas into bounded batches based on semantic boundary, time and/or size. The system may retain a richer raw stream locally or durably for drill-down, but ordinary UI should prioritize semantic events.

---

## 12. Provider wrapper contract

The wrapper is a device driver for a Cagents actor.

Conceptual normalized interface:

```text
input:  Cagents user/control event JSONL
output: normalized Cagents provider event JSONL
```

Responsibilities:

1. validate actor/project startup context;
2. read/resolve `START.md`;
3. start or resume provider session;
4. preserve provider session identity where supported;
5. watch authorized Cagents mailbox input;
6. feed accepted messages into the running provider using provider-native transport;
7. parse structured provider output incrementally;
8. normalize native events;
9. checkpoint/persist bounded semantic batches;
10. publish local presence/heartbeat;
11. fail closed when durable response obligations cannot be satisfied;
12. resume safely after wrapper/process restart.

Provider-specific examples:

- Claude Code: stream-oriented structured input/output where available;
- Pi: RPC/event transport;
- Codex: JSON event transport;
- local model: adapter-specific protocol.

Do not screen-scrape an interactive TUI when a structured provider protocol exists.

---

## 13. Local execution plane

Machine-local operational state lives outside the durable coordination tree, for example:

```text
~/.local/state/cagents/
```

It may include:

- process ID;
- provider session ID;
- heartbeat;
- starting/processing/waiting/needs-approval/stopped/failed state;
- temporary event buffers;
- pending durable response obligation;
- transient locks;
- controller restart metadata.

This state is disposable/reconstructible. It cannot become the only copy of a durable task/message/decision/result.

Presence and lifecycle are orthogonal. Silence alone does not imply task completion or failure.

---

## 14. Application architecture

`cagents-application` implements hosted access to the same semantics.

### 14.1 Service responsibilities

- authenticate humans and service actors;
- authorize workspace/repository access;
- resolve project membership;
- resolve Maintainer communication authority and active communication grants;
- perform semantic writes through generic Cagents logic or equivalent shared semantic library;
- commit authoritative Git mutations before reporting durable success;
- maintain rebuildable derived indexes;
- fan out realtime projections after durable success;
- provide search, filters and snapshots;
- expose live actor/session/task activity;
- never duplicate canonical truth in a SaaS-only state machine.

### 14.2 Client parity

Web, macOS, iOS and Android must operate the same capability contract. Platform presentation can differ; semantics cannot.

All clients need:

- workspace/project picker;
- current project dashboard;
- actor/member list;
- Maintainer inbox/mediation queue;
- conversations/messages;
- communication grant controls;
- task list/detail and transitions;
- actor live status;
- semantic activity timeline;
- subagent tree/activity;
- approvals/blockers;
- decisions/evidence/lessons where relevant;
- search;
- notifications;
- settings/auth/repository health.

### 14.3 Maintainer communication UI

For each actor relationship, clients should expose current routing clearly:

```text
Communication with orchestrator

(*) Through Maintainer
( ) Allow once
( ) Allow for task/run/session
( ) Allow continuously

[Revoke direct access]
```

For a mediation item:

```text
Overseer wants to tell orchestrator:
"Do not benchmark yet; ownership proof is incomplete."

[Send]
[Edit & send]
[Ignore]
[Allow direct once]
[Allow scoped]
[Allow continuously]
```

The UI must show directionality and scope. `A -> B` is not the same as `B -> A`.

### 14.4 Live actor view

Minimum hierarchy:

1. **Board** — actor working/waiting/blocked/stopped, children, current task, blocker.
2. **Semantic timeline** — plan/read/tool/finding/dispatch/edit/test/decision/result.
3. **Raw/provider detail** — structured native events where retained and authorized.
4. **Artifacts** — diffs, commits, receipts, task/decision/evidence links.

Users should be able to message/redirect an actor from this view using ordinary Cagents messaging. No special provider-specific text channel is exposed to the user.

### 14.5 Realtime

Recommended sequence:

```text
client action
   ↓
server authentication + semantic authorization
   ↓
Git-backed Cagents mutation
   ↓
commit/sync succeeds
   ↓
derived index update
   ↓
SSE/WebSocket/push fan-out
```

Realtime events include authoritative object/ref identifiers and version/commit provenance so clients can re-fetch or reconcile after missed events.

### 14.6 Offline/mobile behavior

Mobile/native clients may cache derived state for responsiveness. Offline user mutations must remain explicitly pending until the server confirms the authoritative Git write. Clients must not present unsynced mutations as durable completion.

---

## 15. API capability contract

The API is capability-oriented; URL shape may evolve.

### Authentication

```text
login / passkey / provider login
refresh session
logout
manage device sessions
service credentials for agents/CI/integrations
```

### Workspaces/repositories

```text
list/create/get workspace
list/connect repository bindings
validate repository access
provision managed repository
export/transfer
repository health
```

Git provider integration must be abstractable beyond GitHub.

### Projects/actors

```text
list/get projects
get project snapshot
list project participants
get actor status
add/remove project participant (authorized)
```

### Messaging/mediation

```text
list conversations
read conversation
send message
acknowledge delivery
list unread
list Maintainer mediation queue
forward mediation item
edit-and-forward mediation item
ignore/close mediation item
```

### Communication grants

```text
list grants
get grant
create once/scoped/continuous grant
revoke grant
list active communication edges
explain authorization for proposed A -> B message
```

### Tasks/runs

```text
list/get/create task
transition task workflow
set/change accountable owner
append task event
list/dispatch/get/cancel child run
link decision/evidence/result
```

### Sessions/activity

```text
list/get actor sessions
subscribe to project/actor/task activity
get semantic events
get retained raw provider events where authorized
send actor message/redirect through normal messaging
get presence/heartbeat/staleness
```

### Search

Search/filter by project, actor, task, message, decision, evidence, event type, service/provider/model, status and time range.

---

## 16. Authorization rules the service must share with the CLI

There must be one semantic implementation or one conformance suite proving equivalent behavior.

At minimum:

- malformed/dangling participant refs fail closed;
- non-members cannot act as permanent project actors;
- project membership alone does not authorize peer direct messaging;
- Maintainer -> project actor direct messaging is allowed;
- project actor -> Maintainer messaging is allowed;
- peer A -> B requires valid active directional grant or Maintainer mediation;
- expired/consumed/out-of-scope grants do not authorize delivery;
- grant issuer must have Maintainer/delegated grant authority;
- direct grant does not modify semantic command precedence;
- task/run-scoped actors cannot escape their scope;
- durable writes complete before success/realtime acknowledgement;
- derived index failure cannot redefine canonical state.

`doctor` should verify graph invariants. `audit` should verify semantic/execution obligations. Future `reconcile` may repair derived evidence/index inconsistencies. Future `gc` may compact/reap according to explicit retention rules.

---

## 17. Application data/index model

A hosted database is allowed and expected for speed, search and realtime subscriptions, but it is derived.

Useful derived tables/indexes include:

- projects;
- actors/project participants;
- task current workflow/owner/waiting;
- active communication edges;
- conversations/unread counts;
- actor presence/session status;
- semantic activity events;
- task/run relationships;
- decision/evidence backlinks;
- search tokens/tags;
- repository commit/version cursors.

Every derived row that matters should be traceable to canonical Git object/ref path(s) and commit/version provenance.

The entire derived index must be rebuildable from the authoritative repository plus permitted local/provider telemetry that has been durably promoted into the graph.

---

## 18. Notifications

Notifications are derived from durable events, not authoritative state themselves.

Examples:

- Maintainer mediation request;
- actor blocked/needs approval;
- direct grant requested/consumed/revoked;
- task completed/failed;
- actor unexpectedly stopped;
- new direct message;
- important finding/decision-ready event.

Push/email/system notifications deep-link to the canonical project/object/event.

---

## 19. Security and privacy

- Repository access is least-privilege.
- Human sessions use short-lived tokens/device sessions, not one subscription-wide static key.
- Provider credentials/secrets never belong in canonical Git coordination records.
- Communication grants are explicit, directional, scoped and auditable.
- Provider raw streams may contain sensitive source/tool output; retention/access policies must be configurable.
- Hidden chain-of-thought must not be requested or represented as a required product capability.
- Every externally visible durable action has actor identity and provenance.

---

## 20. Git provider abstraction

GitHub is an implementation provider, not a domain concept.

Define a repository provider interface for:

```text
fetch tree/file/ref
create/update/delete semantic files
atomic/multi-file commit transaction
compare/version
push/update branch
webhook/change notification
repository access validation
```

Implement GitHub first where practical, but do not expose GitHub-only semantics in Cagents objects or client workflows.

---

## 21. Required conformance tests

### Core semantic tests

- membership exact-target validation;
- malformed/dangling refs fail closed;
- message post + delivery atomicity;
- unread -> read transition;
- peer direct message rejected/mediated without grant;
- once grant consumed exactly once;
- scoped grant invalid after scope closure;
- continuous grant works until revoke;
- directional grant does not authorize reverse direction;
- grant does not alter authority precedence;
- task has exactly one workflow ref;
- task transition writes event + moves ref atomically;
- one accountable owner;
- subagent run provenance;
- doctor/audit invariants.

### Provider-wrapper tests

Use fake providers to prove:

- wrapper starts from START.md/current graph;
- persistent provider session survives multiple Cagents turns;
- Cagents message received while provider is active reaches the same session;
- normalized live event appears before final result logically, but only after durable batch checkpoint is considered durable;
- actor can call Cagents during provider turn without lock deadlock;
- subagent lifecycle events normalize correctly;
- same-second events/messages do not collide;
- durable sync failure does not acknowledge triggering input or release unsynced durable output;
- controller crash/restart resumes safely;
- provider session resume works where supported;
- Linux/macOS portability.

### Application/client tests

Shared behavior tests for web/macOS/iOS/Android:

- project participant picker derives from project membership;
- peer direct recipient is disabled/routed to mediation without grant;
- Maintainer can forward/edit/ignore mediation item;
- grant once/scoped/continuous/revoke operations reflect same semantics across clients;
- live semantic timeline reconciles after reconnect;
- pending offline mutation is not shown as durable until confirmed;
- actor/task/message deep links resolve same canonical IDs;
- repository write conflict/retry is surfaced safely.

---

## 22. Implementation order

The dependency order is:

```text
A. generic_cagents semantic model
   - communication grant object/ref schema
   - authorization / mediation routing
   - task/graph invariants

B. provider-neutral actor runtime
   - normalized adapter protocol
   - persistent structured session bridge
   - mailbox input while active
   - semantic event batching + durable checkpoint
   - restart/resume/presence

C. cagents durable project migration
   - replace/fix tasks in current schema
   - preserve only meaningful decisions/evidence/lessons/messages
   - remove superseded current-tree structures

D. application server
   - shared semantic authorization
   - grants + mediation endpoints
   - live activity/realtime projection
   - provider-neutral repository binding

E. clients
   - Maintainer mediation UX
   - communication-edge controls
   - actor live timeline/tree
   - task/message/decision/evidence workflows
   - web/macOS/iOS/Android parity

F. hardening
   - conformance tests
   - doctor/audit/reconcile
   - failure/restart/offline/security tests
```

The server/client implementation can proceed concurrently with the core runtime **only against this contract**, with conformance tests preventing semantic drift.

---

## 23. Definition of done

Cagents is operationally complete for this architecture when:

1. a Maintainer can start/resume an actor with a short command;
2. the actor reconstructs context from the durable graph;
3. the Maintainer can message every project actor through Cagents;
4. peer actors are mediated by default;
5. Maintainer can grant direct access once/scoped/continuous and revoke it;
6. all routing is enforced identically in CLI/server;
7. a persistent provider session receives authorized Cagents messages while working;
8. provider activity appears as a durable semantic live stream;
9. Maintainer can redirect the actor using an ordinary Cagents message;
10. task workflow/ownership/results are visible and transition without duplicate state files;
11. subagent work is visible as child runs rather than hidden background activity;
12. web/macOS/iOS/Android operate the same semantic contract;
13. Git remains the authoritative durable record and all indexes/views are rebuildable;
14. crash/restart/sync-failure tests prove fail-closed behavior;
15. the active repositories contain no obsolete compatibility structures for the superseded system.

That is the product boundary.
