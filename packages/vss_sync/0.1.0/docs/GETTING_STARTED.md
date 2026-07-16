# Getting started

Install and lock `vss_sync` as described in [README](README.md), then use the
canonical protocol helpers.

```hey
import 'pkg:vss_sync@0.1.0/main'

program
  says VssSync.protocol()
  says VssSync.create_revision_path('personal', 'email')
  says VssSync.field_path('personal', 'email', 'password')
  says VssSync.recovery_path('personal')
end
```

Expected protocol identity:

```text
vss-sync-3
```

Validation methods return an empty string when an envelope is accepted and a
stable error code when it is rejected:

```hey
let error = VssSync.revision_error(envelope, 'personal', 'email')
if error != ''
  fail error
end
```

Conflict selection accepts encrypted field revisions. It delegates causal merge
semantics to the general `stdlib:sync` contract and returns:

```hey
{
  winner: revision_or_nil,
  alternate: conflicting_revision_or_nil,
  conflict: true_or_false,
}
```
