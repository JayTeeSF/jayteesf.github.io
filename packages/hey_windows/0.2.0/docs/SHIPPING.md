# Shipping a Hey app on Windows

You have a Hey application. You want people to download it from your own site,
double-click one file, and have it install like any other Windows program, with
your company's name on it. This is the whole path, and after the one-time
signing setup it is one command.

```
hey-windows-app.json ──► build ──► sign program ──► installer ──► sign installer
   (in your repo)          │                                          │
                           └── Wine: the window opens ◄── install/uninstall test
                                                                      │
                     your site: apps/<id>/  ◄── publish (fingerprint, page) ◄┘
```

## 1. Describe the app (once)

Put `hey-windows-app.json` and a square PNG icon in a folder of your
repository (My Queue uses `my_queue_2/windows/`):

```json
{
  "schema": "hey-windows-app-v1",
  "id": "my-queue",
  "name": "My Queue",
  "exe": "MyQueue",
  "version": "0.2.0",
  "publisher": "JayTeeSF LLC",
  "description": "One sentence for the download page.",
  "kind": "window",
  "icon": "app-icon.png",
  "window": {"origin": "https://queue.jayteesf.com", "width": 1100, "height": 760,
             "min_width": 480, "min_height": 600, "folder": "MyQueue"},
  "signing": {"endpoint": "eus.codesigning.azure.net", "alias": "ACCOUNT/PROFILE"},
  "site": {"root": "../../jayteesf.github.io", "path": "apps",
           "base_url": "https://www.jayteesf.com"}
}
```

`kind` is `window` (the WebView2 host shows `origin` in its own window) or
`cli` (a Windows program you built elsewhere, named by `"program"`; the
installer puts it on the user's PATH). `publisher` must be exactly the name
your signing certificate will carry. Leave `signing` out until step 3 is done.

## 2. Check, release, publish

```sh
export HEY_WINDOWS=~/dev/hey_windows          # this package
$HEY_WINDOWS/bin/hey-windows-app check   my_queue_2/windows
$HEY_WINDOWS/bin/hey-windows-app release my_queue_2/windows
$HEY_WINDOWS/bin/hey-windows-app publish my_queue_2/windows
```

| command | does | proves |
|---|---|---|
| `check` | builds the program, runs it under Wine, builds the installer, installs and uninstalls it under Wine | the description is valid; the program links Windows' own C runtime (UCRT), not msvcrt.dll; the window opens with the right title and version; the installer puts the program, uninstaller, Start menu entry and Settings > Apps entry in place and removes them again |
| `release` | `check`, plus signing (when set up), `SHA256SUMS.txt` and `release.json` in `dist/windows/VERSION/` | the installer's signer is your publisher |
| `publish` | `release`, then copies the installer, fingerprint, release record and icon to `apps/<id>/windows/VERSION/` on your site, updates `apps/apps-v1.json`, regenerates `apps/index.html` and `apps/<id>/index.html`, commits to `master` through a temporary worktree and pushes | the version is new (releases are immutable, like packages) |

`publish` refuses an unsigned build. For a test build friends can try before
signing is set up, pass `--allow-unsigned`; the download page then tells them
exactly what Windows will say and how to proceed on their own PC.

Everything runs in the `tools/winbox` container (Docker, `linux/amd64`):
llvm-mingw (UCRT) to compile, NSIS to make the installer, Jsign to sign,
osslsigncode to read the signature back, Wine to test. No Windows PC is
needed. The real-Windows proof is a run on a Windows machine or the linux
seat's Windows VM.

## 3. Signing: what you do once (JayTeeSF LLC)

Signing puts "JayTeeSF LLC" where Windows now says "Unknown publisher", gets
the installer past Smart App Control, and lets SmartScreen reputation build
under one name across every release. Microsoft's service is Artifact Signing
(formerly Trusted Signing). Its public-trust certificates are available to
organizations in the United States; Microsoft states processing takes 1 to 20
business days. Source: learn.microsoft.com/azure/artifact-signing/quickstart.

You need, before you start:

- an email address on a domain the LLC owns (for example `you@jayteesf.com`)
  and a second, different address on the same domain; both must receive
  external mail with links;
- the LLC's legal name exactly as registered, its business address, its
  business identifier (for a US LLC, the EIN or state registration number) and
  website (`https://www.jayteesf.com`);
- your government photo ID and a phone, for the individual check of the person
  representing the LLC;
- recent business documents if asked (registration or articles of
  organization; Microsoft accepts documents issued within the last 12 months).

Then, in the Azure portal (portal.azure.com):

1. **Subscription.** Create an Azure account and a pay-as-you-go subscription.
2. **Resource provider.** Subscriptions > your subscription > Resource
   providers > `Microsoft.CodeSigning` > Register.
3. **Account.** Search "Artifact Signing Accounts" > Create. Pick a resource
   group, an account name (3 to 24 letters and digits, starting with a letter),
   region **East US** (endpoint `eus.codesigning.azure.net`), pricing
   **Basic** ($9.99 a month).
4. **Roles for you.** On the account: Access control (IAM) > Add role
   assignment > **Artifact Signing Identity Verifier** to yourself.
5. **Identity validation.** On the account: Identity validations >
   Organization > New identity > **Public**. Fill in the fields above exactly as
   registered; check "Certificate subject preview" says `JayTeeSF LLC`. Create.
   When it says **Action Required**, follow the emailed link for your personal
   ID check (phone camera and Microsoft Authenticator). Wait for **Completed**.
   A failed validation cannot be edited; you start a new one, so get the legal
   name right the first time.
6. **Certificate profile.** On the account: Certificate profiles > Create >
   **Public Trust**. Name it (5 or more letters and digits), choose your
   completed validation under "Verified CN and O". Create.
7. **A signing identity for the build.** Microsoft Entra ID > App
   registrations > New registration (name: `hey-windows-signing`). Under
   Certificates & secrets create a client secret and copy its value. Note the
   app's Application (client) ID and Directory (tenant) ID.
8. **Let it sign.** On the certificate profile (or the account): Access
   control (IAM) > Add role assignment > **Artifact Signing Certificate Profile
   Signer** > the app from step 7.

Then tell the build about it:

- In `hey-windows-app.json`: `"signing": {"endpoint": "eus.codesigning.azure.net", "alias": "ACCOUNT/PROFILE"}`
  (your account name and profile name). Not secret; commit it.
- On the machine that runs `publish`, the three secrets, never in a file in
  the repository:

  ```sh
  export AZURE_TENANT_ID=...      # Directory (tenant) ID
  export AZURE_CLIENT_ID=...      # Application (client) ID
  export AZURE_CLIENT_SECRET=...  # the client secret value
  ```

From then on `release` and `publish` sign the program, the uninstaller and the
installer with your certificate and a Microsoft timestamp, and check the
installer's signer is your publisher before publishing.

## 4. What friends and family see

| build | Windows says on first run | they do |
|---|---|---|
| unsigned test build | "Windows protected your PC", publisher "Unknown publisher" | More info > Run anyway (on their own PC only) |
| signed, new | possibly a SmartScreen notice, now naming "JayTeeSF LLC", until enough people have run it | More info > Run anyway |
| signed, with reputation | nothing; the installer opens | install |

On a work computer the employer's IT rules decide. The page says so, and gives
IT what it needs: the publisher, the download address and the SHA-256
fingerprint.
