# Cagents architecture — 29 August 2026

This is the editable Mermaid source for the architecture shown in [`cagents.html`](cagents.html).

Status legend used by the accompanying article:

- **Verified:** exercised by the restart/portability gates or otherwise directly accepted.
- **Implemented:** code exists on the current repository path, but production/compiler/distribution acceptance is still pending.
- **Scaffolded:** contract or package shape exists, but the end-to-end behavior is not complete.
- **Remaining:** discussed product requirement that still needs implementation.

```mermaid
flowchart TB
  subgraph Clients["Cagents applications"]
    WEB["Web UI\nHey client"]
    MAC["macOS app\nHey + hey_mac"]
    IOS["iOS / iPadOS app\nHey + hey_ios"]
    FUTURE["Future Windows / Linux clients"]
  end

  subgraph Cloud["Cagents Cloud — cagents-application"]
    EDGE["HTTPS / realtime API"]
    AUTH["Accounts, sessions, email verification"]
    ORGS["Cagents organizations, membership, roles"]
    BILLING["Entitlements + subscription state"]
    SERVER["Hosted Hey server"]
    INDEX["HeyRecord query/index projection"]
    WORKERS["Repository / agent workers"]
    REPOIF["RepositoryProvider interface"]
  end

  subgraph BillingProviders["Billing providers"]
    STRIPE["Stripe\nhey_stripe"]
    STOREKIT["Future StoreKit / IAP adapter"]
  end

  subgraph GitProviders["Git providers"]
    GHORG["GitHub\nJayTeeSF-Cagents"]
    GHPERSONAL["Legacy/personal GitHub\nJayTeeSF"]
    GITLAB["GitLab"]
    BITBUCKET["Bitbucket"]
    AZURE["Azure DevOps"]
    GENERIC["Generic / self-hosted Git"]
  end

  subgraph Repos["Customer-owned durable coordination history"]
    REPOA["customer-a_cagents"]
    REPOB["customer-b_cagents"]
    REPOC["customer-c_cagents"]
  end

  subgraph Core["generic_cagents — coordination engine"]
    CLI["bin/cagents"]
    SEM["v3 semantics\nmessages · tasks · dockets · future prompts"]
    TOKEN["heavy-work token"]
    VALIDATE["doctor / restart gate / bounded context"]
  end

  subgraph LocalAgents["Direct/local engineering mode"]
    ORCH["orchestrator"]
    LINUX["linux"]
    HUMAN["maintainer / CLI"]
  end

  WEB --> EDGE
  MAC --> EDGE
  IOS --> EDGE
  FUTURE -.-> EDGE

  EDGE --> SERVER
  SERVER --> AUTH
  SERVER --> ORGS
  SERVER --> BILLING
  SERVER --> INDEX
  SERVER --> WORKERS
  WORKERS --> REPOIF

  BILLING --> STRIPE
  STOREKIT -.-> BILLING

  REPOIF --> GHORG
  REPOIF --> GHPERSONAL
  REPOIF -.-> GITLAB
  REPOIF -.-> BITBUCKET
  REPOIF -.-> AZURE
  REPOIF -.-> GENERIC

  GHORG --> REPOA
  GHORG --> REPOB
  GHPERSONAL --> REPOC

  WORKERS --> SEM
  SEM --> REPOA
  SEM --> REPOB
  SEM --> REPOC
  INDEX -. "rebuildable from Git" .-> Repos

  ORCH --> CLI
  LINUX --> CLI
  HUMAN --> CLI
  CLI --> SEM
  CLI --> TOKEN
  CLI --> VALIDATE

  classDef verified fill:#e8fff0,stroke:#198754,stroke-width:2px,color:#102018;
  classDef implemented fill:#eef5ff,stroke:#2563eb,stroke-width:2px,color:#102040;
  classDef scaffold fill:#fff8df,stroke:#c48700,stroke-width:2px,color:#342600;
  classDef remaining fill:#f5f5f5,stroke:#777,stroke-dasharray:5 4,color:#222;

  class CLI,SEM,TOKEN,VALIDATE,ORCH,LINUX verified;
  class EDGE,AUTH,ORGS,BILLING,SERVER,INDEX,WORKERS,REPOIF,GHORG,GHPERSONAL,WEB,MAC,IOS implemented;
  class STRIPE scaffold;
  class FUTURE,STOREKIT,GITLAB,BITBUCKET,AZURE,GENERIC remaining;
```

## Authority boundaries

```mermaid
flowchart LR
  DB["Cloud database\naccounts · sessions · billing · memberships"]
  GIT["Git repos\nmessages · tasks · decisions · research · transcripts"]
  IDX["Derived index\nsearch · reports · attention views"]
  UI["Clients\nweb · macOS · iOS"]

  DB --> UI
  GIT --> IDX
  IDX --> UI
  UI -->|durable coordination write| GIT
  UI -->|account / billing write| DB

  classDef authority fill:#e8fff0,stroke:#198754,stroke-width:2px;
  classDef derived fill:#fff8df,stroke:#c48700,stroke-width:2px;
  class GIT,DB authority;
  class IDX derived;
```

The core rule is that **Git remains canonical for durable coordination history**, while cloud account, authentication and billing state are authoritative in the hosted service. Search/index state is derived and must be reconstructable from Git for coordination records.
