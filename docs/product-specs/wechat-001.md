# WECHAT-001 公众号官方数据同步

## 目标

使用微信公众号官方接口同步基础运营数据，让公众号文章阅读、分享、收藏进入内部事实系统。

## 范围

- 从 `.env.local` 读取 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`、`WECHAT_OFFICIAL_ACCOUNT_ID`。
- 获取 `access_token`。
- 调用数据统计接口：
  - `datacube/getarticlesummary`
  - `datacube/getusersummary`
- 把文章统计映射为：
  - `ContentItem`
  - `ContentPlatformVersion`
  - `MetricSnapshot`
  - `ImportRun`
  - `WorkbenchLog`
- 支持脚本入口：`npm run sync:wechat -- --begin=YYYY-MM-DD --end=YYYY-MM-DD`。
- 支持 API 入口：`POST /api/self-media/wechat/sync`。

## 边界

- 密钥只允许在 `.env.local`，不得进入请求体、页面、日志、Git。
- 微信原始字段不能直接污染 UI 或 Service 外层，只能通过 Provider/Service 转为内部模型。
- 当前不处理公众号消息推送、JS-SDK、安全域名、自动回复。
- 点赞、评论等官方接口不能稳定给到的字段，先记录为 warning，后续由浏览器采集或其他平台导出补齐。

## 验收

- mock provider 契约测试证明公众号数据能进入内部内容、平台版本、指标快照和导入记录。
- 本地真实凭据可通过 `npm run check:wechat` 验证 token。
- 本地真实同步可通过 `npm run sync:wechat -- --begin=YYYY-MM-DD --end=YYYY-MM-DD` 验证。
