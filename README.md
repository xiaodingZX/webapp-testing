# webapp-testing

Web 应用探索式测试技能包（Codex / 类 Codex / WorkBuddy 通用）。

动态发现页面的能力、表单与配置项，生成配置项级用例并执行受控测试，产出 **HTML 测试报告 + Markdown + JSON 结构化结果 + 浏览器截图证据**，支持 `authorized_all_actions` 质量门禁。

> 仓库根目录直接就是技能包内容，克隆到任一"技能目录"下即可生效。

## 快速安装

```bash
# 项目级（Codex / 类 Codex 环境）
git clone https://github.com/xiaodingZX/webapp-testing.git .agents/skills/webapp-testing

# 用户级（WorkBuddy 等全局技能目录）
git clone https://github.com/xiaodingZX/webapp-testing.git ~/.workbuddy/skills/webapp-testing
```

Windows PowerShell 版本与更多安装方式、环境变量、更新与验收步骤，见 **[README-安装说明.md](README-安装说明.md)**。

## 目录结构

```text
SKILL.md                   技能主规则
agents/openai.yaml         智能体配置
references/                探索式工作流 / 报告模板
scripts/render-report.mjs  报告渲染脚本（node 18+）
VERSION / CHANGELOG.md     版本信息
```

## 产物

每次测试运行写入工作区 `artifacts/webapp-testing/<run-id>/`（可用环境变量 `WEBAPP_TESTING_ARTIFACT_ROOT` 统一重定向），包含 `report.md`、`report.html`、`case-results.json` 与 `screenshots/`。

## License

见仓库 LICENSE（如未添加，默认可按需与作者确认）。
