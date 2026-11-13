import assert from "node:assert/strict"
import test from "node:test"
import { createRequire } from "node:module"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

const require = createRequire(import.meta.url)
const captured = { module: undefined }
globalThis.window = { __ModuleLoader__: { load: module => { captured.module = module } } }
await import(`../client.js?test=${Date.now()}`)
assert.equal(captured.module?.id, "dsh-search-mix")

const factory = captured.module.factory

function setup(value = {
  sources: [
    { vendor: "deepseek", apiKeyEnvs: ["DEEPSEEK_API_KEY"], baseURL: "" },
    { vendor: "you", apiKeyEnvs: [], baseURL: "" },
  ],
  width: 2,
  order: "listed",
  perSourceSeconds: 10,
}) {
  const state = {
    snapshot: { status: "ready", value, base: undefined, user: undefined, revision: 3, writable: true },
    mutations: [],
    registered: {},
    dictionaries: {},
    entryId: undefined,
  }
  const form = {
    getSnapshot: () => state.snapshot,
    subscribe: () => () => {},
    mutate: async (ops, revision) => {
      state.mutations.push({ ops, revision })
      return true
    },
    set: async () => true,
    unset: async () => true,
  }
  const ctx = {
    configForms: { get: (entryId) => { state.entryId = entryId; return form } },
    locale: {
      register: (ns, dictionaries) => {
        state.namespace = ns
        state.dictionaries = dictionaries
        return () => {}
      },
    },
    slots: {
      inject: (name, contribute) => { state.slotName = name; contribute() },
      register: (options, component) => {
        state.options = options
        state.component = component
        return () => {}
      },
    },
    effect: (fn) => { fn(); return () => {} },
  }
  const plugin = factory(id => {
    if (id === "react") return React
    throw new Error(`unexpected require ${id}`)
  })
  plugin.apply(ctx)
  state.inject = plugin.inject
  state.form = form
  state.t = key => state.dictionaries.zh?.[key] ?? key
  return state
}

test("the client plugin registers the row page for this bundle's row", () => {
  const state = setup()
  assert.deepEqual(state.inject, ["slots", "locale", "configForms"])
  assert.equal(state.entryId, "search-mix")
  assert.equal(state.slotName, "plugins.row.config")
  assert.equal(state.options.key, "dsh-search-mix#search-mix")
  assert.equal(state.options.locale, "search-mix")
  assert.equal(typeof state.component, "function")
})

test("the page renders the configured sources and mixing options", () => {
  const state = setup()
  const html = renderToStaticMarkup(React.createElement(state.component, {
    view: "page", t: state.t, configForm: state.form,
  }))
  assert.match(html, /搜索源/)
  assert.match(html, /DeepSeek/)
  assert.match(html, /You\.com/)
  assert.match(html, /DEEPSEEK_API_KEY/)
  assert.match(html, /混合方式/)
  assert.match(html, /SEARCH_MIX_SOURCES/)
  assert.match(html, /保存/)
})

test("the summary names the configured sources", () => {
  const state = setup()
  const html = renderToStaticMarkup(React.createElement(state.component, {
    view: "summary", t: state.t, configForm: state.form,
  }))
  assert.match(html, /2 · DeepSeek \+ You\.com/)
})

test("an empty configuration points at the environment variable", () => {
  const state = setup({ sources: [], width: 2, order: "listed", perSourceSeconds: 10 })
  const html = renderToStaticMarkup(React.createElement(state.component, {
    view: "page", t: state.t, configForm: state.form,
  }))
  assert.match(html, /SEARCH_MIX_SOURCES/)
  assert.match(html, /添加搜索源/)
})