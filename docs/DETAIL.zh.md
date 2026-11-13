# 混合搜索（Search Mix）

混合搜索是 DeepSeek Harness 的联网搜索提供方：每次搜索同时问两家（或更多）搜索 API，再把它们的页面合并给智能体。目标是让首屏覆盖面比只用一家更广；实际提升取决于你的提问和所混的 API。

## 配置

1. 安装 bundle 并重启 DSH。
2. 在 `$DSH_HOME/.env` 里至少写两个源，以及它们的**凭据引用名**：

   ```sh
   SEARCH_MIX_SOURCES='deepseek=DEEPSEEK_API_KEY+you'
   ```

   每个源写作 `<vendor>[=<凭据引用名>[|<凭据引用名>…]][@<地址>]`，用 `+` 连接。Key 本身留在同一个文件里各自的名字下（`TAVILY_API_KEY=…`），插件配置里永远没有明文密钥。变量名不要加 `DSH_` 前缀：DSH 把该前缀保留给启动/引导变量，写在 `.env` 里会被拒绝。
3. 在 **插件 › 内置插件配置 › 网页搜索与获取 › 网页搜索提供方** 里选择 **Search Mix**（或设置 `web.searchProvider: search-mix`）。切换搜索提供方不会改变抓取提供方。

插件行也接受 `sources` 数组（`vendor`、`apiKeyEnvs`、`baseURL`）以及 `width`、`order`、`perSourceSeconds`；行内配置优先于环境变量：

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

`you` 不填 Key 也能用（免费搜索，每日额度有限）；`searxng` 只需要填地址。

## 行为

- 同时问前 `width` 个源（默认 2 个）。
- 某个源失败、没找到、超时，或它的 Key 都在休息时，由下一个尚未问过的源顶上。
- 页面按序轮取：每个被问到的源的第一条，然后各自的第二条……两家都找到的页面按地址去重，只留一次。
- 合并结果不超过本次搜索要求的条数。
- 被拒的 Key（401/403）休息 10 分钟；余额不足休息 1 小时；限流按 `Retry-After` 休息。

## 与内置 DeepSeek 提供方的关系

`deepseek-search-api` 是 DSH 内置的单源提供方，同时负责抓取，并按它自己的「计费方式」在账号登录和 API Key 之间选凭据。混合搜索是独立的、只做搜索的提供方；它的 `deepseek` 源用你指定的凭据引用名直接调用 Search API，**不会**复用内置提供方的账号 token、计费方式或 `count`。如果只有 DeepSeek 账号登录、没有 `DEEPSEEK_API_KEY`，请用 `you` 搭配 Tavily 或 SearXNG。

## 支持的搜索 API

| Id | API | Key |
|---|---|---|
| `tavily` | Tavily | 必填 |
| `brave` | Brave Search | 必填 |
| `exa` | Exa | 必填 |
| `firecrawl` | Firecrawl | 必填 |
| `you` | You.com | 可选（不填走免费搜索） |
| `deepseek` | DeepSeek 搜索 API | 必填 |
| `volcengine` | 豆包搜索（火山引擎） | 必填 |
| `wsa` | 腾讯云元宝搜索 | 必填 |
| `searxng` | SearXNG | 可选；必须填地址 |

## 设置页

插件在它自己的插件行上提供了一个配置页：**插件 › 已安装插件 › 混合搜索 › 配置**。可以编辑 `sources` 数组（搜索 API、凭据引用名、可选的自定义地址）、`width`、`order` 和 `perSourceSeconds`，整段一次保存；版本冲突时不会写入。页面也会提示环境变量这种用法。

`$DSH_HOME/.env` 里的 `SEARCH_MIX_SOURCES` 仍是备选方案：只有 `sources` 留空时才生效，改完需要重启 DSH。未配置时提供方仍可选中，搜索会明确报出缺少什么，而不是静默消失。

## 限制

- 只做搜索，不提供抓取（fetch）能力。
- 每次搜索会在每个实际被请求的源上各计费一次，包括替补上来的源。
- 休息中的 Key 只存在宿主进程内存里，重启 DSH 后清空。
- 配置里只有凭据引用，不含明文 Key，可以安全同步和在设置页展示。