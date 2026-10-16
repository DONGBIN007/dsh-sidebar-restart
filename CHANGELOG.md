# Changelog

## 0.1.0

First release.

- A **Restart** row in the sidebar foot, directly above **Settings**, styled as that
  row's twin: the gear's `--dsw-alias-label-primary`, 42px row, `--dsw-radius-md`,
  `0 10px 0 8px` padding, 14px/22px label, and the same 2px row bleed so the two left
  edges line up. Verified against a phone screenshot: icon within 1 device px and
  label exactly 0.
- The label follows the host's own `wide` convention — icon + 重启/Restart in the wide
  column, icon only in the 56px rail — because the seat hands this control the same
  `wide` it hands the gear.
- The glyph is the shipped `IconRefreshOutlineArtwork`, byte for byte, with only the
  viewBox adjusted so its ink matches the gear's 13.45 units instead of 14.30; the
  stroke is divided by the same factor so it keeps the host's 1.3 weight.
- Restart works as an out-of-process handoff: the Host answers `202`, a detached
  helper kills the Electron main process and the Host by PID, waits until both are
  gone (which is what stops the single-instance lock demoting the relaunch), and
  starts the app again with the Node-mode marker removed.
- The tab polls the status route and reloads itself once a **different boot id**
  answers, so a just-installed plugin bundle is actually picked up. The progress
  dialog is dismissable, so a handoff that never lands cannot trap the user.
- The `POST` is loopback-only and refuses forwarding headers, a mismatched `Origin`,
  and any content type but `application/json`.
