# LifeOS v1.3 Daily Engine

一个本地运行的单页工具，按你给的 PLAYBOOK v1.3 设计：

- 单入口：`DL-30`
- 自动输出：`A/B/C/D`
- 红灯逻辑：`RUIN(S/T/P) -> 默认防线`
- 周趋势：`Scoreboard-5 v1.3` 自动统计（近 7 天）

## 1) 直接打开

在 Finder 里双击 `index.html` 即可使用。

## 2) 推荐本地服务（可选）

```bash
cd /Users/xiaoxuan/Documents/Playground/lifeos-v13
python3 -m http.server 5193
```

然后访问：

- http://localhost:5193

## 3) 使用流程（每天 30 秒）

1. 填 `DL-30` 必填项（行为、结果、昨日B执行、RUIN、明日意图可空）
2. 点 `生成 A/B/C/D 并保存`
3. 只执行输出里的 `B`
4. 一周后看 `Scoreboard-5 v1.3`

## 4) 数据存储

- 存在浏览器 `localStorage`
- Key: `lifeos_v13_entries`

说明：同一天重复提交会覆盖当天记录（避免重复计数）。

## 5) Zero-Day

如果当天很忙，只填“行为 + 结果”，点 `Zero-Day 一键记录` 也算不断更。

## 6) 数据桥（V2）

已支持设备数据自动回填（URL 参数注入）：

- 睡眠/训练/步数/卡路里/距离
- 软件使用总分钟、手机分钟、电脑分钟、头号应用

Mac 一键采集当天应用用时并打开网页：

```bash
python3 /Users/xiaoxuan/Documents/Playground/lifeos-v13/scripts/macos_usage_bridge.py --open
```

完整说明见：

- `/Users/xiaoxuan/Documents/Playground/lifeos-v13/docs/LifeOS_Data_Bridge_v2.md`

## 7) 多端云同步

网页内置 `多端云同步（GitHub Gist）`：

1. 填 GitHub token（Gists 读写）
2. 点 `初始化云仓`
3. 点 `同步现在（先拉后推）`
4. 可选：勾选 `每次保存后自动同步`

## GitHub Positioning

- Suggested description: `Local-first daily planning and review tool based on the LifeOS v1.3 playbook.`
- Suggested topics: `productivity`, `planner`, `lifeos`, `local-first`, `html`, `css`, `javascript`
- Metadata notes: see [`docs/repo-metadata.md`](docs/repo-metadata.md)

