# Cagents v2 — transactional organization control plane for humans and AI agents

**Status:** proposed v2 implementation contract  
**Date:** 1 September 2026  
**Evolves:** `cagents.md` and the September 2026 channel/application architecture  
**Primary repositories:**

- `JayTeeSF/generic_cagents` — provider/protocol-neutral semantic engine, CLI contract, domain rules, storage interfaces and adapters;
- `JayTeeSF/cagents-application` — hosted/self-managed service, identity, policy, realtime, APIs and web/macOS/iOS/Android clients;
- `JayTeeSF/cagents` — current project data, research and migration corpus; existing Git workspaces remain import/export compatible;
- `JayTeeSF/hey-lang-bootstrap-plan` — Hey/Distributed Hey runtime used by the intended service implementation;
- `JayTeeSF/hey_postgres` — intended PostgreSQL integration package for the Hey service.

---

## 0. Why v2 exists

Cagents v1 proved the semantic model but exposed a storage/runtime coupling that cannot survive a realtime multi-user product.

The v1 idea was:

```text
human / agent
    |
generic_cagents
    |
Git working tree
    |
commit / pull / push
    |
durable coordination
```

Git gave Cagents several excellent properties:

- human-readable durable state;
- inspectable history;
- portability;
- easy backup and forking;
- no hidden SaaS-only project truth.

But a Git checkout is a poor online transaction coordinator for many actors. One dirty checkout, conflict, interrupted rebase or long-lived local edit can prevent another actor from durably reporting status. A Slack-like messaging/control product requires many small concurrent writes that cannot be serialized through a shared working tree.

Cagents v2 therefore preserves the **semantic and portability** benefits of v1 while changing the live persistence boundary:

```text
                    CAGENTS V2

human / agent / client / integration
                |
          authenticated API
                |
      semantic authorization/policy
                |
       transactional mutation
                |
       PostgreSQL authority
          |            |
          |            +----> transactional outbox -> realtime / workers
          |
          +-----------------> deterministic Git / JSON / audit export
```

The central v2 decision is:

> **Git remains a supported portable representation and historical export. It is no longer the authoritative mechanism by which realtime Cagents writes become durable.**

---

## 1. Product statement

Cagents is an organization control plane for humans and AI agents.

It gives persistent identities to human and agent actors; organizes them into workspaces, projects, channels, tasks and runs; controls communication and delegation; governs access to source code, tools, models and external agents; records approvals and authority; normalizes heterogeneous agent activity; and preserves a durable causal audit/evidence graph.

Cagents does **not** need to be the best coding agent, model host, sandbox, Git provider, MCP server or A2A implementation.

It coordinates and governs those systems through stable contracts.

A useful summary:

```text
WHO are you?
FOR WHOM are you acting?
WHAT project/task owns the work?
WHO delegated it?
WHAT may you read/write/execute/disclose/delegate?
WHICH model/provider/tool/agent may receive data?
WHICH policy and approval authorized it?
WHAT happened?
WHAT durable organizational state changed?
CAN the organization prove it later?
```

---

## 2. Non-negotiable invariants

### 2.1 One semantic authority per fact

A fact has exactly one live authority.

Examples:

| Fact | v2 authority |
| --- | --- |
| actor identity | Cagents transactional store + identity binding |
| project membership | Cagents transactional store |
| channel definition/membership | Cagents transactional store |
| canonical message | Cagents transactional store |
| unread/read delivery state | Cagents transactional store |
| task intent/current workflow/owner | Cagents transactional store |
| delegation/grant status | Cagents transactional store |
| policy/version | Cagents transactional store |
| approval | Cagents transactional store |
| session/run/event | Cagents transactional store |
| decision/evidence relationship | Cagents transactional store |
| hosted account/auth/billing | Cagents service identity/account store; may share PostgreSQL cluster but remains a separate domain |
| provider PID/local heartbeat | local execution plane / hosted operational presence |
| Git representation | derived export, never competing live authority |
| search index | derived/rebuildable |
| realtime stream | derived from committed outbox/events |

No Git file and database row may both be independently mutable authorities for the same fact.

### 2.2 No durable transaction, no durable display

The v1 invariant survives, with the persistence mechanism generalized:

```text
NO DURABLE TRANSACTION -> NO DURABLE DISPLAY
```

A client may display clearly marked ephemeral provider streaming while work is occurring, but it must not present a message/task transition/approval/decision/result as a durable Cagents fact until the authoritative transaction commits.

### 2.3 Stable IDs, mutable representations

Durable identity is an opaque/stable Cagents ID, not a path or database row location.

Paths, names, Git export layout, indexes and storage implementation may change while IDs remain stable.

### 2.4 Communication permission is not command authority

These remain independent axes:

```text
membership
communication permission
command/delegation authority
resource capability
```

An actor may be able to send a message without having authority to command the recipient. A task delegation does not automatically grant all project resources. An MCP tool visible to a server does not automatically become an allowed capability.

### 2.5 Delegation never amplifies privilege implicitly

A delegated run receives the intersection of:

```text
issuer/delegator authority
AND explicit delegation scope
AND project/task policy
AND resource/data policy
AND target agent/provider trust policy
AND current organization policy
```

Never the union.

### 2.6 Provider independence above adapters

Claude, Codex, Pi, local models, OpenHands, Coder-hosted agents, A2A remote agents and future systems are execution/provider implementations below stable Cagents semantics.

No project-level fact should require one provider's private protocol to interpret it.

### 2.7 Standard interoperability before proprietary duplication

Use interoperable standards where they fit:

- **MCP:** agent/application -> tools, data and resources;
- **A2A:** agent/system -> independent agent/system;
- **Cagents:** identity, project authority, communication/delegation policy, resource policy, approval, audit and durable organizational state around those interactions.

---

## 3. Deployment modes

Cagents v2 has one semantic API and multiple deployments.

### 3.1 Hosted Cagents Cloud

```text
web / native / CLI / agents
          |
      Cagents Cloud
          |
   shared service plane
          |
 tenant-isolated transactional data
```

Requirements:

- strong tenant isolation;
- enterprise identity integration;
- encryption;
- no private customer-content training by default;
- region/deployment policy where offered;
- production backup/PITR;
- audit/SIEM export.

### 3.2 Customer VPC / private cloud

Cagents application/service runs in customer-controlled infrastructure while optionally consuming approved external model APIs.

### 3.3 Self-managed

Customer operates Cagents control plane, database and execution adapters.

### 3.4 Offline / air-gapped profile

Long-term enterprise profile:

- no mandatory Cagents cloud dependency;
- offline package/update channel;
- local identity integration or approved offline identity mode;
- local/private model endpoints;
- local Git/export destinations;
- signed releases/SBOM/provenance.

### 3.5 Local single-user mode

The CLI still talks to the **same service contract** over loopback/local socket:

```text
cagents CLI
    |
local Cagents server
    |
embedded storage implementation
```

A local implementation may eventually use Turso Database or another SQLite-compatible embedded engine. It must not create a second semantic model.

---

## 4. Storage architecture

### 4.1 Primary hosted/self-managed authority: PostgreSQL

The first v2 production implementation uses PostgreSQL.

Reasons:

- mature MVCC and concurrent write behavior;
- transactions and constraints;
- row/advisory locks;
- crash recovery;
- backup/PITR and replication maturity;
- broad managed/on-prem availability;
- security/monitoring ecosystem;
- existing `hey_postgres` package direction.

Cagents domain code must depend on a storage interface so PostgreSQL does not leak through every semantic operation.

### 4.2 Storage interface

Conceptual interface:

```text
CagentsStore
  transaction(fn)
  get_actor(id)
  get_project(id)
  authorize(...)
  append_event(...)
  mutate_task(...)
  create_message_with_deliveries(...)
  create_delegation(...)
  consume_grant(...)
  record_approval(...)
  enqueue_outbox(...)
  snapshot(cursor)
```

All compound semantic mutations execute atomically.

### 4.3 Event receipts plus current projections

Cagents should preserve both:

1. efficient current state; and
2. immutable semantic history.

Example tables/concepts:

```text
organizations
workspaces
actors
actor_bindings
projects
project_memberships
channels
channel_memberships
conversations
messages
message_deliveries
tasks
task_state
delegations
communication_grants
resource_grants
policies
policy_versions
approvals
sessions
runs
events
decisions
evidence
artifacts
idempotency_keys
outbox
export_cursors
```

A task transition updates current state and appends the corresponding semantic event in the same transaction.

### 4.4 Transactional outbox

Every mutation that must trigger external/realtime work adds an outbox item before commit.

```text
transaction
  authoritative mutation
  audit/event receipt
  outbox item
commit

outbox consumer
  -> websocket/SSE
  -> push notification
  -> actor mailbox stream
  -> search/index worker
  -> Git exporter
  -> SIEM/webhook
```

Consumers are idempotent and checkpoint progress.

### 4.5 Idempotency

Every externally retryable mutation supports an idempotency key.

Retries after lost responses return the original durable result rather than creating duplicates.

### 4.6 Optimistic revisions

Mutable current objects use revisions/versions where races matter.

Task example:

```text
id: task:ownership-repair
workflow: in_progress
owner: actor:orchestrator
revision: 37
```

A transition expecting revision 37 either succeeds and produces 38 or explicitly conflicts.

### 4.7 Narrow exclusive locks/leases

Use locks/leases only for real exclusivity:

- one-shot communication/resource grant consumption;
- singleton integration ownership;
- heavyweight build/benchmark resource;
- irreversible privileged transition where concurrent acceptance is invalid.

Routine messages do not lock a workspace/project.

---

## 5. Git becomes deterministic export and import

### 5.1 Git remains a product feature

Customers should be able to export Cagents state into a readable repository containing familiar concepts:

```text
actors/
projects/<project>/participants/
projects/<project>/channels/
projects/<project>/messages/
projects/<project>/tasks/
projects/<project>/sessions/
projects/<project>/runs/
decisions/
evidence/
artifacts/
policies/
```

Exact paths may evolve; stable IDs are embedded so identity is not path-dependent.

### 5.2 Export properties

A Git export:

- is generated from a consistent database snapshot/event cursor;
- is deterministic for the same semantic snapshot;
- records schema version and Cagents event cursor/hash;
- may include signed manifests/commits;
- can target GitHub, GitLab, Bitbucket, local/self-hosted Git or downloaded bundles;
- is safe to delete/rebuild because it is a projection.

### 5.3 No silent bidirectional dual-master sync

Editing exported Git files does not silently mutate live authority.

A Git-to-Cagents operation is an explicit import/migration command that:

1. reads a declared schema;
2. validates stable IDs and invariants;
3. computes a semantic change set;
4. authorizes the importing actor;
5. applies mutations through the normal transactional API;
6. records import provenance.

### 5.4 Existing v1 repos

Existing `*_cagents` repositories are migration inputs and export compatibility targets.

No current project data should be stranded by v2.

---

## 6. Identity model

### 6.1 Persistent Cagents actor

Every durable human or persistent agent has an actor ID.

```text
actor
  id
  type: human | agent | service
  display_name
  organization/workspace relationships
  status/lifecycle
  metadata
```

Provider session identity is linked below actor identity, not substituted for it.

### 6.2 Human identity binding

Hosted/private deployments bind authenticated users to durable Cagents human actors.

Supported enterprise direction:

- OIDC/SAML SSO;
- SCIM provisioning/deprovisioning;
- group/role synchronization;
- MFA enforced through IdP/policy;
- service accounts where appropriate.

### 6.3 Agent workload identity

An agent process/session receives a workload identity/session credential tied to:

```text
actor
workspace
project(s)
run/session
execution environment
credential expiry
```

Credentials should be short-lived and scoped.

### 6.4 Provider sessions

One persistent actor may have sessions such as:

```text
actor:compiler-orchestrator
  session A -> Claude Code
  session B -> Codex
  session C -> local model
```

The actor's project authority is Cagents state, not provider account identity.

---

## 7. Organizations, workspaces and projects

### 7.1 Organization

Billing, enterprise identity/policy root, deployment configuration, data governance and administrative boundary.

### 7.2 Workspace

A collaboration/coordination boundary containing projects and actors visible under workspace policy.

### 7.3 Project

A work-authority boundary.

Project membership answers:

> May this actor participate in this project's work state?

It does not automatically subscribe the actor to all conversations or grant all source/tool access.

### 7.4 External/global actors

An actor may participate in a targeted/public channel or external A2A/DM relationship without becoming a full project member.

This preserves the September 2026 cross-project bug/support intake model.

---

## 8. Channels and conversations

### 8.1 Channel membership is distinct from project membership

A channel is a conversation boundary.

Attributes:

```text
id
project/workspace ownership
name
visibility: internal | targeted | public
join_policy: invite | open | policy
retention/data classification
membership set
```

### 8.2 Channel authorization

An actor may post/receive only when current channel policy permits it.

Targeted cross-project channels remain a first-class pattern:

```text
MMeow actor
  joins #hey bug-intake
  can post/reply there
  does NOT become a Hey project participant
  does NOT receive Hey tasks/sessions/internal channels
```

### 8.3 Direct messages

DM authorization is policy-evaluated.

Project-internal peers may require explicit communication grants; external/project DMs may use separate policy. Direction, scope and authority are never implicit.

### 8.4 Canonical message + per-recipient delivery

One canonical message object may have many delivery records.

Creation of message + initial deliveries + relevant grant consumption + audit event is atomic.

### 8.5 Read/acknowledgement

Read/ack state is per delivery, not mutation of message body.

---

## 9. Delegation becomes a first-class object

A v2 delegation is broader than a communication grant.

Conceptual schema:

```yaml
id: delegation-7f2
organization: acme
project: hey
issuer: human:maintainer
principal: agent:orchestrator
recipient: agent:security-reviewer
scope:
  task: ownership-repair
capabilities:
  - source.read: changed-files
  - artifact.write: review-report
communication:
  - project:hey/channel:security-review
may_redelegate: false
expires_at: 2026-09-01T23:00:00Z
policy_version: engineering-reviews@42
approval: approval-91
```

### 9.1 Delegation answers

- who issued authority;
- who receives it;
- project/task/run scope;
- resources/capabilities;
- allowed communication/data egress;
- whether redelegation is allowed;
- time/usage bounds;
- policy version;
- approval/evidence.

### 9.2 Communication grants remain useful

Communication grants are a specialized authority controlling direct message reachability. They may be implemented as a delegation/capability subtype while retaining clear user semantics:

- once;
- scoped;
- continuous/until revoked.

### 9.3 Revocation

Revocation prevents future Cagents-authorized operations immediately.

For remote providers/A2A systems distinguish:

```text
authority revoked
!=
remote computation proven stopped
```

Record cancellation attempts and remote confirmations separately.

---

## 10. Resource and source-code authorization

Enterprise Cagents needs first-class resources, not only project membership.

### 10.1 Resource examples

```text
repository
git branch/ref
path/path pattern
build environment
machine
secret/credential reference
MCP server
MCP tool/resource
A2A remote agent
model/provider
network destination
artifact bucket
production environment
```

### 10.2 Capability model

Examples:

```text
source.read
source.write
source.commit
source.pr_create
command.execute
network.connect
secret.use
mcp.tool.invoke
mcp.resource.read
a2a.task.delegate
artifact.read
artifact.write
production.deploy
```

### 10.3 Source controls

A grant can scope:

- repository;
- branch/ref;
- path patterns;
- read versus write;
- protected operations;
- allowed execution environment.

A provider wrapper/sandbox should receive only the effective allowed source view/capabilities where technically feasible.

---

## 11. Policy engine

### 11.1 Product semantics before policy language

Do not begin by inventing a giant policy DSL.

The domain model must first expose stable facts:

```text
subject actor
organization/workspace/project
resource
requested action
current delegation
current task/run
source/data classification
provider/model
execution environment
network target
approval state
policy version
```

Then evaluate deterministic policy over those facts.

### 11.2 RBAC + relationships + attributes

Enterprise requirements exceed simple roles.

Support concepts equivalent to:

- role-based permissions;
- relationship-based permissions (member/owner/channel member/delegated-by);
- attribute policy (data classification, region, provider, environment, time, risk).

### 11.3 Policy version receipt

Every sensitive authorization event records the exact policy version/input/result so a later audit does not reinterpret history using today's policy.

### 11.4 Fail closed

If required identity, policy, approval or durable receipt cannot be established, privileged operation fails.

---

## 12. Approval model

Approval is a durable object, not a transient UI click.

Examples requiring policy-configurable approval:

- production mutation;
- secret use;
- broad source export;
- external A2A data transmission;
- high-risk MCP tool;
- protected-branch write;
- model/provider outside normal routing;
- unusually expensive compute;
- delegation with redelegation rights.

Approval records:

```text
requester
requested action/capability
approver(s)
scope
policy/risk reason
time
expiration/use count
result
```

One-shot approvals are consumed atomically.

---

## 13. MCP integration

MCP is the standard Cagents boundary for many agent-to-tool/data interactions.

### 13.1 Approved-server registry

Cagents maintains local metadata for approved MCP servers:

```text
server identity / canonical URI
owner/trust class
transport/auth configuration
allowed organizations/workspaces/projects
capability snapshot
risk/data classification
policy bindings
```

Remote MCP metadata is a claim; local Cagents approval is authority.

### 13.2 Capability filtering

The agent receives only tools/resources/prompts allowed by effective Cagents policy.

### 13.3 Credentials

For HTTP MCP follow current MCP authorization semantics, including resource/audience binding and standard OAuth-oriented security where applicable.

Never place reusable secrets/tokens into prompts, Git exports or ordinary message bodies.

### 13.4 Audit normalization

Sensitive/meaningful tool calls generate normalized events such as:

```yaml
type: mcp.tool_call
actor: agent:orchestrator
project: hey
task: ownership-repair
server: github-enterprise
capability: create_pull_request
policy_version: source-change@17
approval: approval-91
request_hash: ...
result_hash: ...
status: succeeded
```

Payload retention/redaction can vary by policy.

---

## 14. A2A integration

A2A is the standard boundary for interoperable remote-agent work.

### 14.1 Agent registry

Import/refresh Agent Cards and keep them distinct from local trust metadata:

```text
A2A Agent Card
  endpoint
  capabilities/skills
  declared auth

Cagents registration
  owning vendor/team
  trust classification
  approved projects
  allowed data classes
  egress policy
  contractual/deployment metadata
```

### 14.2 Dispatch

Before sending an A2A message/task:

1. authenticate Cagents actor;
2. resolve project/task/run context;
3. resolve delegation authority;
4. evaluate target-agent/data-egress policy;
5. obtain required approval;
6. create durable dispatch receipt;
7. send using A2A;
8. normalize task/status updates;
9. ingest artifacts/results as Cagents evidence where applicable.

### 14.3 Remote opacity

Cagents does not claim access to hidden internals of an A2A remote agent.

Audit what can actually be evidenced:

- request/data sent;
- declared remote identity/capability;
- protocol status/events;
- returned artifacts;
- cancellation acknowledgement;
- contractual/deployment metadata if configured.

---

## 15. Agent execution providers

Cagents provider/execution adapters can target:

- Claude Code;
- OpenAI Codex;
- Pi;
- local model runtimes;
- OpenHands;
- Coder workspaces/agents;
- customer-specific sandboxes;
- future provider SDKs.

### 15.1 Execution provider contract

Conceptual interface:

```text
start(session_context, effective_capabilities)
resume(provider_session_id, ...)
deliver(message/control_event)
stream_normalized_events()
request_stop(reason)
health/presence()
```

### 15.2 Structured protocols over TUI scraping

Prefer SDK/event/JSON/RPC/stream interfaces. PTY/TUI capture is a compatibility fallback.

### 15.3 Execution policy

Cagents must be able to communicate/enforce, either directly or through execution provider capabilities:

- filesystem/source scope;
- command allow/deny policy;
- network destinations;
- environment variables/secrets;
- resource limits;
- model selection;
- MCP/A2A endpoints;
- approval requirements.

Adapters report unsupported enforcement capabilities explicitly; absence must never be silently treated as enforcement.

---

## 16. Sessions, runs and normalized activity

### 16.1 Session

A durable actor/provider interaction context.

### 16.2 Run

A bounded attempt/work lane linked to project/task/delegation.

Parallel runs do not create multiple accountable task owners.

### 16.3 Event classes

Normalize provider/protocol-native events into a stable semantic set, for example:

```text
started
status
plan
message_received
read
tool_start
tool_result
mcp_tool_call
a2a_dispatch
a2a_status
finding
dispatch
subagent_status
decision
edit
test
approval_requested
approval_resolved
resource_grant
policy_denied
reasoning_summary
response
result
failed
stopped
```

### 16.4 Reasoning boundary

Store only reasoning/thinking material actually exposed by the provider and permitted by policy.

Never claim hidden chain-of-thought access.

### 16.5 Batching

Token deltas are not individual authoritative transactions. Aggregate/batch low-level stream data into bounded semantic durable events while retaining richer transient/raw data according to policy.

---

## 17. Tasks and accountability

### 17.1 Task object

A task has stable identity, intent/scope and current state.

Recommended workflow states remain:

```text
todo
in_progress
waiting
blocked
done
cancelled
```

### 17.2 One accountable owner

Exactly one accountable persistent owner at a time unless the domain is deliberately changed by a future specification.

Child agents/runs are delegated attempts, not co-owners.

### 17.3 Transition transaction

A task transition validates:

- expected revision/current state;
- actor authority;
- ownership/delegation policy;
- required evidence/approval;
- dependent resource leases.

Then atomically:

- updates current task state;
- updates owner/waiting relationships where needed;
- appends event;
- links decision/evidence;
- creates outbox notifications.

---

## 18. Heavy work and machine-resource leases

Cagents must prevent autonomous agents from accidentally destabilizing shared machines.

Model scarce/heavy resources explicitly:

```yaml
resource: machine:mac-studio:heavy-build
holder: run:compiler-benchmark-42
limits:
  memory_mb: 32768
  cpu_slots: 8
expires_at: ...
```

The service can coordinate:

- one heavyweight benchmark/build at a time per machine/pool;
- memory/CPU quotas;
- lease expiry/recovery;
- privileged exceptions;
- cost/budget limits.

Hey/Distributed Hey may schedule computation; Cagents owns why an organizational actor is authorized to consume the resource.

---

## 19. Decisions, evidence, artifacts and lessons

### 19.1 Decisions

Binding project/task decisions are durable objects with provenance and precedence.

### 19.2 Evidence

Evidence can include:

- tests;
- benchmark receipts;
- source citations;
- commits/patch hashes;
- A2A artifacts;
- MCP/tool results;
- security approvals;
- human rulings;
- generated reports.

### 19.3 Artifacts

Large/binary artifacts live in object storage/content-addressed storage, not directly in ordinary transactional rows or Git text files.

The database stores identity, metadata, hash, classification, retention and access policy.

### 19.4 Lessons/memory

Persistent learned constraints remain explicit typed objects, subordinate to system/org/project/task policy and binding decisions.

Customer-specific memory/model-training corpora are opt-in features with explicit data rights and provenance.

---

## 20. Secrets and credentials

Secrets are references, not ordinary content.

```text
Cagents database -> secret reference + policy metadata
KMS/secret manager -> credential material
agent runtime -> short-lived resolved credential when authorized
```

Requirements:

- no secret values in Git exports;
- no accidental secret values in standard logs/events;
- short-lived credentials where possible;
- audience/resource scope;
- rotation/revocation;
- access receipt;
- customer-managed key support for enterprise deployments where practical.

---

## 21. Data governance

Organizations need policy for:

- data classification;
- provider/model routing;
- external A2A egress;
- MCP resource/tool exposure;
- region/residency;
- retention/deletion;
- legal hold;
- export;
- training/learning use;
- redaction;
- audit visibility.

### 21.1 No private customer training by default

Private workspace content is used to operate Cagents for that customer and is not used to train shared models by default.

Any cross-customer training requires explicit opt-in, contractual rights and provenance.

### 21.2 Customer-specific learning

Cagents may support customer-owned corpus generation/fine-tuning/SLM training inside the customer's boundary under explicit configuration.

This is a feature, not a hidden data-use business model.

---

## 22. Audit model

The audit trail should answer causal questions, not merely list API calls.

For every meaningful operation:

```text
WHO performed it?
WHICH human/service/agent identity initiated the chain?
WHICH delegation/authority allowed it?
WHICH project/task/run did it belong to?
WHICH policy version evaluated it?
WHICH source/data/resource was accessed?
WHICH model/provider/remote agent/tool executed it?
WHICH approvals occurred?
WHAT was the result?
WHAT durable state changed?
```

### 22.1 Tamper evidence

Support:

- append-only event semantics;
- hash chaining or signed batch manifests where useful;
- deterministic signed export bundles;
- external SIEM/immutable archive sinks;
- restricted audit-administrator capabilities.

Do not claim blockchain-like guarantees where ordinary cryptographic manifests and protected storage are sufficient.

---

## 23. Realtime and notifications

Realtime is a committed projection, never authority.

```text
transaction commit
    |
outbox
    |
    +--> SSE/WebSocket
    +--> agent mailbox stream
    +--> push
    +--> webhook
    +--> A2A callback handling
```

Clients reconnect using cursors and replay missed durable events.

Presence/typing/low-value transient UI signals may use ephemeral channels but must not be confused with durable work state.

---

## 24. Search, analytics and organizational intelligence

Search/indexes are derived and rebuildable from transactional authority + artifact metadata.

Support dimensions such as:

- organization/workspace/project;
- actor/human/agent;
- model/provider;
- task/run/session;
- channel/conversation;
- date range;
- resource/repository;
- policy/approval;
- result/failure;
- cost/latency/token/compute usage;
- security denial/exception.

This supports the planned Cagents application analysis UI without making analytics storage authoritative for coordination.

### 24.1 Future private SLM/corpus feature

A customer may choose a project/date/actor corpus and generate a provenance-preserving training/evaluation dataset.

Requirements:

- explicit authorization;
- classification/retention filtering;
- redaction option;
- deterministic corpus manifest;
- source-event IDs;
- no hidden shared training use;
- customer-owned output/model by default.

---

## 25. Client contract

Web, macOS, iOS, Android and CLI operate the same capability model.

Required major surfaces:

- organization/workspace/project picker;
- channels/DMs;
- tasks and ownership;
- actor directory/status;
- live sessions/runs/subagent tree;
- delegation/grant controls;
- approvals queue;
- source/resource capability view;
- policy explanations (“why allowed/denied?”);
- decisions/evidence/artifacts;
- analytics/search;
- security/audit timeline;
- model/provider configuration;
- MCP/A2A registries;
- deployment/repository/export health;
- notifications/settings.

### 25.1 Slack-like communication, security-console depth

Ordinary conversation should feel familiar and low-friction. Privileged actions expose extra authority/policy context when needed.

Example relationship UI:

```text
Security reviewer

Project access:        channel-only
Direct communication: scoped to task ownership-repair
Source access:         changed files, read-only
May delegate:          no
External A2A:          approved security-review endpoint
Expires:               6:00 PM

[Revoke now] [Change scope] [View authorization trail]
```

---

## 26. API principles

### 26.1 Semantic APIs, not database CRUD

Prefer:

```text
POST /messages
POST /tasks/:id/transitions
POST /delegations
POST /approvals/:id/resolve
POST /runs
POST /mcp/invocations
POST /a2a/dispatches
```

over exposing generic “update row” endpoints.

### 26.2 Every mutation context

Server derives/authenticates identity. Clients do not assert arbitrary actor IDs.

A mutation context includes:

```text
authenticated principal
bound actor/workload identity
workspace/project
idempotency key
client/session info
requested operation
```

### 26.3 Explain authorization

Policy APIs should be able to return machine-readable reason chains:

```json
{
  "allowed": false,
  "reason": "external_agent_disallowed_for_data_class",
  "policy_version": "source-egress@14",
  "facts": {
    "data_class": "customer-confidential",
    "target": "a2a:vendor-reviewer"
  }
}
```

Sensitive details are filtered according to caller permission.

---

## 27. CLI evolution

Existing command concepts should survive where sensible:

```text
cagents resume PROJECT
cagents inbox
cagents send --channel ...
cagents dm --to ...
cagents channel ...
cagents task ...
cagents agent run ...
```

But the default backend becomes an authenticated Cagents server.

### 27.1 Backend modes during migration

```text
server:  v2 hosted/self-managed API
local:   local v2 server + embedded storage
git:     legacy/migration backend
```

Avoid making backend selection change semantic meaning.

### 27.2 Offline queueing

If offline writes are later supported, they must use explicit operation IDs/base revisions/conflict rules. Do not silently pretend disconnected concurrent changes can always merge.

---

## 28. Execution-service implementation in Hey

The intended service architecture can use Hey as follows:

```text
stateful actors
  -> connection/session coordinators
  -> policy/config watchers
  -> per-tenant/workspace coordinators where useful

stateless workers
  -> indexing
  -> export rendering
  -> event normalization
  -> artifact processing
  -> policy evaluation where pure

Jobs
  -> retries
  -> webhook delivery
  -> Git exports
  -> scans
  -> analytics
  -> long-running integration operations

Distributed Hey
  -> horizontal worker/service scaling
```

PostgreSQL remains the transactional durable authority. Distributed Hey should not reimplement database consensus/transactions.

---

## 29. Regulated-industry readiness

Cagents should build core controls once and package evidence/deployment profiles rather than fork into separate products.

### 29.1 Defense / CUI profile

Features relevant to organizations implementing NIST SP 800-171/CMMC requirements:

- self-host/private deployment;
- strict identity/access control;
- least privilege;
- audit/event export;
- controlled external connections/data egress;
- strong configuration/change management;
- signed release/SBOM direction;
- offline/air-gap option over time.

Cagents supports controls/evidence; it does not self-certify a customer as CMMC compliant.

### 29.2 Healthcare / PHI profile

Where Cagents handles ePHI:

- appropriate contractual/BAA support for hosted service;
- access/audit controls;
- encryption;
- provider/data routing restrictions;
- retention/deletion;
- private deployment;
- no-training default;
- incident/access evidence.

### 29.3 Financial services profile

- strong supervision/approvals;
- model/vendor governance;
- record retention/legal hold;
- audit/SIEM;
- source/data egress policy;
- separation of duties.

### 29.4 Life sciences profile

- traceable electronic records;
- approval/signature workflows where applicable;
- requirement/task/evidence/decision lineage;
- validation/export support;
- controlled changes.

Compliance representations require scoped legal/security validation.

---

## 30. Security baseline

Before enterprise GA:

- threat model;
- secure SDLC;
- dependency/SBOM process;
- secret scanning;
- encryption in transit/at rest;
- strong tenant isolation;
- authorization tests including confused-deputy/delegation attacks;
- audit integrity tests;
- backup/restore drills;
- incident-response plan;
- vulnerability disclosure/patch process;
- penetration testing;
- least-privilege service identities;
- rate/abuse controls;
- session/token revocation;
- data deletion/export controls.

SOC 2 / other assurance can follow product/customer need, but architecture should not block it.

---

## 31. Migration plan from Git-authoritative v1

### Phase 0 — freeze semantic assumptions

Document current actors/projects/channels/messages/tasks/sessions/grants/decisions/evidence and identify any object whose identity currently depends solely on path.

### Phase 1 — assign stable IDs

Add/migrate IDs so objects can survive storage representation changes.

### Phase 2 — semantic storage adapter in `generic_cagents`

Move all domain operations behind interfaces. Direct filesystem reads/writes above the adapter become violations.

### Phase 3 — v2 PostgreSQL schema + transaction tests

Implement core transactional model, event receipts, outbox, idempotency and conflict handling.

### Phase 4 — importer

Import existing Cagents repositories with validation and migration receipts.

### Phase 5 — API-backed CLI

Existing agents/humans use current CLI concepts against v2 server.

This is important: gain concurrency before waiting for every graphical client.

### Phase 6 — Git exporter

Export v2 state into a deterministic repository and compare semantic equivalence against representative v1 corpora.

### Phase 7 — provider wrappers move to API mailboxes/events

No provider wrapper needs a shared coordination checkout.

### Phase 8 — hosted application cutover

Web/native clients and all hosted mutations use v2 transactional authority.

### Phase 9 — legacy Git direct-mode deprecation

Keep explicit import/export and possibly a legacy adapter for a bounded migration window; do not preserve indefinite dual authority.

---

## 32. Acceptance tests for v2 authority

### 32.1 Concurrent messaging

Hundreds of independent writers can send/acknowledge messages without a project/workspace-level lock or Git cleanliness dependency.

### 32.2 Atomic fan-out

A message cannot exist durably without required initial deliveries, and deliveries cannot target a missing message.

### 32.3 Conflicting task transition

Two agents racing an incompatible task transition produce one accepted transition and one explicit conflict/re-evaluation result.

### 32.4 One-shot grant/delegation

Concurrent uses cannot consume the same one-shot authority twice.

### 32.5 Crash after commit

Kill service after authoritative transaction commit and before realtime publish. Restart delivers the committed outbox item without losing the event or creating a second semantic mutation.

### 32.6 Retry after lost response

Same idempotency key returns the original accepted result and creates exactly one message/task/delegation/etc.

### 32.7 Revocation

After revocation commits, no new operation requiring that authority is admitted. Remote cancellation state is separately tracked.

### 32.8 Policy-version reproducibility

Audit can show which version/facts authorized/denied a historical sensitive operation.

### 32.9 Git export reproducibility

Same snapshot/cursor generates semantically identical export tree/manifests.

### 32.10 Disaster recovery

Restore database/object storage and reproduce current state plus valid Git/audit export without any user's local checkout.

### 32.11 Tenant isolation

Cross-tenant identifier guessing, search, realtime, export and object/artifact access fail closed.

### 32.12 Capability narrowing

Delegated/A2A/MCP child activity cannot exceed the intersection of parent + delegation + project/resource policy.

---

## 33. Performance targets and measurement

Do not optimize against invented numbers, but establish explicit budgets before GA for:

- message write p50/p95/p99;
- acknowledgement write;
- realtime commit-to-delivery latency;
- task transition;
- policy evaluation;
- concurrent writers per workspace/tenant;
- reconnect/replay;
- exporter throughput;
- session-event ingestion;
- large-workspace snapshot/search;
- audit export.

Benchmark with realistic contention patterns, not only independent inserts.

A database/storage replacement is accepted because it improves measured Cagents workloads and correctness, not because a database vendor advertises a benchmark.

---

## 34. Commercial product boundary

A viable open-core split is compatible with this architecture.

Possible open components:

- CLI;
- semantic schemas/contracts;
- provider adapters;
- A2A/MCP interoperability;
- local server;
- Git import/export;
- core coordination engine.

Enterprise paid value can include:

- hosted/private control plane;
- enterprise SSO/SCIM;
- advanced policy/governance;
- audit/SIEM/compliance evidence;
- HA/backup/deployment tooling;
- managed identity/credential integration;
- advanced analytics;
- admin/security UI;
- enterprise support/SLA.

Support is part of the offering, not the only paid feature.

---

## 35. What v2 intentionally does not do

### It does not build a new general-purpose database

Use mature transactional storage; innovate on Cagents semantics.

### It does not make Git disappear

Git becomes a first-class export/import/escrow format rather than live transaction manager.

### It does not replace A2A or MCP

It governs them.

### It does not require one model vendor

Provider neutrality is fundamental.

### It does not equate self-hosting with compliance

Deployment is one control among many.

### It does not silently train shared models on customer content

Customer trust is part of the product.

### It does not pretend hidden provider reasoning is available

Capture exposed/reliably observable events only.

---

## 36. Implementation priority

### P0 — remove the realtime correctness blocker

1. stable IDs;
2. storage/domain interface;
3. PostgreSQL core schema;
4. transactions/event receipts/outbox/idempotency;
5. API-backed CLI;
6. v1 importer + deterministic Git exporter.

### P1 — build the product customers pay to govern

1. enterprise identity/workload identity;
2. delegations/grants;
3. policy engine + explanation;
4. source/resource capabilities;
5. approvals;
6. audit/SIEM;
7. private/self-managed deployment;
8. execution-provider enforcement contract.

### P2 — become the interoperable control plane

1. MCP registry/policy/gateway integration;
2. A2A registry/dispatch/artifact integration;
3. model/provider routing policy;
4. cross-project/external collaboration controls;
5. rich security/admin UI.

### P3 — regulated profiles + organizational intelligence

1. CMMC/NIST evidence mapping;
2. finance/health/life-science profiles;
3. air-gap distribution;
4. analytics;
5. private corpus/SLM tooling;
6. advanced policy automation.

---

## 37. Product north star

The first version of Cagents asked agents to persist enough state that a terminal crash did not erase the project.

V2 makes the stronger promise:

> **An organization can safely let many heterogeneous agents work, communicate and delegate in parallel because Cagents makes identity, authority, policy, durable state and accountability independent of any one agent, terminal, Git checkout, model vendor or execution environment.**

The system succeeds when a Maintainer, security engineer or auditor can ask:

```text
What is happening?
Who owns it?
Who delegated it?
Why is this agent allowed to do it?
What source/data/tools/models/agents can it reach?
Which policy/approval permitted it?
What has it actually done?
What is unfinished?
Can I stop or narrow it now?
Can I export and prove the record later?
```

—and Cagents can answer from durable authoritative state without reconstructing a vanished terminal, trusting a dirty Git checkout, or depending on one provider's private memory.

---

## 38. Companion research

Decision research supporting this v2 proposal lives in `JayTeeSF/cagents/research/`:

- `2026-09-01-multi-agent-harness-competitive-landscape.md`
- `2026-09-01-commercial-wedge-and-regulated-industries.md`
- `2026-09-01-storage-concurrency-and-git-export.md`
- `2026-09-01-a2a-mcp-and-cagents.md`
- `SOURCES.md`

Public explainers:

- `/cagents-possible-features.html`
- `/cagents-a2a-mcp.html`
- existing `/cagents.html`, `/cagents-architecture.html`, `/cagents-how-to.html`

`cagents_v2.md` is the proposed evolution path. Once adopted, the other public architecture/how-to pages should be revised so they no longer describe Git as live hosted coordination authority.
