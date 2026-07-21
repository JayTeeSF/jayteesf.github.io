Fast installed-command example:
  "$HOME/dev/hey-lang-bootstrap-plan/bin/heyc" build --backend llvm \
    "$HOME/dev/jayteesf.github.io/generate-packages-index.hey" \
    -o "$HOME/bin/generate-packages-index"

Then run:
  generate-packages-index --workers 1 "$HOME/dev/jayteesf.github.io/packages"

