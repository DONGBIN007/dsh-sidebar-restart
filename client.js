// Client half of dsh-desktop-restart.
//
// This is a plain hand-written bundle, exactly like the ones DSH ships: no
// build step, no import/export keywords, no JSX. The page loads it as a script,
// the module loader below hands it a `require`, and the only modules it may ask
// for are React and ReactDOM.
//
// It contributes one control to the sidebar foot. That seat
// (`sidebar.footer.action`) is a list rendered as `footerActions`, a flex row
// that the shipped sidebar lays out directly above `settingsArea` - so the
// control lands in the row beside the settings gear.
//
// It asks the loader for two modules: React, and ReactDOM - the latter only for
// `createPortal`, which is how the confirmation dialog escapes the sidebar's
// stacking and clipping context to sit in the viewport where a modal belongs.
//
// The control is deliberately a copy of the gear row next door, so the two read
// as one row: same primary label colour, same 42px row, same 14px/22px label,
// and the host's own `wide` convention - the label shows in the wide column and
// the control becomes a 36x36 icon-only circle in the collapsed rail.

window.__ModuleLoader__.load({
  id: 'dsh-sidebar-restart',
  factory: (require) => {
    const React = require('react')
    const ReactDOM = require('react-dom')
    const h = React.createElement

    const NS = 'dsh-desktop-restart'
    const STATUS_ROUTE = '/dsh-desktop-restart/status'
    const RESTART_ROUTE = '/dsh-desktop-restart/restart'

    /** The seat this plugin occupies in the sidebar foot. */
    const SLOT = 'sidebar.footer.action'
    const SLOT_ID = 'desktop-restart'

    /** Bilingual copy. Registered on the locale service so it follows the UI language. */
    const zh = {
      'action.label': '重启',
      'action.aria': '重启 DeepSeek Harness',
      'action.title': '重启应用',
      'action.checking': '重启 · 正在检查…',
      'confirm.title': '重启 DeepSeek Harness？',
      'confirm.running': '正在执行的任务会被打断。',
      'confirm.body': '应用会退出并重新启动，你的会话和文件都保存在本地，不会丢失。',
      'confirm.cancel': '取消',
      'confirm.run': '立即重启',
      'progress.title': '正在重启…',
      'progress.body': '应用退出后会自动重新启动，请稍候。如果长时间没有反应，请查看日志：',
      'unavailable.title': '此环境无法重启',
      'unavailable.notDesktop': '当前不是桌面版应用，插件只能在桌面端重启。',
      'unavailable.other': '暂时无法重启：',
      'close': '关闭',
    }

    const en = {
      'action.label': 'Restart',
      'action.aria': 'Restart DeepSeek Harness',
      'action.title': 'Restart the app',
      'action.checking': 'Restart · checking…',
      'confirm.title': 'Restart DeepSeek Harness?',
      'confirm.running': 'Tasks that are running will be interrupted.',
      'confirm.body': 'The app will quit and start again. Your sessions and files stay on disk.',
      'confirm.cancel': 'Cancel',
      'confirm.run': 'Restart now',
      'progress.title': 'Restarting…',
      'progress.body': 'The app will start again on its own. If nothing happens, see the log at ',
      'unavailable.title': 'Restart is unavailable here',
      'unavailable.notDesktop': 'This is not the desktop app; only the desktop build can be restarted.',
      'unavailable.other': 'Cannot restart right now: ',
      'close': 'Close',
    }

    /** The host's medium stroke weight, `ICON_MEDIUM_STROKE` in the primitives. */
    const ICON_STROKE = 1.3

    /**
     * Optical parity with the gear in the row beside this one.
     *
     * Both glyphs are the host's own artwork on the same 16 grid, but they do not
     * carry the same amount of ink. Measured on the shipped path data (geometry
     * plus the 1.3 stroke, so with the butt caps the artwork actually paints):
     *
     *   the gear          `IconSettingsOutlineArtwork`  13.45 units wide
     *   the refresh arc   `IconRefreshOutlineArtwork`   14.30 units wide
     *
     * - about 6% more, which is why the arc reads as the larger and heavier of the
     * two even though both sit in a 16px box at the same stroke. The primitives set
     * ships exactly one refresh glyph, so there is no smaller official variant to
     * switch to, and the artwork is not ours to redraw.
     *
     * So the box stays the host's 16px - which is what leaves this label sitting at
     * the same x as the gear's - and the *drawing* is scaled down to the gear's ink
     * instead, by widening the viewBox. The path data itself is still byte-for-byte
     * the shipped artwork; only the window onto it changes.
     *
     * `strokeWidth` is divided by the same factor so the painted stroke stays at the
     * gear's 1.3 rather than being thinned by the new scale. Matching the glyph must
     * not also make it lighter - that would trade one mismatch for another.
     *
     * Derived from the two measured inks, with the stroke removed from both because
     * the viewBox scales the stroke too:
     *   (13.45 - 1.3) / (14.30 - 1.3) = 0.9346
     */
    const GLYPH_SCALE = 0.9346
    const VIEW_BOX = 16 / GLYPH_SCALE // 17.11906...
    const VIEW_BOX_MIN = 8 - VIEW_BOX / 2 // -0.55953...

    /**
     * The restart glyph, copied verbatim from the shipped
     * `IconRefreshOutlineArtwork` in @deepseek-ai/dsh-client-ui-primitives.
     *
     * Copied rather than imported on purpose: a plain-JS plugin has no type
     * check, and a Harness Client package is not a module this bundle may load.
     * Keeping the artwork identical is what makes the button read as part of the
     * host's own icon set - same 16x16 box, same 1.3 medium stroke, same
     * `currentColor`, same default (butt) caps as the original. Only the viewBox is
     * adjusted, for the optical reason documented on `GLYPH_SCALE` above.
     *
     * `size` follows the host's own rule for this seat: 16 in the wide column,
     * 18 in the collapsed rail (exactly what the settings gear's `TriggerContent`
     * does with `size: wide ? 16 : 18`).
     */
    function RestartIcon({ size }) {
      return h(
        'svg',
        {
          width: size ?? 16,
          height: size ?? 16,
          viewBox: `${VIEW_BOX_MIN} ${VIEW_BOX_MIN} ${VIEW_BOX} ${VIEW_BOX}`,
          fill: 'none',
          xmlns: 'http://www.w3.org/2000/svg',
          strokeWidth: ICON_STROKE / GLYPH_SCALE,
          'aria-hidden': true,
          focusable: false,
          style: { display: 'block', flex: 'none' },
        },
        h('path', {
          d: 'M14.5001 8C14.5 9.28552 14.1188 10.5422 13.4045 11.611C12.6903 12.6799 11.6752 13.5129 10.4875 14.0049C9.29982 14.4968 7.99295 14.6255 6.73212 14.3747C5.4713 14.124 4.31314 13.505 3.4041 12.596C2.49514 11.687 1.87614 10.5288 1.62537 9.26798C1.37459 8.00716 1.50331 6.70028 1.99525 5.51261C2.48719 4.32494 3.32025 3.30981 4.3891 2.59557C5.45795 1.88134 6.71458 1.50008 8.0001 1.5C9.9001 1.5 11.7001 2.3 13.0001 3.6L14.5001 5.1',
          stroke: 'currentColor',
        }),
        h('path', { d: 'M14.4999 1.5V5.1H10.8999', stroke: 'currentColor' }),
      )
    }

    /**
     * The control copies the settings-gear row it sits beside, so the two read as
     * one row rather than as a guest control.
     *
     * Taken from the shipped `.wCInkW_trigger` (ui-settings-general) and the
     * footer sibling `.dsh-mobile-control__trigger`, which agree on every value
     * that matters here:
     *   - colour `--dsw-alias-label-primary` (NOT the secondary label colour - a
     *     secondary icon beside a primary-coloured gear is exactly the mismatch
     *     this fixes),
     *   - `--dsw-radius-md`, height 42px, `padding 0 10px 0 8px`, `gap 8px`,
     *   - font `inherit` at 14px / 22px, matching the gear's label.
     *
     * The rail is the host's own convention for this seat: when the sidebar
     * collapses to 56px, `wide` is false and the row becomes a 36x36 circle with
     * no label (the gear trigger and the mobile control both do precisely this).
     */
    const styles = {
      button: {
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flex: '1 1 auto',
        // The gear's row is `.wCInkW_triggerRow{width:calc(100% + 4px);margin:4px -2px}`
        // - it deliberately bleeds 2px past the column on each side, so its content
        // starts at `parentLeft - 2 + 8 = +6`. Without the same bleed this row's
        // icon and label sit 2px to the right of the gear's and the two never line
        // up, which is the whole thing being asked for here. This button *is* its
        // own row, so it carries both the bleed and the padding.
        width: 'calc(100% + 4px)',
        height: '42px',
        // Written as four longhands, not as the `margin: '4px -2px'` shorthand.
        // The rail override below also sets `margin`, and React assigns a margin
        // shorthand wholesale - so the two would then depend on spread order alone
        // for which one survives. Longhands make the override partial and explicit.
        marginTop: '4px',
        marginRight: '-2px',
        marginBottom: '4px',
        marginLeft: '-2px',
        padding: '0 10px 0 8px',
        border: 'none',
        borderRadius: 'var(--dsw-radius-md)',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        fontFamily: 'inherit',
        fontSize: '14px',
        lineHeight: '22px',
        cursor: 'pointer',
        overflow: 'hidden',
      },
      /**
       * Collapsed-rail override, copied from the **settings gear's** rail state
       * rather than from the mobile control's, because the gear is the control
       * this seat must agree with.
       *
       * The two host references differ here and it matters: the gear keeps
       * `--dsw-radius-md` in the rail
       * (`.wCInkW_trigger.wCInkW_rail` changes only flex/size/margin/padding,
       * never `border-radius`), while `dsh-mobile`'s own control switches to a
       * `50%` circle. Matching the gear means a rounded square, not a circle -
       * a circle beside a rounded square reads as a different control family.
       *
       * `margin: 8px 0 10px` reproduces the gear's `.wCInkW_triggerRow.wCInkW_railRow`
       * spacing, which this button has no wrapper row of its own to carry.
       */
      rail: {
        flex: '0 0 auto',
        width: '36px',
        height: '36px',
        // The same four longhands the button's own row sets, overridden here.
        marginTop: '8px',
        marginRight: '0',
        marginBottom: '10px',
        marginLeft: '0',
        padding: '0',
        justifyContent: 'center',
        gap: '0',
        borderRadius: 'var(--dsw-radius-md)',
      },
      label: {
        minWidth: '0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      },
      overlay: {
        position: 'fixed',
        inset: '0',
        zIndex: 2147483000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.45)',
      },
      card: {
        width: 'min(420px, calc(100vw - 48px))',
        boxSizing: 'border-box',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-overlay)',
        color: 'var(--dsw-alias-label-primary)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
        fontSize: '13px',
        lineHeight: '1.55',
      },
      title: { margin: '0 0 8px', fontSize: '15px', fontWeight: '500' },
      body: { margin: '0 0 16px', color: 'var(--dsw-alias-label-secondary)' },
      warn: { margin: '0 0 12px', color: 'var(--dsw-alias-state-warn-primary)' },
      row: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
      primary: {
        height: '32px',
        padding: '0 14px',
        border: 'none',
        borderRadius: '8px',
        background: 'var(--dsw-alias-brand-primary)',
        // The foreground that belongs on a brand-filled surface. Spelled out with
        // its longhand name so the primary-button text keeps its contrast in both
        // themes - the `--dsw-alias-label-primary-foreground` token is the one
        // the shipped theme pairs with `--dsw-alias-brand-primary`.
        color: 'var(--dsw-alias-label-primary-foreground)',
        font: 'inherit',
        fontSize: '13px',
        cursor: 'pointer',
      },
      secondary: {
        height: '32px',
        padding: '0 14px',
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: '8px',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        fontSize: '13px',
        cursor: 'pointer',
      },
      mono: { wordBreak: 'break-all', color: 'var(--dsw-alias-label-secondary)' },
    }

    /**
     * The self-fetching status snapshot, shared by the button and its dialogs.
     *
     * The probe retries. The web server mounts this plugin's routes as the app
     * boots, and the sidebar renders as soon as the client bundle is up - so the
     * *first* probe of a freshly loaded page can legitimately land before the host
     * half is listening. A single attempt would then latch `failed` and leave the
     * button greyed out, with the one control whose whole purpose is "install a
     * plugin, then restart" unusable until the user reloads by hand - the exact
     * loop this plugin exists to remove. Retrying is bounded so a host that is
     * genuinely not desktop still settles on its reason instead of spinning.
     */
    const STATUS_RETRY_MS = 1200
    const STATUS_RETRY_LIMIT = 5

    function useStatus() {
      const [status, setStatus] = React.useState(null)
      const [failed, setFailed] = React.useState(false)
      React.useEffect(() => {
        let live = true
        let attempts = 0
        let timer = 0
        const probe = () => {
          attempts += 1
          fetch(STATUS_ROUTE, { headers: { accept: 'application/json' }, cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
            .then((value) => {
              if (!live) return
              setStatus(value)
              setFailed(false)
            })
            .catch(() => {
              if (!live) return
              if (attempts >= STATUS_RETRY_LIMIT) {
                setFailed(true)
                return
              }
              timer = window.setTimeout(probe, STATUS_RETRY_MS)
            })
        }
        probe()
        return () => {
          live = false
          if (timer !== 0) window.clearTimeout(timer)
        }
      }, [])
      return { status, failed }
    }

    /**
     * The element every dialog is portalled into: the page's own `<body>`.
     *
     * A dialog MUST NOT be rendered inside the sidebar foot where the button
     * lives. `position: fixed` is only "fixed to the viewport" while no ancestor
     * establishes a containing block - and the sidebar's scrollers, and any
     * container a theme adds behind them, very much do (`transform`, `filter`,
     * `contain`, `will-change`). Once one does, `inset: 0` becomes "the whole of
     * that sidebar column" and the card is laid out *inside the 56px rail*: the
     * overlay is clipped, the flex row is stretched, and what the user sees is the
     * dialog smeared into the menu as a second, greyed-out row. Portalling to the
     * body is what makes the fixed positioning mean what the stylesheet says.
     */
    const PORTAL_TARGET = () => (typeof document === 'undefined' ? null : document.body)

    /** A small centred dialog. Escape closes it; the primary action takes focus. */
    function Dialog({ children, onClose, labelledBy }) {
      const cardRef = React.useRef(null)
      React.useEffect(() => {
        // Focus the marked action, not the card: a plain div is not focusable, so
        // focusing it would silently leave focus behind the overlay.
        const card = cardRef.current
        if (card === null) return
        const target = card.querySelector('[data-autofocus="true"]') ?? card
        if (typeof target.focus === 'function') target.focus()
      }, [])
      React.useEffect(() => {
        const onKey = (event) => {
          if (event.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
      }, [onClose])
      // Rendering the overlay into the seat's own subtree is the bug this guards
      // against; see PORTAL_TARGET above. Portalled, the overlay is a child of
      // <body>, where `position: fixed; inset: 0` really is the viewport.
      return ReactDOM.createPortal(
        h(
          'div',
          {
            style: styles.overlay,
            role: 'dialog',
            'aria-modal': true,
            'aria-labelledby': labelledBy,
            onMouseDown: (event) => {
              if (event.target === event.currentTarget) onClose()
            },
          },
          h('div', { style: styles.card, ref: cardRef, tabIndex: -1 }, children),
        ),
        PORTAL_TARGET(),
      )
    }

    function RestartButton({ wide }) {
      const t = React.useContext(LocaleContext)
      const { status, failed } = useStatus()
      const [phase, setPhase] = React.useState('idle') // idle | confirm | progress | error
      const [message, setMessage] = React.useState(null)
      // Pending "has the host come back yet?" tick, cleared on unmount so a tick
      // cannot outlive the component that scheduled it.
      const pollRef = React.useRef(0)
      React.useEffect(
        () => () => {
          if (pollRef.current !== 0) window.clearTimeout(pollRef.current)
        },
        [],
      )

      // Exactly the host's rule for the seat next door - byte for byte the same
      // expression the gear's `TriggerContent` uses (`wide ? <icon 16> : <icon 18>`
      // plus `wide && <label>`), so the two cannot diverge even if `wide` ever
      // arrives as a truthy non-boolean. No other responsive logic is invented.
      const showLabel = wide

      const ready = status !== null && status.ready === true
      const loading = status === null && !failed
      const reasonText = status !== null && status.ready !== true
        ? (status.reason === 'not-desktop' ? t('unavailable.notDesktop') : t('unavailable.other') + String(status.detail ?? status.reason))
        : (failed ? t('unavailable.other') + STATUS_ROUTE : '')
      // The only text this button ever shows is its tooltip, so it has to carry
      // the whole explanation when the button is grey.
      const tooltip = loading ? t('action.checking') : (ready ? t('action.title') : reasonText)
      // A disabled button can still be focused and read out, so its name is never
      // allowed to be empty: while the status is in flight there is no reason yet,
      // and the "checking" sentence is the honest one to announce.
      const accessibleName = ready
        ? t('action.aria')
        : (reasonText === '' ? t('action.checking') : reasonText)

      /**
       * Ask the host to restart, then wait for it to come back.
       *
       * After the POST the host replaces itself: the page loses its connection and
       * the *new* process answers the next status probe with a different boot id.
       * Reloading at that point is what hands this tab the new client bundle -
       * without it the old code (and this dialog) stays on screen forever after a
       * plugin install, which is the exact loop this plugin exists to remove.
       *
       * The attempt cap is a way out, not a failure path: if the restart never
       * lands, the UI is handed back rather than trapping the user behind a modal.
       */
      const POLL_MS = 700
      const POLL_LIMIT = 90

      const start = React.useCallback(async () => {
        const beforeBoot = status !== null && typeof status.bootId === 'string' ? status.bootId : null
        setPhase('progress')
        try {
          const response = await fetch(RESTART_ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}',
          })
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}))
            throw new Error(payload.error ?? String(response.status))
          }
          const payload = await response.json().catch(() => ({}))
          if (typeof payload.logPath === 'string') setMessage(payload.logPath)

          let attempts = 0
          let sawDown = false
          const tick = async () => {
            attempts += 1
            try {
              const probe = await fetch(STATUS_ROUTE, {
                headers: { accept: 'application/json' },
                cache: 'no-store',
              })
              if (probe.ok) {
                const next = await probe.json().catch(() => null)
                const id = next !== null && typeof next === 'object' ? next.bootId : undefined
                // With a known prior id, a different one is proof of the new
                // process. Without one (the first probe failed, so the button was
                // never sure the host was there), observing a drop and then an
                // answer is the same evidence.
                const replaced = beforeBoot === null ? sawDown : id !== undefined && id !== beforeBoot
                if (replaced) {
                  window.location.reload()
                  return
                }
              }
            } catch {
              // The host is gone mid-restart. That is the expected state, not an
              // error worth surfacing.
              sawDown = true
            }
            if (attempts >= POLL_LIMIT) {
              setPhase('idle')
              return
            }
            pollRef.current = window.setTimeout(tick, POLL_MS)
          }
          pollRef.current = window.setTimeout(tick, POLL_MS)
        } catch (error) {
          setPhase('error')
          setMessage(error instanceof Error ? error.message : String(error))
        }
      }, [status])

      return h(
        React.Fragment,
        null,
        h(
          // The tooltip sits on the button itself, as the host's own footer rows
          // do. A *disabled* button receives no hover events, so the accessible
          // name (below) is what carries the reason in that state.
          'button',
          {
            type: 'button',
            title: tooltip,
            style: {
              ...styles.button,
              ...(showLabel ? null : styles.rail),
              opacity: ready ? 1 : 0.6,
              cursor: ready ? 'pointer' : 'not-allowed',
            },
            // When the button is enabled the name states the action; when it is
            // disabled the reason IS the useful name, so it is not prefixed with
            // a second, redundant sentence.
            'aria-label': accessibleName,
            'aria-disabled': !ready,
            disabled: !ready,
            onMouseEnter: (event) => {
              if (ready) event.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)'
            },
            onMouseLeave: (event) => {
              event.currentTarget.style.background = 'transparent'
            },
            onClick: () => setPhase('confirm'),
          },
          h(RestartIcon, { size: showLabel ? 16 : 18 }),
          showLabel && h('span', { style: styles.label }, t('action.label')),
        ),

        phase === 'confirm' &&
          h(
            Dialog,
            { onClose: () => setPhase('idle'), labelledBy: 'dsh-restart-title' },
            h('h2', { id: 'dsh-restart-title', style: styles.title }, t('confirm.title')),
            h('p', { style: styles.warn }, t('confirm.running')),
            h('p', { style: styles.body }, t('confirm.body')),
            h(
              'div',
              { style: styles.row },
              h('button', { type: 'button', style: styles.secondary, onClick: () => setPhase('idle') }, t('confirm.cancel')),
              h('button', { type: 'button', style: styles.primary, onClick: start, 'data-autofocus': true }, t('confirm.run')),
            ),
          ),

        phase === 'progress' &&
          h(
            Dialog,
            // Closable on purpose. The restart is already under way and cannot be
            // recalled, so trapping the user behind an undismissable modal only
            // hurts the case where the handoff never lands. The poll above still
            // reloads the page by itself once the new process answers.
            { onClose: () => setPhase('idle'), labelledBy: 'dsh-restart-progress' },
            h('h2', { id: 'dsh-restart-progress', style: styles.title }, t('progress.title')),
            h(
              'p',
              { style: styles.body },
              t('progress.body'),
              message !== null && h('code', { style: styles.mono }, message),
            ),
          ),

        phase === 'error' &&
          h(
            Dialog,
            { onClose: () => setPhase('idle'), labelledBy: 'dsh-restart-error' },
            h('h2', { id: 'dsh-restart-error', style: styles.title }, t('unavailable.title')),
            h('p', { style: styles.body }, String(message ?? '')),
            h(
              'div',
              { style: styles.row },
              h('button', { type: 'button', style: styles.secondary, onClick: () => setPhase('idle') }, t('close')),
            ),
          ),
      )
    }

    /**
     * Dictionary lookup shared with the components without pulling in the
     * Harness locale client package. `ctx.locale.bind` is used when the service
     * is there; a plain fallback keeps the button rendered if it is not.
     */
    const LocaleContext = React.createContext((key) => (en[key] ?? key))

    function apply(ctx) {
      // `ctx.get` rather than a hard `inject`: the button is worth rendering even
      // in a deployment whose locale service is missing.
      const locale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined

      // The two-argument `register(ns, { zh, en })` overload is typed for the
      // built-in namespaces; a plugin namespace registers one locale at a time.
      ctx.effect(() => {
        if (locale === undefined || locale === null || typeof locale.register !== 'function') return undefined
        const stopZh = locale.register(NS, 'zh', zh)
        const stopEn = locale.register(NS, 'en', en)
        return () => {
          if (typeof stopEn === 'function') stopEn()
          if (typeof stopZh === 'function') stopZh()
        }
      }, 'dsh-desktop-restart: dictionaries')

      // The bound translator already falls back to the key; wrap it so an
      // untranslated key shows English copy rather than the raw key.
      const bound = locale !== undefined && locale !== null && typeof locale.bind === 'function'
        ? locale.bind(NS)
        : null
      const translate = (key) => {
        const value = bound === null ? undefined : bound(key)
        if (typeof value === 'string' && value !== '' && value !== key) return value
        return en[key] ?? key
      }

      /**
       * The registered component.
       *
       * It forwards the slot's own props through to {@link RestartButton} rather
       * than dropping them: the seat hands every occupant a `wide` flag, and that
       * flag is what decides whether this control shows its label. Swallowing it
       * pins the control to the icon-only rail shape in every state - which is a
       * visible bug in the wide column and on the mobile drawer, not a nuance.
       */
      function Seated(props) {
        return h(LocaleContext.Provider, { value: translate }, h(RestartButton, props))
      }

      ctx.slots.inject(SLOT, () =>
        ctx.slots.register({ name: SLOT, id: SLOT_ID, order: 60, locale: NS }, Seated),
      )
    }

    return { inject: ['slots'], apply }
  },
})
