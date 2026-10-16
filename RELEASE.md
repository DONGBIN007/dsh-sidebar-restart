# Releasing

Everything below is verified against the actual rules in
[`awesome-dsh-plugin/contributing.md`](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)
rather than guessed — the first draft of this file had three things wrong, and they
are the kind that get a submission bounced.

`tools/prepublish-check.mjs` runs on `npm publish` and refuses to ship a package
that still carries a placeholder, is `private`, or lacks the `dsh.bundle` manifest.
Run it any time with `node tools/prepublish-check.mjs`.

## Order of operations

The catalog is built from **GitHub repositories**, not from npm, and it requires the
repository to be **at least one day old**. So:

1. Create the repository and push, today.
2. Add the **`dsh-plugin`** topic to it.
3. Wait a day — CI checks the age and will fail a repo created minutes ago.
4. Open the marketplace pull request.

Step 3 is not a judgement call; it is an automated check, and resubmitting later is
free.

## 1. The repository

Public repo **`DONGBIN007/dsh-sidebar-restart`**, with the **`dsh-plugin`** topic
(required — CI checks for it).

The three manifest facts the listing is built on, all already true here:

- `package.json` declares **`dsh.bundle`**. This is the part that makes a plugin
  installable with `dsh plugin add`, and *the single most common reason a submission
  is rejected is declaring only `dsh.client`*. This package declares both.
- `cordis.patch.yml` sits **at the repository root**, next to `package.json`.
- The repo contains real, working code — not a placeholder, and not a README-only
  repo.

Verified locally, from the packed tarball, through the real CLI:

```sh
dsh plugin --profile <scratch> add ./dsh-sidebar-restart-0.1.0.tgz
# → resolved 1, added 1
# and the profile then lists it:
#   "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "dsh-sidebar-restart"] } }
```

## 2. The marketplace pull request

One file, `data/plugins/<owner>__<repo>.yml` — **not** an edit to `README.md`; both
READMEs are generated from `data/` and editing them by hand is how entries land on a
neighbour as the list grows.

The payload is ready in [`submission/DONGBIN007__dsh-sidebar-restart.yml`](submission/DONGBIN007__dsh-sidebar-restart.yml):

```yaml
url: https://github.com/DONGBIN007/dsh-sidebar-restart
name: DONGBIN007/dsh-sidebar-restart
category: ui
description:
  en: ...
  zh: ...
```

Field notes, all of them load-bearing:

- `url` must match the repository **exactly**.
- `name` is the link text shown in the list — `owner/repo`.
- `category` takes a **slug**, not a display name: the valid values are
  `agi ui usage theme model identity session memory tools wsl browser vision voice
  docs skill workflow git notify dev security remote market fun`. This plugin is
  `ui` — a control added to the sidebar, not a theme (themes belong under `theme`,
  which feeds dsh-market's separate Themes tab).
- `description.en` is the only required description and must be **accurate** — it is
  read as a claim about the plugin and checked against the code. No superlatives, no
  marketing.
- A description containing **`: `** must be **quoted**, or YAML parses it as a nested
  key.
- Do **not** add an `npm:` key. The npm↔repo mapping is picked up from the registry
  automatically, and a hand-written one is rejected.

## 3. npm — optional

Publishing is **not** required for listing, and does not change whether the plugin is
accepted; plugins install from GitHub either way. It buys two things: storefronts can
show and sort by download count, and prebuilt installs skip the `allowBuilds`
build-approval prompt.

The obvious name was taken (`dsh-desktop-restart` belongs to another author), so this
publishes as **`dsh-sidebar-restart`**:

```sh
npm view dsh-sidebar-restart version   # 404 means the name is still free
npm login
npm publish                            # prepublishOnly runs the gate first
```

If it is published, its `repository` field must point back at
`https://github.com/DONGBIN007/dsh-sidebar-restart`, or the registry cannot link the
two and the download count will never appear on the entry.

To publish without touching a global npm config:

```sh
# .secrets/npmrc containing:  //registry.npmjs.org/:_authToken=<token>
NPM_CONFIG_USERCONFIG=D:\DSH\.secrets\npmrc npm publish
```

## 4. Screenshots — optional

`screenshots.json` sits next to `package.json` and lists 1–8 images by **relative**
path (no leading `/`, no `..`). They show in dsh-market's detail view, and updating
them later is a push to this repo — no pull request.

## Why this is not a duplicate of the entries that already say "restart"

The reviewer checks this, and the two existing entries do genuinely different things:

- [`hadesybil-hub/dsh-restart-button`](https://github.com/hadesybil-hub/dsh-restart-button)
  restarts the **Web GUI's server**. This plugin restarts the **desktop application**,
  and on a plain `dsh web` profile it reports itself unavailable
  (`reason: not-desktop`) rather than pretending.
- [`SanShuiGieGie/dsh-desktop-restart`](https://github.com/SanShuiGieGie/dsh-desktop-restart)
  is a **tray menu command**. This one is a permanent row in the sidebar foot, and the
  part that makes it more than a launcher is what happens after the app comes back:
  the tab watches the boot id and reloads itself, so a plugin installed just before
  the restart is actually running afterwards instead of the old bundle staying on
  screen.
