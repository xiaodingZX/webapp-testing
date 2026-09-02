# webapp-testing 安装说明

## 安装

1. 解压 `webapp-testing-<版本号>.zip` 到项目根目录。
2. 确认最终路径为 `.agents\skills\webapp-testing\SKILL.md`。
3. 重新打开工作区或新建 Codex 会话。

## 运行产物目录

默认写入当前工作区的 `artifacts\webapp-testing\`。

需要统一存放时，在启动 Codex 前设置环境变量：

```powershell
$env:WEBAPP_TESTING_ARTIFACT_ROOT = 'E:\test-artifacts\webapp-testing'
```

测试运行会在该目录下创建独立运行目录。

## 更新

用新版压缩包替换整个 `.agents\skills\webapp-testing\` 目录。不要混用不同版本的规则、模板和脚本。

## 验收

确认 `SKILL.md`、`agents\openai.yaml`、`references\`、`scripts\`、`VERSION` 和 `CHANGELOG.md` 均存在。使用包含 `case-results.json` 的运行目录执行：

```powershell
node .agents\skills\webapp-testing\scripts\render-report.mjs <运行目录>
```
