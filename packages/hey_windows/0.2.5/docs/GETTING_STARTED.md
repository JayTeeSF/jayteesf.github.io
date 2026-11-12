<!-- docs/GETTING_STARTED.md is the source of docs/GETTING_STARTED.html: edit this file, then run
     bin/docs-html. Prose, lists, tables and code are Markdown; the diagrams, cards and callouts
     are HTML blocks, copied into the page as written. -->

# Ship your Hey app on Windows

<p class="lede">You built a Hey app. A friend has a Windows PC. By the end of this page they open your website, click one download, and your app installs like any other Windows program: Start menu entry, uninstaller in Settings, and your company's name on it.</p>

No Windows PC is needed to build or test it. Everything runs on your Mac in a container. This page is for `hey_windows` 0.2.5.

<figure>
<svg viewBox="0 0 320 400" role="img" aria-labelledby="map-t map-d">
<title id="map-t">The whole path in five commands</title>
<desc id="map-d">init writes the description once. check proves it on your Mac. Signing setup happens once. release makes the fingerprinted installer. publish puts it on your site.</desc>
<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="f-arrow"/></marker></defs>
<rect x="10" y="8" width="300" height="56" rx="10" class="f-box-acc"/>
<text x="24" y="31" class="f-tb">1. init  (once)</text>
<text x="24" y="51" class="f-ts">11 questions write hey-windows-app.json</text>
<line x1="160" y1="64" x2="160" y2="84" class="f-line" marker-end="url(#ar)"/>
<rect x="10" y="86" width="300" height="56" rx="10" class="f-box"/>
<text x="24" y="109" class="f-tb">2. check  (any time, about 25 s)</text>
<text x="24" y="129" class="f-ts">build, run under Wine, install, uninstall</text>
<line x1="160" y1="142" x2="160" y2="162" class="f-line" marker-end="url(#ar)"/>
<rect x="10" y="164" width="300" height="56" rx="10" class="f-box-warn"/>
<text x="24" y="187" class="f-tb">3. signing setup  (once, optional)</text>
<text x="24" y="207" class="f-ts">Microsoft checks your LLC; 1 to 20 business days</text>
<line x1="160" y1="220" x2="160" y2="240" class="f-line" marker-end="url(#ar)"/>
<rect x="10" y="242" width="300" height="56" rx="10" class="f-box"/>
<text x="24" y="265" class="f-tb">4. release  (each version)</text>
<text x="24" y="285" class="f-ts">signed installer + SHA-256 fingerprint</text>
<line x1="160" y1="298" x2="160" y2="318" class="f-line" marker-end="url(#ar)"/>
<rect x="10" y="320" width="300" height="70" rx="10" class="f-box-ok"/>
<text x="24" y="343" class="f-tb">5. publish  (each version)</text>
<text x="24" y="363" class="f-ts">your site: apps/&lt;id>/ download page,</text>
<text x="24" y="380" class="f-ts">committed and pushed for you</text>
</svg>
<figcaption>Steps 1 and 3 happen once. Steps 4 and 5 are one command together, because <code>publish</code> runs <code>release</code> first.</figcaption>
</figure>

## At a glance: what's required, what's optional

<figure>
<svg viewBox="0 0 320 560" role="img" aria-labelledby="req-t req-d">
<title id="req-t">Required steps and optional steps</title>
<desc id="req-d">Required and free: a Mac with Docker, the Hey checkout, init, and check. Optional: a test on a real Windows PC (free, recommended), publishing to your own site (free), signing with Microsoft Artifact Signing (9.99 dollars a month), and the Microsoft Store (free registration, proposed, not built yet).</desc>
<text x="10" y="20" class="f-tb">REQUIRED, all free</text>
<rect x="10" y="30" width="300" height="44" rx="9" class="f-box-acc"/>
<text x="22" y="57" class="f-t">Mac + Docker (Colima) + Hey checkout</text>
<rect x="10" y="82" width="300" height="44" rx="9" class="f-box-acc"/>
<text x="22" y="109" class="f-t">init: answer 11 questions, once</text>
<rect x="10" y="134" width="300" height="44" rx="9" class="f-box-acc"/>
<text x="22" y="161" class="f-t">check / release: builds the installer</text>
<text x="10" y="210" class="f-ts">With just these you have a working installer file</text>
<text x="10" y="226" class="f-ts">you can hand to anyone.</text>
<text x="10" y="264" class="f-tb">OPTIONAL</text>
<rect x="10" y="274" width="300" height="56" rx="9" class="f-box"/>
<text x="22" y="297" class="f-t">Test on a real Windows PC</text>
<text x="22" y="318" class="f-ok">free · recommended before sharing</text>
<rect x="10" y="338" width="300" height="56" rx="9" class="f-box"/>
<text x="22" y="361" class="f-t">publish to your own site</text>
<text x="22" y="382" class="f-ok">free · a download page with a fingerprint</text>
<rect x="10" y="402" width="300" height="56" rx="9" class="f-box-warn"/>
<text x="22" y="425" class="f-t">Sign with Microsoft Artifact Signing</text>
<text x="22" y="446" class="f-bad">$9.99 a month · your name, not "Unknown"</text>
<rect x="10" y="466" width="300" height="56" rx="9" class="f-box" stroke-dasharray="5 4"/>
<text x="22" y="489" class="f-t">Microsoft Store</text>
<text x="22" y="510" class="f-ts">free registration · proposed, not built yet</text>
<text x="10" y="548" class="f-ts">Dashed = not available in hey_windows today.</text>
</svg>
</figure>

### Pros and cons of each step

<div class="cards">
<section class="card req"><h4>Mac + Docker + Hey <span class="chip now">required · free</span></h4>
<p class="pro"><b>Pro:</b> no Windows PC needed to build or test.</p>
<p class="con"><b>Con:</b> the first container build takes about ten minutes, and Colima uses memory while it runs, so stop it after.</p>
<p class="how"><a href="#1-what-you-need-on-your-mac">How-to: part 1</a></p></section>
<section class="card req"><h4>init <span class="chip now">required · free · once</span></h4>
<p class="pro"><b>Pro:</b> every answer is checked with the build's own rules. A wrong answer is asked again, not lost.</p>
<p class="con"><b>Con:</b> names with accents, like "Café", are refused, because the same text must be safe in the program, the installer and the web page.</p>
<p class="how"><a href="#2-describe-your-app-answer-11-questions">How-to: part 2</a></p></section>
<section class="card req"><h4>check <span class="chip now">required · free</span></h4>
<p class="pro"><b>Pro:</b> proves build, window, installer and uninstall in about 25 seconds.</p>
<p class="con"><b>Con:</b> Wine isn't Windows. It has no WebView2, so your page itself is only seen on a real PC.</p>
<p class="how"><a href="#3-prove-it-works-without-a-windows-pc">How-to: part 3</a></p></section>
<section class="card"><h4>Test on a real PC <span class="chip idea">optional · free · recommended</span></h4>
<p class="pro"><b>Pro:</b> the only proof that your web app shows in the window and that Windows' warnings look as expected.</p>
<p class="con"><b>Con:</b> needs someone's Windows PC. A work PC may block unsigned programs, and that's the employer's call.</p>
<p class="how"><a href="#6-what-your-friends-will-see-and-how-to-test-on-a-work-pc">How-to: part 6</a></p></section>
<section class="card paid"><h4>Signing <span class="chip later">optional · $9.99 a month</span></h4>
<p class="pro"><b>Pro:</b> "JayTeeSF LLC" instead of "Unknown publisher". Warnings fade as installs add up, and work PCs are far more likely to allow it.</p>
<p class="con"><b>Con:</b> a monthly cost, 1 to 20 business days of identity checks, and a mistyped legal name means starting the check again.</p>
<p class="how"><a href="#4-put-your-company-s-name-on-it-signing">How-to: part 4</a></p></section>
<section class="card"><h4>publish to your site <span class="chip idea">optional · free</span></h4>
<p class="pro"><b>Pro:</b> one link to share, a page with the fingerprint and plain instructions, and versions that never change once published.</p>
<p class="con"><b>Con:</b> an unsigned build needs <code>--allow-unsigned</code>, and friends see the warning.</p>
<p class="how"><a href="#5-put-it-on-your-site">How-to: part 5</a></p></section>
<section class="card proposed"><h4>Microsoft Store <span class="chip idea">optional · free registration · proposed</span></h4>
<p class="pro"><b>Pro:</b> the Store signs MSIX packages for you, with normal Store installs and updates.</p>
<p class="con"><b>Con:</b> hey_windows doesn't make MSIX packages yet, and the Store reviews every version.</p>
<p class="how">How-to: not yet</p></section>
</div>

<nav class="toc" aria-label="Contents">
<strong>On this page</strong>
<ol>
<li><a href="#1-what-you-need-on-your-mac">What you need on your Mac</a></li>
<li><a href="#2-describe-your-app-answer-11-questions">Describe your app: answer 11 questions</a></li>
<li><a href="#3-prove-it-works-without-a-windows-pc">Prove it works without a Windows PC</a></li>
<li><a href="#4-put-your-company-s-name-on-it-signing">Put your company's name on it (signing)</a></li>
<li><a href="#5-put-it-on-your-site">Put it on your site</a></li>
<li><a href="#6-what-your-friends-will-see-and-how-to-test-on-a-work-pc">What your friends will see, and how to test on a work PC</a></li>
<li><a href="#7-when-a-command-refuses">When a command refuses</a></li>
<li><a href="#8-reference">Reference: the description file and every option</a></li>
</ol>
</nav>

## 1. What you need on your Mac

| you need | why | check it |
|---|---|---|
| the Hey checkout | the tool is a Hey program | `ls ~/dev/hey-lang-bootstrap-plan/bin/heyc` |
| this package | the commands live in its `bin/` | `ls ~/dev/hey_windows/bin/hey-windows-app` |
| Docker that runs `linux/amd64` | the Windows compiler, installer maker, signer and Wine live in one container | `docker info` |
| your app folder under your home folder | Docker only shares your home folder | e.g. `~/dev/my_queue_2/windows` |
| your website's git checkout | only for `publish` | e.g. `~/dev/jayteesf.github.io` |

<div class="callout do"><span class="tag">Do this</span>

On an Apple-silicon Mac, start a Colima engine with Rosetta, and stop it when you're done:

```sh
colima start --vm-type vz --vz-rosetta
export PATH="$HOME/dev/hey_windows/bin:$PATH"
# ... work ...
colima stop
```

The first command builds the container image once. That takes about ten minutes under emulation. After that, a check takes about 25 seconds.

</div>

## 2. Describe your app: answer 11 questions

Your app's Windows life is one small file, `hey-windows-app.json`, kept in your repository. You don't write it by hand. Run:

```sh
hey-windows-app init windows
```

It asks one question at a time, shows a default in brackets, and says why it's asking. Press Enter to keep the default.

<pre class="figure" aria-label="The questionnaire in a terminal"><code><span class="dim">$ hey-windows-app init windows</span>
Describe your Windows app. Press Enter to keep the [default].

<span class="q">1. What kind of app is it? window or cli</span>
  window: your web app in its own Windows window (WebView2) ...
  [window] &gt;
<span class="q">2. What is it called?</span>
  &gt; My Queue
<span class="q">3. Short id for web addresses</span>
  [my-queue] &gt;                      <span class="dim">&lt;- worked out from the name</span>
<span class="q">5. Version</span>
  [0.1.0] &gt; 1.2
<span class="dim">  ... questions 6 to 11 ...</span>

Not written: version is MAJOR.MINOR.PATCH, digits only
The questions run again with your answers as defaults.
<span class="dim">  ... you fix just that one ...</span>
<span class="ok">hey_windows_app_written=.../windows/hey-windows-app.json</span>
Next: hey-windows-app check windows</code></pre>
<p class="figcap">A wrong answer isn't lost work. The same rules the build uses check every answer, and the questions come back with your answers filled in.</p>

<div class="callout"><span class="tag">There are no dumb questions</span>

**Window or CLI, which am I?** If people use your app in a browser today, it's a *window*: the Windows program is a frame that shows your web address in Microsoft's built-in browser engine, WebView2. If it's a command people type in a terminal and you already built a Windows `.exe` of it, it's a *cli*: the installer puts it on their PATH (the list of folders Windows searches for commands).

**What goes in "Publisher"?** Your company's legal name, exactly as Microsoft will verify it, for example `JayTeeSF LLC`. Windows shows this name in the install prompt once you sign.

</div>

Prefer flags in a script? Give `--name` and nothing is asked:

```sh
hey-windows-app init windows --name "My Queue" --publisher "JayTeeSF LLC" \
  --origin https://queue.jayteesf.com --icon ~/Pictures/queue.png \
  --site-root ../../jayteesf.github.io --base-url https://www.jayteesf.com
```

## 3. Prove it works without a Windows PC

```sh
hey-windows-app check windows
```

What would you predict is the hardest part to get right without Windows? It's the installer. It has to leave a program, an uninstaller, a Start menu entry and a Settings entry, and then remove every one of them again. So `check` tests exactly that, inside Wine, the Windows compatibility layer for Linux.

<figure>
<svg viewBox="0 0 320 470" role="img" aria-labelledby="chk-t chk-d">
<title id="chk-t">What check does inside the container</title>
<desc id="chk-d">Four stages in one container: build the program, run it under Wine and read its receipt, make the installer, install and uninstall it. Each stage must pass before the next.</desc>
<defs><marker id="ar2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="f-arrow"/></marker></defs>
<rect x="4" y="4" width="312" height="462" rx="12" fill="none" stroke-dasharray="5 4" class="f-line"/>
<text x="18" y="26" class="f-ts">one container, started and removed by the command</text>
<rect x="18" y="38" width="284" height="84" rx="9" class="f-box"/>
<text x="30" y="60" class="f-tb">Build</text>
<text x="30" y="80" class="f-ts">compile for Windows (llvm-mingw)</text>
<text x="30" y="97" class="f-ts">icon, version, publisher into the .exe</text>
<text x="30" y="114" class="f-ok">✓ links Windows' own C runtime (UCRT)</text>
<line x1="160" y1="122" x2="160" y2="138" class="f-line" marker-end="url(#ar2)"/>
<rect x="18" y="140" width="284" height="84" rx="9" class="f-box"/>
<text x="30" y="162" class="f-tb">Run under Wine</text>
<text x="30" y="182" class="f-ts">opens the window, takes a screenshot</text>
<text x="30" y="199" class="f-ts">reads the program's self-test receipt</text>
<text x="30" y="216" class="f-ok">✓ title, version, window size match</text>
<line x1="160" y1="224" x2="160" y2="240" class="f-line" marker-end="url(#ar2)"/>
<rect x="18" y="242" width="284" height="84" rx="9" class="f-box"/>
<text x="30" y="264" class="f-tb">Make the installer (NSIS)</text>
<text x="30" y="284" class="f-ts">one Setup .exe, per user, no admin prompt</text>
<text x="30" y="301" class="f-ts">signs program, uninstaller, installer</text>
<text x="30" y="318" class="f-ts">(when signing is set up)</text>
<line x1="160" y1="326" x2="160" y2="342" class="f-line" marker-end="url(#ar2)"/>
<rect x="18" y="344" width="284" height="110" rx="9" class="f-box-ok"/>
<text x="30" y="366" class="f-tb">Install, then uninstall, silently</text>
<text x="30" y="388" class="f-ok">✓ program and uninstaller in place</text>
<text x="30" y="406" class="f-ok">✓ Start menu and Settings &gt; Apps entry</text>
<text x="30" y="424" class="f-ok">✓ all of it gone after uninstall</text>
<text x="30" y="442" class="f-ts">any ✗ stops the command</text>
</svg>
</figure>

<div class="callout"><span class="tag">What you'll see</span>

<pre><code>hey_windows_step=build
hey_windows_import=api-ms-win-crt-runtime-l1-1-0.dll
hey_windows_exe=.../build/windows/0.2.1/stage/MyQueue.exe
hey_windows_step=Wine run
hey_windows_screenshot=.../build/windows/0.2.1/wine-window.png
hey_windows_wine_run=ok
hey_windows_step=installer
hey_windows_unsigned=... (no signing configuration; see docs/GETTING_STARTED.html, part 4)
hey_windows_step=install and uninstall test
hey_windows_install_test_installed_program=yes
  ...
<span class="ok">hey_windows_app_check=ok</span></code></pre>

Open `wine-window.png`. Under Wine the window says WebView2 isn't installed. That's expected: Wine doesn't have Microsoft's browser engine, and real Windows 10 and 11 PCs do.

</div>

<div class="callout watch"><span class="tag">Watch out</span>

Wine is a very good imitation, not Windows. Before you send a link to people you care about, run the installer once on a real Windows PC. [Part 6](#6-what-your-friends-will-see-and-how-to-test-on-a-work-pc) shows how.

</div>

## 4. Put your company's name on it (signing)

Without a signature, Windows says **"Unknown publisher"** and puts a warning in front of your installer. Signing replaces that with **JayTeeSF LLC**. Think of it as a passport for your program: Microsoft checks who you are once, then vouches for every file you sign.

<figure>
<svg viewBox="0 0 320 330" role="img" aria-labelledby="sig-t sig-d">
<title id="sig-t">How a signature gets your name onto Windows' screen</title>
<desc id="sig-d">Microsoft verifies JayTeeSF LLC once. It then issues short-lived certificates in that name. The release command asks for a signature on each file. Windows reads the name from the file.</desc>
<defs><marker id="ar3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="f-arrow"/></marker></defs>
<rect x="10" y="8" width="300" height="62" rx="10" class="f-box-warn"/>
<text x="22" y="31" class="f-tb">Once: Microsoft checks the LLC</text>
<text x="22" y="51" class="f-ts">legal name, EIN, your photo ID</text>
<line x1="160" y1="70" x2="160" y2="90" class="f-line" marker-end="url(#ar3)"/>
<rect x="10" y="92" width="300" height="62" rx="10" class="f-box-acc"/>
<text x="22" y="115" class="f-tb">Artifact Signing account (Azure)</text>
<text x="22" y="135" class="f-ts">holds the certificate; you never see a key</text>
<line x1="160" y1="154" x2="160" y2="174" class="f-line" marker-end="url(#ar3)"/>
<rect x="10" y="176" width="300" height="62" rx="10" class="f-box"/>
<text x="22" y="199" class="f-tb">release / publish, each version</text>
<text x="22" y="219" class="f-ts">signs program, uninstaller and installer</text>
<line x1="160" y1="238" x2="160" y2="258" class="f-line" marker-end="url(#ar3)"/>
<rect x="10" y="260" width="300" height="62" rx="10" class="f-box-ok"/>
<text x="22" y="283" class="f-tb">Windows shows: Publisher</text>
<text x="22" y="303" class="f-ok">JayTeeSF LLC  (not "Unknown")</text>
</svg>
</figure>

### Do you have to pay? No.

<div class="wrap">

| way to ship | cost | what Windows shows | status in hey_windows |
|---|---|---|---|
| unsigned, from your site | free | "Unknown publisher" warnings, first from Edge while downloading; friends click *Keep anyway*. Many work PCs block it. | <span class="chip now">works today</span> `publish --allow-unsigned` |
| signed with Microsoft Artifact Signing, from your site | $9.99 a month (Basic) | "JayTeeSF LLC". Warnings fade as more people install it. | <span class="chip now">works today</span>, after the setup below |
| Microsoft Store | free registration (individuals since September 2025, companies since May 2026) | a normal Store install; the Store signs MSIX packages for you | <span class="chip idea">proposed</span> needs an MSIX package, which hey_windows doesn't make yet |

</div>

Nobody pays you for a download from your own site, and a free app earns nothing in the Store either. Signing buys trust, not income. You can stop paying at any time: files you already signed keep working, because each signature carries a timestamp from the day it was made.

<p class="sources">Sources: Microsoft Learn, <a href="https://learn.microsoft.com/azure/artifact-signing/quickstart">Artifact Signing quickstart</a>; Windows Developer Blog, <a href="https://blogs.windows.com/windowsdeveloper/2025/09/10/free-developer-registration-for-individual-developers-on-microsoft-store/">free registration for individuals</a> and <a href="https://blogs.windows.com/windowsdeveloper/2026/05/07/publish-to-microsoft-store-as-a-company-now-with-free-registration-and-faster-onboarding/">for companies</a>; Microsoft Learn, <a href="https://learn.microsoft.com/windows/apps/package-and-deploy/code-signing-options">code signing options</a>.</p>

### Set up signing for JayTeeSF LLC (once)

**Have these ready.** It saves a second validation, because a failed one can't be edited:

- two email addresses on a domain the LLC owns, for example `you@jayteesf.com` and a second one;
- the LLC's legal name exactly as registered, its business address, its EIN or state registration number, and `https://www.jayteesf.com`;
- your government photo ID and your phone;
- the articles of organization, in case Microsoft asks for a recent document.

Then, in the Azure portal at [portal.azure.com](https://portal.azure.com):

1. **Subscription.** Create an Azure account and a pay-as-you-go subscription.
2. **Turn on the service.** Subscriptions > your subscription > Resource providers > `Microsoft.CodeSigning` > Register.
3. **Account.** Search "Artifact Signing Accounts" > Create. Region **East US**, pricing **Basic**. Name: 3 to 24 letters and digits, starting with a letter. Write the name down.
4. **Let yourself verify.** On the account: Access control (IAM) > Add role assignment > **Artifact Signing Identity Verifier** > yourself.
5. **Prove the LLC.** On the account: Identity validations > Organization > New identity > **Public**. Fill in the details. Check that the certificate preview says `JayTeeSF LLC`. When it says *Action Required*, follow the emailed link to scan your ID with your phone. Wait for **Completed**; Microsoft says 1 to 20 business days.
6. **Certificate profile.** On the account: Certificate profiles > Create > **Public Trust**. Name it with 5 or more letters and digits, and pick your completed validation. Write the name down.
7. **A signing login for the build.** Microsoft Entra ID > App registrations > New registration, named `hey-windows-signing`. Under Certificates & secrets, create a client secret and copy its value now; Azure shows it once. Note the Application (client) ID and the Directory (tenant) ID.
8. **Let it sign.** On the certificate profile: Access control (IAM) > Add role assignment > **Artifact Signing Certificate Profile Signer** > `hey-windows-signing`.

<div class="callout do"><span class="tag">Do this: tell the build</span>

Run `init` again with `--force` and answer question 10, or add this to `hey-windows-app.json`. It isn't secret, so commit it:

```json
"signing": {"endpoint": "eus.codesigning.azure.net", "alias": "ACCOUNT/PROFILE"}
```

On the Mac that runs `publish`, set the three secrets in your shell. Never put them in a file in a repository:

```sh
export AZURE_TENANT_ID=...      # Directory (tenant) ID
export AZURE_CLIENT_ID=...      # Application (client) ID
export AZURE_CLIENT_SECRET=...  # the client secret value
```

From then on, every release is signed, timestamped, and checked: `release` refuses an installer whose signer isn't your publisher.

</div>

## 5. Put it on your site

```sh
hey-windows-app publish windows                    # signed builds only
hey-windows-app publish windows --allow-unsigned   # a test build before signing is set up
```

<figure>
<svg viewBox="0 0 320 300" role="img" aria-labelledby="pub-t pub-d">
<title id="pub-t">Where publish puts each file</title>
<desc id="pub-d">The release folder in your app holds the installer, the fingerprint file, the release record and the icon. publish copies them to apps/id/windows/version on your site, updates the apps index and both download pages, then commits to master and pushes.</desc>
<defs><marker id="ar4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="f-arrow"/></marker></defs>
<rect x="10" y="8" width="300" height="104" rx="10" class="f-box"/>
<text x="22" y="30" class="f-tb">your app: dist/windows/0.2.1/</text>
<text x="22" y="52" class="f-tm">MyQueue-Setup-0.2.1.exe</text>
<text x="22" y="70" class="f-tm">SHA256SUMS.txt</text>
<text x="22" y="88" class="f-tm">release.json</text>
<text x="22" y="106" class="f-tm">icon.png</text>
<line x1="160" y1="112" x2="160" y2="134" class="f-line" marker-end="url(#ar4)"/>
<text x="170" y="128" class="f-ts">copied by publish</text>
<rect x="10" y="136" width="300" height="156" rx="10" class="f-box-ok"/>
<text x="22" y="158" class="f-tb">your site (master branch)</text>
<text x="22" y="180" class="f-tm">apps/index.html</text>
<text x="22" y="198" class="f-tm">apps/apps-v1.json</text>
<text x="22" y="216" class="f-tm">apps/my-queue/index.html</text>
<text x="22" y="234" class="f-tm">apps/my-queue/windows/0.2.1/</text>
<text x="34" y="252" class="f-ts">the four files above</text>
<text x="22" y="276" class="f-ok">committed and pushed for you</text>
</svg>
</figure>

Your own checkout of the site is never switched or touched. `publish` works in a temporary copy of `master` and removes it afterwards.

### Show people what they'll see

The download page can walk a visitor through every screen: the warning, the installer, the finished window, and how to uninstall. [My Queue's page](https://www.jayteesf.com/apps/my-queue/) shows real Windows 11 screenshots this way. Put PNG screenshots in a `screens` folder beside the description and list them, each with a caption that says what the person sees and what to do:

```json
"screens": [
  {"file": "screens/02-edge-hold.png",
   "caption": "Edge may hold the download: \"Make sure you trust ...\". Click the arrow next to Delete, then Keep anyway."},
  {"file": "screens/12d-uninstalled.png",
   "caption": "After you choose Uninstall, it says Uninstallation Complete.",
   "section": "uninstall"}
]
```

Screens without a `section` appear under "What you will see, step by step". Screens with `"section": "uninstall"` appear in the page's Questions, under "How do I uninstall it?". Then update the page without building or releasing anything:

```sh
hey-windows-app pages windows
```

<div class="callout watch"><span class="tag">Watch out: screenshots are public</span>

Look at every picture before you publish it. Crop out user names, email addresses, other windows and anything else private. Take them at 100% display scale on a clean desktop.

</div>

<div class="callout watch"><span class="tag">Watch out: versions never change</span>

Once 0.2.1 is on the site, it stays exactly as published, like a package version. To fix anything, bump the version and publish again. `publish` refuses a version that's already there.

</div>

## 6. What your friends will see, and how to test on a work PC

<div class="wrap">

| your build | Windows says | they do |
|---|---|---|
| unsigned test build | Edge holds the download: "Make sure you trust MyQueue-Setup-0.2.1.exe before you open it", Publisher: Unknown (seen on Windows 11, November 2026). Some PCs then also show "Windows protected your PC". | the arrow next to *Delete*, then *Keep anyway*; if the blue screen follows, *More info*, then *Run anyway*. Their own PC only. |
| signed, brand new | maybe the same warnings, now naming JayTeeSF LLC | *Keep anyway*, or *More info* then *Run anyway* |
| signed, many installs later | nothing: the installer opens | Install |

</div>

### Testing on a friend's work PC

1. **Ask first.** A work PC belongs to the employer. Their IT rules decide what runs, and getting around them can cost your friend their job. If the PC blocks the installer, stop there.
2. **Download from the page,** in Edge or Chrome: `https://www.jayteesf.com/apps/my-queue/`.
3. **Check the fingerprint.** In PowerShell, compare with the SHA-256 on the page:

   ```powershell
   Get-FileHash $HOME\Downloads\MyQueue-Setup-0.2.1.exe
   ```

   PowerShell prints it in capitals; the page uses lowercase. Same letters, same file.
4. **Run it.** No administrator prompt should appear, because it installs for that user only.
5. **Look for** the Start menu entry, the window, and Settings > Apps > Installed apps. Then uninstall it there.

<div class="callout"><span class="tag">If IT asks</span>

Give them the publisher (`JayTeeSF LLC`), the download address and the SHA-256 fingerprint from the page. That's what they need to allow one specific file.

</div>

## 7. When a command refuses

Every refusal is one sentence that names the fix. The common ones:

<div class="wrap">

| it says | do this |
|---|---|
| no hey-windows-app.json in … | run `hey-windows-app init` in that folder |
| the app folder must be under your home folder | move the app; Docker only shares your home folder |
| … imports msvcrt.dll | rebuild the CLI program against the Universal C Runtime |
| the window is 1100x760, the description says … | the program and the description disagree; run `check` again after a clean build |
| install/uninstall test failed | read the `=no` lines above it; each names what was missing |
| refusing to publish an unsigned build | set up [signing](#4-put-your-company-s-name-on-it-signing), or pass `--allow-unsigned` for a test build |
| … is already on the site; releases are immutable | bump `version` in the description |
| docker: command not found, or cannot connect | start the engine: `colima start` |

</div>

## 8. Reference

### The commands

<div class="wrap">

| command | does |
|---|---|
| `init [DIR] [--force]` | the questionnaire; with `--name` and other flags, nothing is asked |
| `check [DIR]` | build, Wine run, installer, install and uninstall test |
| `build [DIR]` | only the program, in `build/windows/VERSION/stage/` |
| `installer [DIR]` | build, then the installer |
| `release [DIR]` | check, then `dist/windows/VERSION/` with the fingerprint and release record |
| `publish [DIR] [--allow-unsigned] [--no-push]` | release, then your site |
| `sign FILE [DIR]` | sign one file inside the app folder |
| `pages [DIR] [--no-push]` | only the download page: description and screenshots; no build, no new release |

</div>

### hey-windows-app.json

```text
{
  "schema": "hey-windows-app-v1",
  "id": "my-queue",                       // download address: apps/my-queue/
  "name": "My Queue",                     // window title, Start menu, page
  "exe": "MyQueue",                       // MyQueue.exe
  "version": "0.2.1",                     // MAJOR.MINOR.PATCH, new for every release
  "publisher": "JayTeeSF LLC",            // exactly the name being signed
  "description": "One sentence for the download page.",
  "kind": "window",                       // or "cli" with "program": "path/to/app.exe"
  "icon": "app-icon.png",                 // square PNG beside this file
  "window": {"origin": "https://queue.jayteesf.com", "width": 1100, "height": 760,
             "min_width": 480, "min_height": 600, "folder": "MyQueue"},
  "signing": {"endpoint": "eus.codesigning.azure.net", "alias": "ACCOUNT/PROFILE"},
  "site": {"root": "../../jayteesf.github.io", "path": "apps",
           "base_url": "https://www.jayteesf.com"},
  "screens": [{"file": "screens/02-edge-hold.png", "caption": "What they see, what to do"}]
}
```

The comments are for this page only; JSON files can't contain them. Names and descriptions may not contain quotes, dollar signs, backslashes or angle brackets, so the same text is safe in the program, the installer and the web page. Screenshot captions only appear on the web page, so they may contain quotes.

### Environment

<div class="wrap">

| variable | meaning |
|---|---|
| `HEY_ROOT` | the Hey checkout (default `~/dev/hey-lang-bootstrap-plan`) |
| `HEY_WINDOWS_DOCKER_CONTEXT` | a Docker context other than the current one |
| `HEY_WINDOWS_IMAGE` | the container image tag (default `hey-winbox:0.2`) |
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | the signing login; passed into the container by name, never written down |

</div>

### How it's built

The commands are one Hey program, `tools/hey_windows_app.hey`. `bin/hey-windows-app` only starts it. The program runs each tool in the container directly, one at a time, with no shell scripts in between. The container recipe is `tools/winbox/Dockerfile`: llvm-mingw for the Universal C Runtime, NSIS for the installer, Jsign for signing, osslsigncode to read signatures back, and Wine with a virtual display for the tests.

This page is generated: its source is `docs/GETTING_STARTED.md`, rendered by Hey's Markdown module (`Markdown.to_html_with`, vendored as `tools/markdown.hey` until Hey's next release ships it).
