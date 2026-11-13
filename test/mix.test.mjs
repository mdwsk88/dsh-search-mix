import assert from "node:assert/strict"
import test from "node:test"
import { buildSources, parseSourcesText } from "../src/config.js"
import { interleave, mixSearch, pageKey, resetState } from "../src/mix.js"

const ctx = {
  get: (name) => name === "credentials"
    ? { resolve: async (ref) => (ref.startsWith("MISSING") ? undefined : { value: `value-of-${ref}` }) }
    : undefined,
}

function response(status, body, headers = {}) {
  return {
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
  }
}

const page = (url, title = url, text = "") => ({ url, title, text, age: "" })

test("buildSources validates and orders the configured sources", () => {
  const sources = buildSources({
    sources: [
      { vendor: "tavily", apiKeyEnvs: ["TAVILY_API_KEY"], baseURL: "" },
      { vendor: "you", apiKeyEnvs: [], baseURL: "" },
      { vendor: "tavily", apiKeyEnvs: ["TAVILY_API_KEY_2"], baseURL: "https://relay.example.com/" },
    ],
  })
  assert.deepEqual(sources.map((s) => s.label), ["tavily", "you", "tavily#2"])
  assert.equal(sources[2].url, "https://relay.example.com")
  assert.throws(() => buildSources({ sources: [{ vendor: "nope" }] }), /unknown search API/)
  assert.throws(() => buildSources({ sources: [{ vendor: "tavily" }] }), /needs a credential reference/)
  assert.throws(() => buildSources({ sources: [{ vendor: "searxng" }] }), /needs its base URL/)
  assert.throws(() => buildSources({ sources: [{ vendor: "you", baseURL: "ftp://x" }] }), /http:\/\/ or https:\/\//)
})

test("pageKey treats scheme, www, trailing slash and fragment alike", () => {
  const a = pageKey("http://www.Example.com/a/?q=1#frag")
  const b = pageKey("https://example.com/a?q=1")
  assert.equal(a, b)
  assert.notEqual(pageKey("https://example.com/a"), pageKey("https://example.com/a?q=2"))
})

test("interleave takes each list in turn, keeps duplicates once and fills missing text", () => {
  const merged = interleave([
    [page("https://a.com/1", "a1", ""), page("https://a.com/2", "a2", "A2")],
    [page("https://b.com/1", "b1", "B1"), page("https://a.com/1", "a1", "A1"), page("https://b.com/2", "b2", "B2")],
  ], 10)
  assert.deepEqual(merged.map((p) => p.url), ["https://a.com/1", "https://b.com/1", "https://a.com/2", "https://b.com/2"])
  assert.equal(merged[0].text, "A1")
  assert.equal(interleave([[page("https://a.com/1")], [page("https://b.com/1")]], 1).length, 1)
})

test("mixSearch interleaves two sources and dedupes shared pages", async () => {
  resetState()
  const seen = []
  const fetchImpl = async (url) => {
    seen.push(url)
    if (url.startsWith("https://one.test")) {
      return response(200, { results: [{ url: "https://a.com/1", title: "a1", content: "A1" }, { url: "https://a.com/2", title: "a2", content: "A2" }] })
    }
    return response(200, { results: [{ url: "https://b.com/1", title: "b1", content: "B1" }, { url: "https://a.com/1", title: "a1", content: "A1 dup" }, { url: "https://b.com/2", title: "b2", content: "B2" }] })
  }
  const sources = buildSources({
    sources: [
      { vendor: "tavily", apiKeyEnvs: ["KEY_ONE"], baseURL: "https://one.test" },
      { vendor: "tavily", apiKeyEnvs: ["KEY_TWO"], baseURL: "https://two.test" },
    ],
  })
  const pages = await mixSearch({ ctx, query: "q", count: 4, sources, width: 2, fetchImpl })
  assert.deepEqual(pages.map((p) => p.url), ["https://a.com/1", "https://b.com/1", "https://a.com/2", "https://b.com/2"])
  assert.equal(seen.length, 2)
})

test("a failing source gives its place to the next one", async () => {
  resetState()
  const asked = []
  const fetchImpl = async (url) => {
    asked.push(url)
    if (url.startsWith("https://bad.test")) return response(500, "boom")
    return response(200, { results: [{ url: "https://ok.com/1", title: "ok", content: "OK" }] })
  }
  const sources = buildSources({
    sources: [
      { vendor: "tavily", apiKeyEnvs: ["KEY_BAD"], baseURL: "https://bad.test" },
      { vendor: "tavily", apiKeyEnvs: ["KEY_OK"], baseURL: "https://ok.test" },
    ],
  })
  const pages = await mixSearch({ ctx, query: "q", count: 3, sources, width: 1, fetchImpl })
  assert.deepEqual(pages.map((p) => p.url), ["https://ok.com/1"])
  assert.equal(asked.length, 2)
})

test("every source failing is an error, every source empty is no pages", async () => {
  resetState()
  const sources = buildSources({ sources: [{ vendor: "tavily", apiKeyEnvs: ["K1"], baseURL: "https://x.test" }, { vendor: "tavily", apiKeyEnvs: ["K2"], baseURL: "https://y.test" }] })
  await assert.rejects(mixSearch({ ctx, query: "q", count: 3, sources, width: 2, fetchImpl: async () => response(500, "nope") }), /500/)
  resetState()
  const empty = await mixSearch({ ctx, query: "q", count: 3, sources, width: 2, fetchImpl: async () => response(200, { results: [] }) })
  assert.deepEqual(empty, [])
})

test("a refused key rests and the next key of the source is asked", async () => {
  resetState()
  const calls = []
  const fetchImpl = async () => {
    calls.push(1)
    if (calls.length === 1) return response(401, { error: { message: "bad key" } })
    return response(200, { results: [{ url: "https://ok.com/1", title: "ok", content: "OK" }] })
  }
  const sources = buildSources({ sources: [{ vendor: "tavily", apiKeyEnvs: ["REFUSED_KEY", "GOOD_KEY"], baseURL: "https://mix.test" }] })
  const pages = await mixSearch({ ctx, query: "q", count: 3, sources, width: 1, fetchImpl })
  assert.equal(pages.length, 1)
  assert.equal(calls.length, 2)
})
test("parseSourcesText reads the compact environment form", () => {
  const sources = parseSourcesText("deepseek=DEEPSEEK_API_KEY+you+tavily=TAVILY_API_KEY|TAVILY_KEY_2@https://relay.example.com")
  assert.deepEqual(sources.map((s) => s.vendor), ["deepseek", "you", "tavily"])
  assert.deepEqual(sources[2].apiKeyEnvs, ["TAVILY_API_KEY", "TAVILY_KEY_2"])
  assert.equal(sources[2].baseURL, "https://relay.example.com")
  assert.throws(() => parseSourcesText("bogus"), /unknown search API/)
})

test("an empty row configuration falls back to SEARCH_MIX_SOURCES", () => {
  process.env.SEARCH_MIX_SOURCES = "you+tavily=TAVILY_API_KEY"
  try {
    const built = buildSources({ sources: [] })
    assert.deepEqual(built.map((s) => s.vendor), ["you", "tavily"])
  } finally {
    delete process.env.SEARCH_MIX_SOURCES
  }
})
