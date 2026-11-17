# Getting started

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
cd "$HOME/dev/hey_jose"
bin/build-native            # generates FFI glue and links libcrypto (OpenSSL)
```

```hey
import './main.hey'

program
  let opened = Jose.open({})
  let v = opened.value
  let policy = {algorithms: ['RS256', 'ES256'], issuer: 'https://issuer.example/', audience: 'mmeoww-api', require_exp: true, clock_skew: 60}
  let result = Jose.verify(v, token, jwks, policy, now_epoch_seconds)
  # result.ok == true -> result.value holds the trusted claims
  let done = Jose.close(v)
end
```

`jwks` is a parsed JWKS document (`{keys: [...]}`); keys are selected by `kid`
and must be compatible with the token's algorithm.
