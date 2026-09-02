# Getting started

`hey_stripe` uses `stdlib:Http` for transport and reads the secret key from the
application environment (never hard-coded, never logged).

```hey
import './main.hey'

program
  says HeyStripeInfo.version()
  says HeyStripeInfo.capabilities().checkout_sessions
end
```

Webhook handlers must verify the Stripe signature over the RAW request body
before trusting an event; see `webhooks.hey`.
