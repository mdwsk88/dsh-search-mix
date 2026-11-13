# Publishing dsh-search-mix

Prepared on 2026-11-13. Everything publishable is in this repository; the remaining steps need the author's GitHub and npm accounts.

## Ready in this repository

| Item | State |
|---|---|
| Git repository | **Created and pushed**: [mdwsk88/dsh-search-mix](https://github.com/mdwsk88/dsh-search-mix), topics `dsh-plugin`, `dsh`, `deepseek-harness`, `web-search`, `search` |
| npm package | `npm publish --dry-run` passes: 14 files, 22.7 kB, name `dsh-search-mix@0.1.0` free on npm |
| Market entry (awesome-dsh-plugin) | [`market/awesome-dsh-plugin-entry.yml`](market/awesome-dsh-plugin-entry.yml), category `browser` |
| Self-hosted format-1 index | [`market/index.json`](market/index.json), validated with the shipped `parseMarketIndex` |
| Storefront icon | [`assets/icon-180.png`](assets/icon-180.png), 180×180 PNG |
| Tests | 18/18: mix logic, config, provider output, client render |

## 1. GitHub repository — done

The public repository is live at <https://github.com/mdwsk88/dsh-search-mix>, `main` is pushed, and the topics are set. The awesome list still requires the repository to be **at least one day old**, so its PR waits until 2026-11-14.

## 2. Publish to npm

```sh
npm login          # or set NPM_TOKEN
npm publish
npm view dsh-search-mix version
```

After this, `dsh plugin --profile <profile> add dsh-search-mix` works immediately. Being on npm does **not** put it in a market yet: both markets read a curated catalog, not npm search.

## 3. Submit to awesome-dsh-plugin (makes it searchable in dshmarket and Discover)

The catalog is generated from one YAML file per plugin. After the repository is a day old:

1. Fork [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin).
2. Copy [`market/awesome-dsh-plugin-entry.yml`](market/awesome-dsh-plugin-entry.yml) to `data/plugins/mdwsk88__dsh-search-mix.yml` (filename = `<owner>__<repo>.yml`).
3. Open the PR. Do not edit the generated READMEs.

The entry is already in the required shape:

```yaml
url: https://github.com/mdwsk88/dsh-search-mix
name: mdwsk88/dsh-search-mix
category: browser
description:
  en: Adds a web search provider that asks two or more search APIs at once ...
  zh: 提供一个联网搜索提供方，同时询问两家或更多搜索 API ...
icon: https://raw.githubusercontent.com/mdwsk88/dsh-search-mix/main/assets/icon-180.png
```

Every claim in the description is checked against the code, so keep it to what `README.md` documents. Once merged, dshmarket fetches the refreshed catalog on its next open (usually within a day), and the format-1 index published as `dsh-plugin-catalog` is regenerated from the same data.

If a maintainer asks whether this duplicates an existing entry: it mixes several APIs per search, interleaving and deduplicating their pages, rather than switching or failing over to one API.

## 4. Self-hosted index (optional, immediate)

`market/index.json` is a complete format-1 index pointing at the npm package. Host it on any static HTTPS host — GitHub Pages, jsDelivr via a repo, object storage — and add the URL under **Plugins › Discover › Index sources**. It works only after step 2.

Its one version entry uses `publishTimestamp` from 2026-11-13; regenerate the file after a later publish so the timestamp matches the npm release.

## 5. Release checklist

- [ ] `npm test` passes (18 tests on 2026-11-13).
- [ ] Package installed from the published tarball into a clean profile (`dsh plugin add dsh-search-mix`).
- [ ] The row page opens under Plugins › Installed plugins › Search Mix › Configure and saves.
- [ ] The provider is selectable under Plugins › Built-in plugin settings › Web search and fetch › Web search provider.
- [ ] One real query returns merged, deduplicated pages.
- [ ] Icon and localized title/description render in the bundle row, the row page and the provider menu.
- [ ] No secret value in the package, config examples, or README; the setup variable is `SEARCH_MIX_SOURCES`, never a `DSH_`-prefixed name.
- [ ] `dsh-plugin` topic present; repository at least a day old before the awesome PR.
- [ ] Version bumped and changelog noted for every publish.