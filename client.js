// The Search Mix row page on the Plugins page: sources, mix width, order and
// the per-source timeout. The form stages edits and writes them as one
// namespace mutation, so a refused revision changes nothing.
//
// Plain React elements only: this plugin ships no build step and imports no
// Harness Client package. Styles use the --dsw-* theme tokens.

window.__ModuleLoader__.load({
  id: 'dsh-search-mix',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace of this page. */
    const NS = 'search-mix'
    /** Key the Plugins page registers a row's configuration under. */
    const ROW_KEY = 'dsh-search-mix#search-mix'
    /** Settings namespace of the provider row, its Loader entry id. */
    const ENTRY_ID = 'search-mix'

    const VENDORS = [
      { id: 'deepseek', name: 'DeepSeek' },
      { id: 'you', name: 'You.com' },
      { id: 'tavily', name: 'Tavily' },
      { id: 'brave', name: 'Brave Search' },
      { id: 'exa', name: 'Exa' },
      { id: 'firecrawl', name: 'Firecrawl' },
      { id: 'volcengine', name: 'Doubao Search (Volcengine)' },
      { id: 'wsa', name: 'Yuanbao Search (Tencent Cloud)' },
      { id: 'searxng', name: 'SearXNG' },
    ]
    const KEYLESS = new Set(['you', 'searxng'])
    const NEEDS_URL = new Set(['searxng'])

    const zh = {
      'title': '混合搜索',
      'description': '每次联网搜索同时问两家搜索 API，按序交错合并并去重。至少配置两个源才会真正混合。',
      'sources.title': '搜索源',
      'sources.hint': '按顺序询问，至少两个。每个源填凭据引用名（如 TAVILY_API_KEY），不是 Key 本身。',
      'sources.vendor': '搜索 API',
      'sources.keys': '凭据引用名',
      'sources.keysPlaceholder': 'TAVILY_API_KEY, TAVILY_KEY_2',
      'sources.baseURL': '自定义地址（可选）',
      'sources.baseURLPlaceholder': 'https://relay.example.com',
      'sources.add': '添加搜索源',
      'sources.remove': '删除这个源',
      'sources.empty': '还没有配置源：插件会读取 .env 里的 SEARCH_MIX_SOURCES。',
      'options.title': '混合方式',
      'options.width': '同时询问',
      'options.order': '询问顺序',
      'options.orderListed': '按列表顺序',
      'options.orderRandom': '每次随机',
      'options.perSourceSeconds': '单个源超时（秒）',
      'warn.needTwo': '少于两个源：搜索会报错，除非设置了 SEARCH_MIX_SOURCES。',
      'warn.needKey': '{vendor} 需要至少一个凭据引用名。',
      'warn.needURL': 'SearXNG 需要填地址。',
      'warn.badURL': '{vendor} 的地址必须是 http:// 或 https://。',
      'warn.badNumber': '同时询问的数量必须在 1 到 5 之间，超时必须在 1 到 60 秒之间。',
      'env.title': '也可以只用环境变量',
      'env.body': '把 SEARCH_MIX_SOURCES=\'you+tavily=TAVILY_API_KEY\' 写进 $DSH_HOME/.env 并重启 DSH；这里的 sources 留空时它才生效。',
      'action.save': '保存',
      'action.saving': '保存中…',
      'action.discard': '放弃修改',
      'status.loading': '正在读取配置…',
      'status.unavailable': '此部署没有提供这项配置。',
      'status.readOnly': '此部署以只读方式保存配置。',
      'notice.saved': '已保存，下一次搜索生效。',
      'notice.refused': '部署未接受这些值，已恢复为已保存的配置。',
      'notice.failed': '保存失败，请稍后重试。',
      'summary.empty': '未配置（读取 SEARCH_MIX_SOURCES）',
      'summary.loading': '读取中…',
    }

    const en = {
      'title': 'Search Mix',
      'description': 'Asks two search APIs per web search, interleaves their pages and drops duplicates. At least two sources are required to mix.',
      'sources.title': 'Sources',
      'sources.hint': 'Asked in this order; at least two. Each source names a credential reference (TAVILY_API_KEY), never the key itself.',
      'sources.vendor': 'Search API',
      'sources.keys': 'Credential references',
      'sources.keysPlaceholder': 'TAVILY_API_KEY, TAVILY_KEY_2',
      'sources.baseURL': 'Custom address (optional)',
      'sources.baseURLPlaceholder': 'https://relay.example.com',
      'sources.add': 'Add source',
      'sources.remove': 'Remove this source',
      'sources.empty': 'No sources configured: the plugin reads SEARCH_MIX_SOURCES from .env.',
      'options.title': 'Mixing',
      'options.width': 'Ask at once',
      'options.order': 'Ask order',
      'options.orderListed': 'Listed order',
      'options.orderRandom': 'Random each search',
      'options.perSourceSeconds': 'Per-source timeout (seconds)',
      'warn.needTwo': 'Fewer than two sources: a search fails unless SEARCH_MIX_SOURCES is set.',
      'warn.needKey': '{vendor} needs at least one credential reference.',
      'warn.needURL': 'SearXNG needs its address.',
      'warn.badURL': "The address for {vendor} must be http:// or https://.",
      'warn.badNumber': 'Ask-at-once must be 1–5 and the timeout 1–60 seconds.',
      'env.title': 'Environment variable only',
      'env.body': "Put SEARCH_MIX_SOURCES='you+tavily=TAVILY_API_KEY' in $DSH_HOME/.env and restart DSH; it applies only while sources above stay empty.",
      'action.save': 'Save',
      'action.saving': 'Saving…',
      'action.discard': 'Discard changes',
      'status.loading': 'Reading configuration…',
      'status.unavailable': 'This deployment does not expose this configuration.',
      'status.readOnly': 'This deployment stores configuration read-only.',
      'notice.saved': 'Saved; the next search uses it.',
      'notice.refused': 'The deployment refused these values; the saved configuration was restored.',
      'notice.failed': 'Saving failed. Try again.',
      'summary.empty': 'Not configured (reads SEARCH_MIX_SOURCES)',
      'summary.loading': 'Reading…',
    }

    const CSS = `
      .dsh-sm { display: flex; flex-direction: column; gap: 14px; color: var(--dsw-alias-label-primary, inherit); font-size: 13px; line-height: 1.5; }
      .dsh-sm h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary, inherit); }
      .dsh-sm p { margin: 0; color: var(--dsw-alias-label-secondary, inherit); }
      .dsh-sm .muted { color: var(--dsw-alias-label-tertiary, inherit); }
      .dsh-sm .section { display: flex; flex-direction: column; gap: 8px; }
      .dsh-sm .rows { display: flex; flex-direction: column; gap: 8px; }
      .dsh-sm .row { display: grid; grid-template-columns: minmax(120px, 156px) minmax(150px, 1fr) minmax(140px, 1fr) 28px; gap: 8px; align-items: center; }
      .dsh-sm input, .dsh-sm select { box-sizing: border-box; width: 100%; height: 30px; padding: 0 8px; border-radius: var(--dsw-radius-sm, 6px); border: 1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.35)); background: var(--dsw-alias-bg-layer-1, transparent); color: var(--dsw-alias-label-primary, inherit); font: inherit; }
      .dsh-sm input:focus-visible, .dsh-sm select:focus-visible, .dsh-sm button:focus-visible { outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, #4176E6); outline-offset: 1px; }
      .dsh-sm button { height: 30px; padding: 0 12px; border-radius: var(--dsw-radius-sm, 6px); border: 1px solid var(--dsw-alias-border-l3, rgba(127,127,127,0.35)); background: var(--dsw-alias-bg-layer-1, transparent); color: var(--dsw-alias-label-primary, inherit); font: inherit; cursor: pointer; }
      .dsh-sm button:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,0.12)); }
      .dsh-sm button.primary { background: var(--dsw-alias-state-business-primary, #4176E6); border-color: transparent; color: var(--dsw-alias-label-primary-foreground, #fff); }
      .dsh-sm button.link { height: auto; padding: 2px 4px; border: 0; background: transparent; color: var(--dsw-alias-link, #4176E6); }
      .dsh-sm button.icon { height: 28px; padding: 0; width: 28px; line-height: 1; font-size: 16px; }
      .dsh-sm button:disabled { opacity: 0.55; cursor: default; }
      .dsh-sm .options { display: flex; flex-wrap: wrap; gap: 16px; }
      .dsh-sm .field { display: flex; flex-direction: column; gap: 4px; min-width: 120px; }
      .dsh-sm .field > span { color: var(--dsw-alias-label-secondary, inherit); }
      .dsh-sm .hint { padding: 8px 10px; border-radius: var(--dsw-radius-md, 8px); border: 1px solid var(--dsw-alias-border-l2, rgba(127,127,127,0.25)); background: var(--dsw-alias-bg-layer-1, transparent); }
      .dsh-sm .hint strong { display: block; margin-bottom: 2px; font-weight: 600; }
      .dsh-sm .warn { color: var(--dsw-alias-state-error-primary, #C43D3D); }
      .dsh-sm .ok { color: var(--dsw-alias-state-business-primary, #4176E6); }
      .dsh-sm .footer { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .dsh-sm .footer .grow { flex: 1; }
    `

    /** Stage the accepted configuration as editable rows and scalar fields. */
    function draftOf(value) {
      const v = value ?? {}
      return {
        sources: Array.isArray(v.sources)
          ? v.sources.map(source => ({
            vendor: String(source?.vendor ?? 'you'),
            refs: Array.isArray(source?.apiKeyEnvs) ? source.apiKeyEnvs.join(', ') : '',
            baseURL: String(source?.baseURL ?? ''),
          }))
          : [],
        width: v.width ?? 2,
        order: v.order === 'random' ? 'random' : 'listed',
        perSourceSeconds: v.perSourceSeconds ?? 10,
      }
    }

    /** Watch a configuration form's snapshot. */
    function useFormSnapshot(form) {
      const [snapshot, setSnapshot] = React.useState(() => form.getSnapshot())
      React.useEffect(() => form.subscribe(() => setSnapshot(form.getSnapshot())), [form])
      return snapshot
    }

    /** One line the Plugins list shows without opening the page. */
    function summaryOf(value, t) {
      if (value === undefined) return t('summary.loading')
      const names = Array.isArray(value.sources)
        ? value.sources.map(source => VENDORS.find(vendor => vendor.id === source?.vendor)?.name ?? source?.vendor).filter(Boolean)
        : []
      if (!names.length) return t('summary.empty')
      return `${names.length} · ${names.join(' + ')}`
    }

    /** Whether the draft's numbers and addresses can be saved as written. */
    function problemsOf(draft, t) {
      const problems = []
      if (draft.sources.length < 2) problems.push({ tone: 'warn', text: t('warn.needTwo') })
      for (const source of draft.sources) {
        const vendor = VENDORS.find(entry => entry.id === source.vendor)
        const name = vendor?.name ?? source.vendor
        const refs = source.refs.split(/[,\s|]+/).filter(Boolean)
        if (!KEYLESS.has(source.vendor) && refs.length === 0) {
          problems.push({ tone: 'warn', text: styleText(t('warn.needKey'), { vendor: name }) })
        }
        const url = source.baseURL.trim()
        if (NEEDS_URL.has(source.vendor) && !url) problems.push({ tone: 'warn', text: t('warn.needURL') })
        if (url) {
          let ok = false
          try {
            const parsed = new URL(url)
            ok = parsed.protocol === 'http:' || parsed.protocol === 'https:'
          } catch {}
          if (!ok) problems.push({ tone: 'warn', text: styleText(t('warn.badURL'), { vendor: name }) })
        }
      }
      const width = Math.trunc(Number(draft.width))
      if (!Number.isFinite(width) || width < 1 || width > 5) problems.push({ tone: 'warn', text: t('warn.badNumber') })
      return problems.filter(problem => problem.text)
    }

    /** Substitute {name} placeholders without a locale formatter. */
    function styleText(text, values) {
      let out = String(text ?? '')
      for (const [key, value] of Object.entries(values)) out = out.split(`{${key}}`).join(String(value))
      return out
    }

    /** The row page and its one-line summary. */
    function SettingsPage(props) {
      const t = props.t
      const form = props.configForm
      const snapshot = useFormSnapshot(form)
      const [draft, setDraft] = React.useState(() => draftOf(snapshot.value))
      const [saving, setSaving] = React.useState(false)
      const [notice, setNotice] = React.useState(undefined)
      const revision = snapshot.revision

      React.useEffect(() => {
        setDraft(draftOf(snapshot.value))
        // Reset only when the Host accepts a new revision, not on a local edit.
      }, [revision])

      if (props.view === 'summary') return summaryOf(snapshot.value, t)

      const muted = { color: 'var(--dsw-alias-label-secondary, inherit)' }
      if (snapshot.status === 'loading') return h('p', { style: muted }, t('status.loading'))
      if (snapshot.status === 'unavailable') return h('p', { style: muted }, t('status.unavailable'))

      const disabled = !snapshot.writable || saving
      const problems = problemsOf(draft, t)
      const update = (patch) => setDraft(current => ({ ...current, ...patch }))
      const updateSource = (index, patch) => setDraft((current) => ({
        ...current,
        sources: current.sources.map((source, at) => (at === index ? { ...source, ...patch } : source)),
      }))
      const addSource = () => setDraft((current) => ({
        ...current,
        sources: [...current.sources, { vendor: current.sources.length ? 'tavily' : 'you', refs: '', baseURL: '' }],
      }))
      const removeSource = (index) => setDraft((current) => ({
        ...current,
        sources: current.sources.filter((_, at) => at !== index),
      }))
      const discard = () => {
        setDraft(draftOf(snapshot.value))
        setNotice(undefined)
      }
      const save = async () => {
        if (disabled) return
        setSaving(true)
        setNotice(undefined)
        const width = Math.min(5, Math.max(1, Math.trunc(Number(draft.width)) || 2))
        const perSourceSeconds = Math.min(60, Math.max(1, Number(draft.perSourceSeconds) || 10))
        const sources = draft.sources.map((source) => ({
          vendor: source.vendor,
          apiKeyEnvs: source.refs.split(/[,\s|]+/).filter(Boolean),
          baseURL: source.baseURL.trim(),
        }))
        try {
          const accepted = await form.mutate([
            { op: 'set', path: ['sources'], value: sources },
            { op: 'set', path: ['width'], value: width },
            { op: 'set', path: ['order'], value: draft.order },
            { op: 'set', path: ['perSourceSeconds'], value: perSourceSeconds },
          ], revision)
          setNotice({ tone: accepted ? 'ok' : 'warn', text: accepted ? t('notice.saved') : t('notice.refused') })
        } catch {
          setNotice({ tone: 'warn', text: t('notice.failed') })
        } finally {
          setSaving(false)
        }
      }

      return h(React.Fragment, null,
        h('style', null, CSS),
        h('div', { className: 'dsh-sm' },
          h('div', { className: 'section' },
            h('h3', null, t('title')),
            h('p', null, t('description')),
            snapshot.writable ? null : h('p', { className: 'muted' }, t('status.readOnly')),
          ),
          h('div', { className: 'section' },
            h('h3', null, t('sources.title')),
            h('p', null, t('sources.hint')),
            draft.sources.length
              ? h('div', { className: 'rows' }, draft.sources.map((source, index) => h('div', { className: 'row', key: index },
                h('select', {
                  value: source.vendor,
                  'aria-label': t('sources.vendor'),
                  disabled,
                  onChange: event => updateSource(index, { vendor: event.target.value }),
                }, VENDORS.map(vendor => h('option', { key: vendor.id, value: vendor.id }, vendor.name))),
                h('input', {
                  value: source.refs,
                  'aria-label': t('sources.keys'),
                  placeholder: t('sources.keysPlaceholder'),
                  disabled,
                  onChange: event => updateSource(index, { refs: event.target.value }),
                }),
                h('input', {
                  value: source.baseURL,
                  'aria-label': t('sources.baseURL'),
                  placeholder: t('sources.baseURLPlaceholder'),
                  disabled,
                  onChange: event => updateSource(index, { baseURL: event.target.value }),
                }),
                h('button', {
                  type: 'button', className: 'icon link',
                  'aria-label': t('sources.remove'),
                  title: t('sources.remove'),
                  disabled,
                  onClick: () => removeSource(index),
                }, '×'),
              )))
              : h('p', { className: 'muted' }, t('sources.empty')),
            h('div', null,
              h('button', { type: 'button', onClick: addSource, disabled }, t('sources.add')),
            ),
          ),
          h('div', { className: 'section' },
            h('h3', null, t('options.title')),
            h('div', { className: 'options' },
              h('label', { className: 'field' },
                h('span', null, t('options.width')),
                h('input', {
                  type: 'number', min: 1, max: 5, step: 1, value: draft.width, disabled,
                  onChange: event => update({ width: event.target.value }),
                }),
              ),
              h('label', { className: 'field' },
                h('span', null, t('options.order')),
                h('select', {
                  value: draft.order, disabled,
                  onChange: event => update({ order: event.target.value }),
                },
                h('option', { value: 'listed' }, t('options.orderListed')),
                h('option', { value: 'random' }, t('options.orderRandom'))),
              ),
              h('label', { className: 'field' },
                h('span', null, t('options.perSourceSeconds')),
                h('input', {
                  type: 'number', min: 1, max: 60, step: 1, value: draft.perSourceSeconds, disabled,
                  onChange: event => update({ perSourceSeconds: event.target.value }),
                }),
              ),
            ),
          ),
          h('div', { className: 'hint' },
            h('strong', null, t('env.title')),
            h('span', { className: 'muted' }, t('env.body')),
          ),
          problems.length ? h('div', { className: 'section' }, problems.map((problem, index) =>
            h('p', { className: 'warn', key: index }, problem.text))) : null,
          h('div', { className: 'footer' },
            h('button', { type: 'button', className: 'primary', onClick: save, disabled }, saving ? t('action.saving') : t('action.save')),
            h('button', { type: 'button', onClick: discard, disabled: !snapshot.writable || saving }, t('action.discard')),
            h('span', { className: 'grow' }),
            notice ? h('span', { className: notice.tone === 'ok' ? 'ok' : 'warn' }, notice.text) : null,
          ),
        ),
      )
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        const form = ctx.configForms.get(ENTRY_ID)
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'search-mix: dictionaries')
        ctx.slots.inject('plugins.row.config', () => ctx.slots.register({
          name: 'plugins.row.config',
          key: ROW_KEY,
          locale: NS,
          inject: () => ({ configForm: form }),
        }, SettingsPage))
      },
    }
  },
})