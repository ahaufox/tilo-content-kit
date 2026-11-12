# 文档目录

`docs/` 只放面向人的说明文档（Markdown、图片等），不保存演示站、示例应用或任何可运行代码。

- 文档 / Demo 站（GitHub Pages 部署源）：`demo/`，产物 `demo/dist`
- 独立展示站（合成 SSE、Cloudflare Worker 打包脚本）：`demo/tilo-content-kit-demo/`
- 构建与部署流程：根目录 `.github/workflows/pages.yml`、`.github/workflows/ci.yml`、`.cnb.yml`

CI 中站点产物路径为 `demo/dist`，演示代码不要再放回 `docs/`。
