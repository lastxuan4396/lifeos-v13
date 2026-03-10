# LifeOS 数据桥 V2（手机 + 电脑）

更新时间：2026-03-10

## 目标
减少手填，自动把这些数据带入 `DL-30`：

- 睡眠时长
- 训练分钟 / 运动数据（步数、卡路里、距离）
- 软件使用时间（手机/电脑）

## 现实边界
- 网页**不能直接读取** Apple Health / Screen Time 权限。
- 方案是：
  - iPhone：用快捷指令把健康数据拼到 URL。
  - Mac：用本地脚本读取 `knowledgeC.db` 的 `/app/usage`，再打开 URL。

## 1) iPhone 自动（健康数据）
在网页的「可选指标」里点击：`复制快捷指令 URL 模板`。

然后在 iPhone 快捷指令里做个人自动化（建议每天 22:30）：
1. 读取健康数据（睡眠、运动分钟、步数、卡路里、距离等）
2. 用「打开 URL」拼接变量并打开网页

网页会自动回填：
- `sleepHours`
- `trainingMinutes`
- `deepWorkMinutes`
- `outputWords`
- `steps`
- `activeCalories`
- `distanceKm`
- `appUsageMinutes`
- `phoneUsageMinutes`
- `topAppName`
- `topAppMinutes`

## 2) Mac 自动（应用使用时间）
项目内脚本：
- `scripts/macos_usage_bridge.py`

作用：
- 读取当天 `/app/usage`
- 汇总 `macUsageMinutes`
- 计算当天头号应用和分钟数
- 生成 LifeOS 自动填充 URL（可直接打开）

运行：
```bash
python3 /Users/xiaoxuan/Documents/Playground/lifeos-v13/scripts/macos_usage_bridge.py --open
```

可选参数：
```bash
# 复制 URL 到剪贴板
python3 /Users/xiaoxuan/Documents/Playground/lifeos-v13/scripts/macos_usage_bridge.py --pbcopy

# 指定日期
python3 /Users/xiaoxuan/Documents/Playground/lifeos-v13/scripts/macos_usage_bridge.py --date 2026-03-10 --open

# 输出 JSON
python3 /Users/xiaoxuan/Documents/Playground/lifeos-v13/scripts/macos_usage_bridge.py --json
```

如果报权限错误：
- 给 Terminal / iTerm 开启 Full Disk Access。

## 3) 建议的日常流程（最低摩擦）
1. iPhone 自动化每天触发一次（健康数据）
2. Mac 脚本每天跑一次（电脑用时）
3. 打开网页后只填：行为 / 结果 / 昨日B执行 / RUIN
4. 明日意图不会写就留空或点 `AI代写意图`
5. 点 `生成 A/B/C/D 并保存`

## 4) 多端同步（手机 + 电脑）
网页内置了 `多端云同步（GitHub Gist）` 模块：

1. 生成一个 GitHub Fine-grained token（仅 Gists 读写）
2. 在网页填 token，点击 `初始化云仓`
3. 两端都点击一次 `同步现在（先拉后推）`
4. 后续可勾选 `每次保存后自动同步`

提示：
- token 仅保存在你本机浏览器 localStorage
- 换设备需再填一次 token（或重新初始化）
