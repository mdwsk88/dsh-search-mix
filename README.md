# dsh-search-mix

A web search provider for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) that asks **two or more search APIs at once** and gives the agent their pages together: taken in turn from each, a page two sources found kept once.

The goal is a broader first page than one API gives; how much better it is depends on your queries and on which two APIs you mix. Every source actually asked is billed once by that provider, including a stand-in for a source that failed.

## Install

```sh
dsh plugin --profile <profile> add dsh-search-mix
```

Or install the package from the Plugins page / a plugin market, then restart DSH.

## Configure

**At least two sources are required**; one source alone cannot mix.

### Settings page

**Plugins › Installed plugins › Search Mix › Configure** edits the sources, the number asked at once, the ask order and the per-source timeout. Each source row takes the API, its credential references and an optional own address; saving writes the whole section at once, and a refused revision changes nothing. The page also states the environment fallback below.

### Environment variable (alternative)

Name the sources in `$DSH_HOME/.env`, then restart DSH:

```sh
# with a DeepSeek API key
SEARCH_MIX_SOURCES='deepseek=DEEPSEEK_API_KEY+you'

# without one: You.com free search + a keyed API
SEARCH_MIX_SOURCES='you+tavily=TAVILY_API_KEY'

# or with your own SearXNG
SEARCH_MIX_SOURCES='you+searxng@https://searx.example.com'
```

The value names **credential references**, never key values. Each source is `<vendor>[=<credential-ref>[|<credential-ref>…]][@<base url>]`, joined by `+`:

| Example | Meaning |
|---|---|
| `you` | You.com free search (no key; limited daily quota) |
| `tavily=TAVILY_API_KEY` | Tavily with the key stored under that name |
| `tavily=KEY_A\|KEY_B` | two keys, taken in turn; a refused one rests |
| `searxng@https://searx.example.com` | your SearXNG |

Store the keys under those names in the same `$DSH_HOME/.env` (`TAVILY_API_KEY=…`). Do not rename the variable to a `DSH_`-prefixed one: DSH reserves that prefix for launch/bootstrap names and refuses it in `.env`.

### Plugin row (takes priority)

```yaml
# $DSH_HOME/profiles/<profile>/cordis.patch.yml
- id: search-mix
  name: dsh-search-mix
  config:
    sources:
      - vendor: deepseek
        apiKeyEnvs: [DEEPSEEK_API_KEY]
      - vendor: you
    width: 2
    order: listed
    perSourceSeconds: 10
```

A configured `sources` array replaces `SEARCH_MIX_SOURCES` entirely. `width` (1–5, default 2) is how many sources are asked at once; `order` is `listed` or `random`; `perSourceSeconds` (default 10) is the wait before a source gives its place to the next.

### Select the provider

**Plugins › Built-in plugin settings › Web search and fetch › Web search provider**, or set `web.searchProvider: search-mix` in the profile patch. Choosing a search provider does not change the fetch provider.

## What it does

1. It asks the first `width` sources at once (2 by default).
2. A source that fails, finds nothing, takes longer than `perSourceSeconds`, or has every key resting gives its place to the next source not asked yet.
3. It takes the pages in turn — each source's first, then each one's second — a page two sources found kept once by address, up to the search's result count.

All sources failing is an error; all sources finding nothing is an empty result.

## Relation to the built-in DeepSeek provider

`deepseek-search-api` is DSH's built-in single-source provider: it also fetches, and it picks its credential through its own Billing settings (account sign-in or API key).

Search Mix is a separate search-only provider. Its `deepseek` source calls the Search API directly with the credential reference you name — it does **not** reuse the built-in provider's account token, Billing setting, or `count`. If you only sign in to a DeepSeek account and hold no `DEEPSEEK_API_KEY`, mix `you` with Tavily or SearXNG instead.

## Supported APIs

`tavily`, `brave`, `exa`, `firecrawl`, `you`, `deepseek`, `volcengine` (Doubao), `wsa` (Yuanbao), `searxng`.

## Limits

- Search only; it registers no fetch provider.
- At least two configured sources are required, and search reports the reason when they are missing or misconfigured.
- `apiKeyEnvs` accepts several references per source and rotates them; a refused key rests in host memory until DSH restarts.
- Configuration carries credential references, so it stays safe to sync and render.

## Development

```sh
npm test
```

MIT.