import assert from "node:assert/strict"
import test from "node:test"
import { apply, Config } from "../index.js"

function harness(config) {
  const state = { provider: undefined }
  const ctx = {
    web: {
      registerSearchProvider(provider) {
        state.provider = provider
        return () => {}
      },
    },
    effect(fn) {
      return fn()
    },
    get: (name) => (name === "credentials"
      ? { resolve: async (ref) => (ref.startsWith("MISSING") ? undefined : { value: `key-${ref}` }) }
      : undefined),
    logger: { debug() {} },
  }
  apply(ctx, config)
  return state.provider
}

function response(status, body) {
  return {
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  }
}

test("the configuration schema has the documented defaults", () => {
  assert.deepEqual(Config({}), { sources: [], width: 2, order: "listed", perSourceSeconds: 10 })
})

test("an unconfigured provider stays selectable and explains what is missing", async () => {
  delete process.env.SEARCH_MIX_SOURCES
  const provider = harness(Config({}))
  assert.equal(provider.id, "search-mix")
  assert.equal(provider.available(), true)
  assert.match(provider.description.zh, /尚未配置/)
  await assert.rejects(provider.search({ query: "q" }), /at least two sources.*SEARCH_MIX_SOURCES/)
})

test("one configured source is an actionable error, not a hidden provider", async () => {
  const provider = harness(Config({ sources: [{ vendor: "you", apiKeyEnvs: [], baseURL: "" }] }))
  assert.equal(provider.available(), true)
  await assert.rejects(provider.search({ query: "q" }), /at least two sources/)
})

test("a configured provider projects merged pages into the web seam source shape", async () => {
  const original = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (url.startsWith("https://one.test")) {
      return response(200, { results: [{ url: "https://a.com/1", title: "a1", content: "A1" }, { url: "https://a.com/2", title: "a2", content: "A2" }] })
    }
    return response(200, { results: [{ url: "https://b.com/1", title: "b1", content: "B1" }, { url: "https://a.com/1", title: "a1", content: "A1 dup" }] })
  }
  try {
    const provider = harness(Config({
      sources: [
        { vendor: "tavily", apiKeyEnvs: ["KEY_ONE"], baseURL: "https://one.test" },
        { vendor: "tavily", apiKeyEnvs: ["KEY_TWO"], baseURL: "https://two.test" },
      ],
    }))
    const result = await provider.search({ query: "q", maxResults: 4 })
    assert.equal(result.truncated, false)
    assert.deepEqual(result.sources.map((s) => s.url), ["https://a.com/1", "https://b.com/1", "https://a.com/2"])
    assert.equal(result.sources[0].snippet, "A1")
    assert.equal(result.sources[0].summary, "A1")
  } finally {
    globalThis.fetch = original
  }
})

test("a missing credential is reported with where to store it", async () => {
  const provider = harness(Config({
    sources: [
      { vendor: "tavily", apiKeyEnvs: ["MISSING_A"], baseURL: "https://a.test" },
      { vendor: "tavily", apiKeyEnvs: ["MISSING_B"], baseURL: "https://b.test" },
    ],
  }))
  await assert.rejects(provider.search({ query: "q" }), /no credential value.*\$DSH_HOME\/\.env/)
})