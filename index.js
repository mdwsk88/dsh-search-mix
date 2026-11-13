// dsh-search-mix registers one web search provider, `search-mix`, that asks
// the configured search APIs together and merges their pages. Sources and
// their credential references live in this plugin's configuration; see
// README.md and docs/DETAIL.md.

import z from "@deepseek-ai/schemastery"
import { buildSources, sourceProblem } from "./src/config.js"
import { COUNT_DEFAULT, countOf, mixSearch } from "./src/mix.js"
import { VENDOR_IDS, clip } from "./src/vendors.js"

/** Cordis plugin name used by loader diagnostics. */
export const name = "search-mix"

/** The web seam this provider registers into. */
export const inject = ["web"]

/** Provider id the picker pins as `web.searchProvider`. */
const PROVIDER_ID = "search-mix"

const SourceConfig = z.object({
  vendor: z.union(VENDOR_IDS),
  apiKeyEnvs: z.array(z.string().role("credential-ref")).default([]),
  baseURL: z.string().default(""),
})

/**
 * Settings read by the next search without re-registering the provider.
 * Sources are asked in this order unless `order` is "random"; `width` of them
 * are asked at once, and a source that fails gives its place to the next.
 */
export const Config = z.object({
  sources: z.array(SourceConfig).default([]),
  width: z.number().step(1).min(1).max(5).default(2),
  order: z.union(["listed", "random"]).default("listed"),
  perSourceSeconds: z.number().min(1).max(60).default(10),
})

/** Stable provider error shape: the tool renders `message`, callers may route on `code`. */
function webError(message, code = "WEB_PROVIDER_ERROR") {
  const error = new Error(message)
  error.name = "WebError"
  error.code = code
  return error
}

/** Publication/crawl timestamp as an ISO-8601 string, when it parses as one. */
function isoDate(value) {
  const s = String(value ?? "").trim()
  if (!s) return undefined
  const t = Date.parse(s)
  if (Number.isNaN(t)) return undefined
  return new Date(t).toISOString()
}

/** Project one merged page into the web seam's source shape. */
function toSource(page) {
  const source = { url: page.url }
  if (page.title) source.title = page.title
  const text = page.text?.trim()
  if (text) {
    source.snippet = clip(text, 320)
    source.summary = clip(text, 1500)
  }
  const publishedAt = isoDate(page.age)
  if (publishedAt) source.publishedAt = publishedAt
  return source
}

export function apply(ctx, config) {
  const provider = {
    id: PROVIDER_ID,
    title: "Search Mix",

    /**
     * Shown under the picker entry. An unconfigured plugin says what is
     * missing here rather than hiding itself from the menu.
     */
    get description() {
      return sourceProblem(config)
        ? {
            en: "Not configured yet: add at least two sources on the plugin's page, or set SEARCH_MIX_SOURCES in .env. Each source asked is billed once.",
            zh: "尚未配置：请在插件页至少添加两个来源，或在 .env 里设置 SEARCH_MIX_SOURCES。每请求一个来源计费一次。",
          }
        : {
            en: "Mixes two search APIs per search: asks them at once, interleaves their pages and drops duplicates. Each source asked is billed once.",
            zh: "每次搜索同时问两家搜索 API，按序交错合并并去重；每请求一个来源计费一次。",
          }
    },

    /**
     * Selectable even before configuration: the picker stays usable and
     * search() answers a missing configuration with the actionable reason,
     * instead of a hidden provider or a bare "unavailable".
     */
    available() {
      return true
    },

    async search(request, signal) {
      const problem = sourceProblem(config)
      if (problem) throw webError(`Search Mix cannot search: ${problem}`, "WEB_PROVIDER_ERROR")
      let configured
      try {
        configured = buildSources(config)
      } catch (error) {
        throw webError(error?.message ?? String(error), "WEB_PROVIDER_ERROR")
      }
      const count = countOf(request.maxResults ?? COUNT_DEFAULT)
      let pages
      try {
        pages = await mixSearch({
          ctx,
          query: request.query,
          count,
          sources: configured,
          width: config.width,
          order: config.order,
          perSourceMs: config.perSourceSeconds * 1000,
          signal,
          log: (entry) => ctx.logger?.debug?.(`search-mix ${JSON.stringify(entry)}`),
        })
      } catch (error) {
        const code = signal?.aborted ? "WEB_ABORTED" : "WEB_PROVIDER_ERROR"
        throw webError(error?.message ?? String(error), code)
      }
      return { sources: pages.map(toSource), truncated: false }
    },
  }

  ctx.effect(() => ctx.web.registerSearchProvider(provider))
}
