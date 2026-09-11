# Getting started

## 1. Configure a provider

```hey
import 'vendor/hey_oauth/0.1.0/main.hey'

let cfg = OauthProviders.config('google', {
  client_id:     Env.get('MY_GOOGLE_CLIENT_ID'),
  client_secret: Env.get('MY_GOOGLE_CLIENT_SECRET'),
  redirect_uri:  'https://example.com/auth/google/callback',
})
```

`OauthProviders.problems(cfg)` lists anything missing. Check it at boot, not at
login.

## 2. Start a login

```hey
let started = OauthFlow.start(gen, {}, cfg)
# redirect the browser to started.value.authorize_url
```

Retain `state`, `nonce` and `code_verifier` **server-side** — an HttpOnly cookie
the browser cannot read, or a server session. They are not secrets the user
should ever see.

Your `gen` must return **bytes**:

```hey
fn gen(gctx, n)
  let r = Crypto.random_bytes(n)   # returns Result.ok(bytes), NOT bytes
  if get(r, 'ok') == false
    return nil                     # fail the login; never fall back
  end
  return Result.value(r)
end
```

That unwrap is not optional, and forgetting it fails deep inside base64 with a
message that names neither the cause nor the caller.

## 3. Complete it

```hey
let result = OauthFlow.complete({
  exchange: my_exchange, exchange_ctx: {},
  verify:   my_verify,   verify_ctx:   vctx,
}, cfg, callback_params, session, now)

if get(result, 'ok') == false
  # get(result, 'stage') is callback | exchange | verify | policy
end
let who = get(result, 'identity')
```

## 4. Resolve an account

Key the account on `(provider, subject)`. Use the email **only** when
`OauthClaims.linkable_by_email?` says so — it requires `email_verified`.

## Redirect URI

Must match the provider's console **byte for byte**. A trailing slash on one
side is a mismatch error from the provider that never reaches your logs.
