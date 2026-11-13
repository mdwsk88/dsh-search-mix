# Search Mix

Search Mix is a web search provider for DeepSeek Harness that asks two or more search APIs at once and merges their pages. It aims for a broader first page than one API gives; the gain depends on your queries and on which APIs you mix.

## Set it up

1. Install the bundle and restart DSH.
2. Name at least two sources and their **credential references** in `$DSH_HOME/.env`:

   ```sh
   SEARCH_MIX_SOURCES='deepseek=DEEPSEEK_API_KEY+you'
   ```

   Each source is `<vendor>[=<credential-ref>[|<credential-ref>…]][@<base url>]`, joined by `+`. Keys themselves stay under their own names (`TAVILY_API_KEY=…`) in the same file — the plugin configuration never holds a secret. `SEARCH_MIX_SOURCES` must not carry a `DSH_` prefix: DSH reserves that prefix for launch/bootstrap names and refuses it in `.env`.
3. Choose **Search Mix** under **Plugins › Built-in plugin settings › Web search and fetch › Web search provider** (or set `web.searchProvider: search-mix`).

The plugin row also accepts a `sources` array (`vendor`, `apiKeyEnvs`, `baseURL`) plus `width`, `order` and `perSourceSeconds`; configured sources take priority over the environment variable:

```yaml
- id: search-mix
  name: dsh-search-mix
  config:
    sources:
      - vendor: deepseek
        apiKeyEnvs: [DEEPSEEK_API_KEY]
      - vendor: you
    width: 2
```

`you` works without a key through its free search (limited daily quota); `searxng` needs only `baseURL`.

## Behavior

- The first `width` sources are asked at once (2 by default).
- A source that fails, finds nothing, times out, or has every key resting gives its place to the next unasked source.
- Pages are taken in turn: each asked source's first, then each one's second, and so on. A page two sources found is kept once by address.
- The merged list stays within the search's result count.
- A key refused with 401/403 rests for 10 minutes; out of credit, an hour; rate limited, as `Retry-After` says.

## Relation to the built-in DeepSeek provider

`deepseek-search-api` is DSH's built-in single-source provider and also fetches; its Billing setting chooses between the account sign-in and an API key. Search Mix is separate and search-only. Its `deepseek` source calls the Search API directly with the credential reference you name and does not reuse the built-in provider's account token, Billing setting, or `count`. Without a `DEEPSEEK_API_KEY`, mix `you` with another keyed API instead.

## Supported sources

| Id | API | Key |
|---|---|---|
| `tavily` | Tavily | required |
| `brave` | Brave Search | required |
| `exa` | Exa | required |
| `firecrawl` | Firecrawl | required |
| `you` | You.com | optional (free search without one) |
| `deepseek` | DeepSeek Search API | required |
| `volcengine` | Doubao Search (Volcengine) | required |
| `wsa` | Yuanbao Search (Tencent Cloud) | required |
| `searxng` | SearXNG | optional; base URL required |

## Settings page

The plugin adds a configuration page to its row: **Plugins › Installed plugins › Search Mix › Configure**. It edits the `sources` array (API, credential references, optional own address), `width`, `order` and `perSourceSeconds`, saves them as one section write, and shows the environment fallback. It also summarises the configured sources on the row itself.

`SEARCH_MIX_SOURCES` in `$DSH_HOME/.env` remains an alternative; it applies only while `sources` stays empty, and DSH must restart after the file changes. An unconfigured provider stays selectable and its search reports what is missing, so the failure is visible rather than silent.

## Limitations

- Search only: it registers a search provider, not a fetch provider.
- Each search costs one call on every source asked, including a stand-in for a failed one.
- Keys rest in the host process's memory; a restart clears the rest state.
- Configuration carries credential references, so it is safe to sync and to render in settings.