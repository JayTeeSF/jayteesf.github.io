# Getting started

The illustrated guide is [GETTING_STARTED.html](GETTING_STARTED.html): open it
in a browser. It shows what is required and what is optional (including paying
Microsoft for signing), the pros and cons of each step, and every how-to step.

The commands, for a terminal:

```sh
export PATH="$HOME/dev/hey_windows/bin:$PATH"
colima start --vm-type vz --vz-rosetta        # Apple silicon; Docker for linux/amd64

hey-windows-app init windows                  # 11 questions -> windows/hey-windows-app.json
hey-windows-app check windows                 # build, Wine run, install and uninstall test
hey-windows-app publish windows               # release + your site's apps/ page (signed builds)
hey-windows-app publish windows --allow-unsigned   # a test build before signing is set up

colima stop
```

Required and free: Docker, the Hey checkout, `init`, `check`. Optional: a test
on a real Windows PC (free, recommended), `publish` (free), signing with
Microsoft Artifact Signing ($9.99 a month; setup in the guide, part 4).
