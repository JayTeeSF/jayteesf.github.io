# Getting started

Set the Hey checkout when it is not in the default location:

```sh
export HEY_ROOT="$HOME/dev/hey-lang-bootstrap-plan"
```

Run the example from the package root:

```sh
"$HEY_ROOT/bin/heyc" docs/examples/basic.hey --run
```

```hey
import '../../src/main.hey'

program
  let reference = HeyConfig.secret_reference('env', 'DATABASE_URL')
  says reference.key
  says HeyConfig.version()
end
```
