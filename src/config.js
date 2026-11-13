// Reads the plugin's own configuration (an array of sources) into the shape
// mixing uses. Configuration carries credential *references* — environment
// variable names such as TAVILY_API_KEY — never secret values; src/mix.js
// resolves them through ctx.credentials or the process environment.

import { VENDORS } from "./vendors.js"

export class ConfigError extends Error {}

const ids = () => Object.keys(VENDORS).join(", ")

/** Environment variable read when no sources are configured in the plugin row. */
export const SOURCES_ENV = "SEARCH_MIX_SOURCES"

/** A source token is `<vendor>[=<credential-ref>[|<credential-ref>…]][@<base url>]`. */
const TOKEN = /^([a-z][a-z0-9-]*)(?:=([^@]*))?(?:@(.+))?$/i

// parseSourcesText reads the compact form used by $SEARCH_MIX_SOURCES:
// sources joined by "+", each naming credential references, not key values.
//   deepseek=DEEPSEEK_API_KEY+you+tavily=TAVILY_API_KEY
//   searxng@https://searx.example.com
export function parseSourcesText(text) {
  const raw = String(text ?? "").trim()
  if (!raw) return []
  const sources = []
  raw.split(/[+\s;,]+/).filter(Boolean).forEach((token, i) => {
    const at = `source ${i + 1}`
    const m = TOKEN.exec(token)
    if (!m) throw new ConfigError(`${at} isn't <vendor>[=<credential-ref>][@<base url>]`)
    const vendor = m[1].toLowerCase()
    if (!VENDORS[vendor]) throw new ConfigError(`${at}: unknown search API "${vendor}" (one of ${ids()})`)
    sources.push({
      vendor,
      apiKeyEnvs: (m[2] ?? "").split("|").map((ref) => ref.trim()).filter(Boolean),
      baseURL: (m[3] ?? "").trim(),
    })
  })
  return sources
}

function normalizeBase(raw, at) {
  const s = String(raw ?? "").trim()
  if (!s) return ""
  let u
  try {
    u = new URL(s)
  } catch {}
  if (!u || (u.protocol !== "http:" && u.protocol !== "https:") || !u.host) {
    throw new ConfigError(`${at}: its base URL isn't an http:// or https:// URL`)
  }
  if (u.search || u.hash) throw new ConfigError(`${at}: give its base URL alone, without ?query or #fragment`)
  return u.href.replace(/\/+$/, "")
}

// buildSources reads the configured sources in order. A source is
// { vendor, apiKeyEnvs?: string[], baseURL?: string }; its credential
// references are tried in turn, and a refused one rests in src/mix.js.
export function buildSources(config) {
  const configured = Array.isArray(config?.sources) ? config.sources : []
  // Without configured sources, the environment naming them is the configuration.
  const list = configured.length ? configured : parseSourcesText(process.env?.[SOURCES_ENV])
  const seen = new Map()
  const sources = []
  list.forEach((item, i) => {
    const at = `source ${i + 1}`
    const vendor = String(item?.vendor ?? "").toLowerCase()
    const v = VENDORS[vendor]
    if (!v) throw new ConfigError(`${at}: unknown search API "${vendor}" (one of ${ids()})`)
    const refs = (Array.isArray(item?.apiKeyEnvs) ? item.apiKeyEnvs : [])
      .map((ref) => String(ref ?? "").trim())
      .filter(Boolean)
    if (!refs.length && !v.keyOptional) {
      throw new ConfigError(`${at} (${vendor}): needs a credential reference in apiKeyEnvs, e.g. ${vendor.toUpperCase()}_API_KEY`)
    }
    const url = normalizeBase(item?.baseURL, `${at} (${vendor})`)
    if (!url && v.needsURL) throw new ConfigError(`${at} (${vendor}): needs its base URL, e.g. https://searx.example.com`)
    const n = (seen.get(vendor) ?? 0) + 1
    seen.set(vendor, n)
    sources.push({ vendor, name: v.name, refs, url, label: n > 1 ? `${vendor}#${n}` : vendor })
  })
  return sources
}

// sourceProblem explains, in one sentence, why a configured set cannot mix.
export function sourceProblem(config) {
  const remedy = "set SEARCH_MIX_SOURCES in $DSH_HOME/.env and restart DSH, or set the plugin row's sources"
  try {
    const sources = buildSources(config)
    if (sources.length < 2) return `add at least two sources: ${remedy}`
    return undefined
  } catch (error) {
    return `${error?.message ?? String(error)}; ${remedy}`
  }
}