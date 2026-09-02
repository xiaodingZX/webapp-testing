# webapp-testing 安装说明

通过 GitHub 分发：`https://github.com/xiaodingZX/webapp-testing`

仓库根目录直接就是技能包内容（`SKILL.md`、`agents/openai.yaml`、`references/`、`scripts/render-report.mjs`、`VERSION`、`CHANGELOG.md`），克隆到任一"技能目录"下即可生效。

## 前置依赖

- git
- Node.js 18+（仅运行验收脚本 `scripts/render-report.mjs` 时需要）

## 方式一：git clone（推荐，便于 `git pull` 更新）

按你的宿主环境，任选一种目标位置：

### A. 项目级（Codex / 类 Codex 环境）

把技能装到当前项目内：

```bash
# macOS / Linux
git clone https://github.com/xiaodingZX/webapp-testing.git .agents/skills/webapp-testing
```

```powershell
# Windows PowerShell
git clone https://github.com/xiaodingZX/webapp-testing.git .agents\skills\webapp-testing
```

### B. 用户级（WorkBuddy 等全局技能目录）

```bash
# macOS / Linux
git clone https://github.com/xiaodingZX/webapp-testing.git ~/.workbuddy/skills/webapp-testing
```

```powershell
# Windows PowerShell
git clone https://github.com/xiaodingZX/webapp-testing.git $env:USERPROFILE\.workbuddy\skills\webapp-testing
```

确认最终路径下包含以下文件：

```text
<目标目录>/SKILL.md
<目标目录>/agents/openai.yaml
<目标目录>/references/
<目标目录>/scripts/render-report.mjs
<目标目录>/VERSION
<目标目录>/CHANGELOG.md
```

> `git clone` 要求目标目录不存在或为空；如已存在旧版本，请先删除或重命名旧目录。

## 方式二：GitHub Release 下载 ZIP

1. 进入 `https://github.com/xiaodingZX/webapp-testing/releases`，下载最新的 `webapp-testing-vX.Y.Z.zip`（或点击 `Code → Download ZIP` 获取快照）。
2. 解压后，将 `webapp-testing-main`（或带版本号的目录）整体重命名为 `webapp-testing`。
3. 移动到任一目标位置：

```text
项目级：<项目根>/.agents/skills/webapp-testing
用户级：~/.workbuddy/skills/webapp-testing
```

## 重新加载

- Codex / 类 Codex 环境：重新打开工作区或新建会话。
- WorkBuddy：刷新技能列表（或重启 WorkBuddy）。

## 运行产物目录

默认写入当前工作区的 `artifacts/webapp-testing/<run-id>/`。

需要统一存放时，启动前设置环境变量：

```bash
# macOS / Linux
export WEBAPP_TESTING_ARTIFACT_ROOT='/path/to/test-artifacts/webapp-testing'
```

```powershell
# Windows PowerShell
$env:WEBAPP_TESTING_ARTIFACT_ROOT = 'E:\test-artifacts\webapp-testing'
```

测试运行会在该目录下创建独立的运行目录。

## 更新

```bash
cd <目标目录>
git pull
```

不要混用 git 仓库与 ZIP 快照的目录；如确需切换，请先删除旧目录再重新安装。

## 验收

确认上述 6 项文件齐全，然后进入技能目录执行：

```bash
node scripts/render-report.mjs <某个含 case-results.json 的运行目录>
```

预期：脚本读取 `case-results.json` 并生成 `report.html`，且脚本以 0 退出码完成。

## 在 GitHub 上展示

为了让仓库主页直接显示使用说明，可另存一份极简的 `README.md`（英文或简短中文）作为仓库门面，详细中文说明保留在本文件。
