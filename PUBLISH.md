# Publishing dsh-search-mix

Everything a maintainer needs after the plugin works locally. Nothing here has been run yet: it publishes under the author's accounts.

## 1. Before publishing

- `package.json` points `repository`/`homepage`/`bugs` at `github.com/mdwsk88/dsh-search-mix`; create that repository first, or change the URLs.
- `npm view dsh-search-mix` returned 404 on 2026-11-13, so the name is free. If it is taken later, scope it (`@mdwsk88/dsh-search-mix`) and update `dsh.bundle` users' install line.
- `npm pack --dry-run` lists 13 files (index, src, patch, locales, docs, icon, license, README). Tests stay out of the tarball.
- `engines.dsh` is `>=0.2.1-rc.1`; DSH evaluates it with prereleases included, so 0.2.2-rc.x passes.

## 2. Publish the package

```sh
git init
git add .
git commit -m "dsh-search-mix 0.1.0"
git remote add origin git@github.com:mdwsk88/dsh-search-mix.git
git push -u origin main
npm publish
```

Users then install it with:

```sh
dsh plugin --profile <profile> add dsh-search-mix
```

or from DSH's Plugins page / a market.

## 3. List it in the markets

| Market | How |
|---|---|
| **DSH Market** (`dshmarket`, the tab I installed) | Its catalog is the [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) registry. Open a PR there with one entry (package name + repository); the site and the market pick it up automatically, usually within a day. |
| **Open Plugin Market** (`dshopen.org`) | Submit through [polang233/dsh-plugin-index](https://github.com/polang233/dsh-plugin-index) or its site's submit form. |
| **dshbase.com** | Directory site; its listing tracks GitHub/npm entries. |
| **Official market** | DeepSeek announced on 2026-11-08 that an official plugin market and an author support program are being built. Nothing to submit to yet on 2026-11-13; watch the official account. |

## 4. Own index entry (optional)

If you host your own format-1 index (the official Discover tab, `plugins → Discover → Index sources`), a minimal entry looks like this:

```json
{
  "format": 1,
  "title": { "en": "My plugins", "zh": "我的插件" },
  "plugins": [
    {
      "name": "dsh-search-mix",
      "title": { "en": "Search Mix", "zh": "混合搜索" },
      "description": {
        "en": "Mixes two search APIs per web search.",
        "zh": "每次联网搜索同时问两家搜索 API，按序交错合并并去重。"
      },
      "repository": { "url": "https://github.com/mdwsk88/dsh-search-mix" },
      "versions": [
        {
          "version": "0.1.0",
          "publishTimestamp": 1763020800,
          "source": { "type": "npm" },
          "engines": { "dsh": ">=0.2.1-rc.1" }
        }
      ]
    }
  ]
}
```

The generator in the DSH repository (`apps/plugin-market-generator`) can build this from a text list and fill npm metadata instead of hand-writing it.

## 5. Release checklist

- [ ] `npm test` passes (18 tests on 2026-11-13).
- [ ] Installed into a clean profile; the row page opens under Plugins › Installed plugins › Search Mix › Configure; the provider is selected under Plugins › Built-in plugin settings › Web search and fetch › Web search provider.
- [ ] One real query returns merged, deduplicated pages.
- [ ] Icon and localized title/description render in the bundle row and the provider menu.
- [ ] README and detail documents match the shipped behavior.
- [ ] No secret value in the package, config example, or README; the setup variable is `SEARCH_MIX_SOURCES`, never a `DSH_`-prefixed name (DSH refuses those in `.env`).
- [ ] Version bumped and changelog noted for every publish.