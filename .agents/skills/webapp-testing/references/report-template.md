# 探索式 Web 测试报告模板

在每次运行目录中生成 `report.md`、`report.html` 和 `case-results.json`。三份文件不记录密码、Cookie、令牌或其他凭证。

## report.md

```markdown
# Web 测试报告

## 运行信息

| 项目 | 内容 |
| --- | --- |
| 运行 ID | `<run-id>` |
| 目标页面 | `<url>` |
| 测试环境 | `<environment>` |
| 写入策略 | `reversible` 或 `authorized_all_actions` |
| 开始/结束 | `<timestamps>` |

## 页面能力表

| 类别 | 发现的能力 | 覆盖方式 |
| --- | --- | --- |
| `<类别>` | `<可见控件或动作>` | `<等价类用例>` |

## 配置项用例结果

| 配置项用例 ID | 表单上下文 | 配置项名称 | 验证类型 | 控件类型 | 初始状态 | 目标状态 | 保存后复核 | 恢复后复核 | 覆盖状态 | 覆盖维度/原因 | 关联执行用例 | 实际结果 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<configuration-id>` | `<form-context>` | `<accessible-label>` | `<persistent_field/option/operation>` | `<control-type>` | `<state-summary>` | `<state-summary>` | `<verified/failed/blocked/not-applicable>` | `<verified/failed/blocked/not-applicable>` | `<covered/failed/blocked/skipped/unverified>` | `<coverage-dimensions-or-reason>` | `<case-ids>` | `<linked-case-observed-results>` | `<relative-screenshot-path>` |

报告默认以此表作为主视图。每个配置项单独展示一行；一个配置项可以关联一个或多个执行用例，一个执行用例可以被多个配置项复用。`configurationInventory` 是配置项台账，`cases` 是真实执行流程，两者通过 `coverageCaseIds` 关联。持久化字段和选项型配置项必须展示完整 `writeVerification`。操作控件按自身语义展示：保存或确定关联已复核写入，取消展示未持久化复核，入口展示可达性和目标容器。未实际交互验证的配置项不能只因页面可见、首屏截图可见或入口可点击就展示为完整覆盖。

## 页面可见模块与配置项原始清单

| 配置项 ID | 页面可见模块 | 表单上下文 | 容器路径 | 配置项 | 类型 | 初始状态 | 依赖条件 | 覆盖用例 | 状态 | 未覆盖原因 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<configuration-id>` | `<visible-module-or-content-item>` | `<form-context>` | `<semantic-container-path>` | `<accessible-label>` | `<control-type>` | `<state-summary>` | `<dependency-or-none>` | `<case-ids>` | `<covered/blocked/skipped/unverified>` | `<reason-or-none>` | `<relative-screenshot-path>` |

页面可见模块和配置项必须在同一张表中逐项记录，不单独拆出“页面可见模块清单”。同一 `formContext` 下的配置项必须通过 `id + label + controlType + containerPath` 区分。未覆盖的配置项必须保留阻塞、跳过或未验证原因。配置值仅记录空值、有值、已选、未选等状态摘要。

## 执行流程用例明细

| ID | 能力 | 配置项 | 覆盖维度 | 风险 | 预期依据 | 实际结果 | 状态 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<case-id>` | `<能力>` | `<configuration-id-or-none>` | `<visibility/operability/initial-state/interaction/dependency/restoration>` | `<只读/可逆/提交/破坏性>` | `<需求或可见行为>` | `<观察结果>` | `<通过/失败/阻塞/跳过>` | `<相对截图路径>` |

此表记录真实执行流程，用作配置项用例结果的证据来源。展示层按配置项拆行，执行层可按业务流程复用。

## 已确认缺陷

每项包含复现步骤、预期依据、实际结果、影响、证据、页面路由和恢复状态。

## 待产品确认项

每项包含观察结果、需要确认的业务规则、证据和复现步骤。不要计入已确认缺陷数量。

## 恢复与未验证项

列出每个可逆操作的基线、保存后复核、恢复后复核、未执行的提交写入操作及原因。`authorized_all_actions` 运行中，任何可写配置项的 `unverified` 或 `skipped` 必须同步列为结构质量门禁失败。
```

## case-results.json

使用以下顶层字段：

```json
{
  "runId": "<run-id>",
  "target": {"url": "<url>", "environment": "<environment>"},
  "writePolicy": "reversible|authorized_all_actions",
  "capabilities": [],
  "configurationInventory": [
    {
      "id": "<configuration-id>",
      "visibleModule": "<visible-module-or-content-item>",
      "formContext": "<semantic-form-context>",
      "containerPath": "<semantic-container-path>",
      "label": "<accessible-label-or-generated-label>",
      "controlType": "<control-type>",
      "initialState": {
        "visibility": "visible|hidden|unknown",
        "enabled": "enabled|disabled|unknown",
        "valueState": "empty|present|selected|unselected|unknown"
      },
      "optionSummary": "<count-or-availability-summary>",
      "verificationType": "persistent_field|option|operation|entry",
      "writeVerification": {
        "baseline": "recorded|unknown|not-applicable",
        "targetState": "<state-summary-or-not-applicable>",
        "saveSubmitted": "verified|failed|blocked|not-applicable",
        "persistenceVerified": "verified|failed|blocked|not-applicable",
        "restoreSubmitted": "verified|failed|blocked|not-applicable",
        "restoreVerified": "verified|failed|blocked|not-applicable",
        "evidence": ["screenshots/<file>.png"]
      },
      "dependency": {
        "sourceConfigurationId": null,
        "condition": "<single-reversible-condition-or-unknown>",
        "reachability": "reachable|unreachable|unknown"
      },
      "coverageCaseIds": ["<case-id>"],
      "coverageStatus": "covered|failed|blocked|skipped|unverified",
      "coverageReason": null
    }
  ],
  "cases": [
    {
      "id": "<case-id>",
      "capability": "<capability>",
      "formContext": null,
      "configurationId": null,
      "coverage": [],
      "risk": "read_only|reversible|commit|destructive",
      "expectedBasis": "<requirement_or_observable_behavior>",
      "actualResult": "<observed_result_or_not_verified>",
      "status": "passed|failed|blocked|skipped",
      "evidence": ["screenshots/<file>.png"],
      "restoration": "restored|not_required|blocked"
    }
  ],
  "confirmedDefects": [],
  "productConfirmations": [],
  "blockers": []
}
```

不要将原始 DOM、原始配置值、凭证或敏感会话数据写入 JSON。截图使用相对路径，原始截图保存在 `screenshots\`。非配置项用例的 `formContext` 和 `configurationId` 使用 `null`，`coverage` 使用空数组。

`writeVerification` 对持久化字段和选项型配置项必填。保存前原始值只保留在执行内存中用于恢复，JSON 仅记录状态摘要。操作控件使用 `not-applicable` 填充不适用的保存或恢复字段，并通过关联用例说明实际语义。

## 结构质量门禁

生成 `report.html` 前必须检查：

- `configurationInventory` 不能为空。
- `configurationInventory` 不得明显少于页面可见项。
- `configurationInventory` 不得只覆盖代表性流程。
- `configurationInventory` 不得由旧用例或旧截图反推生成。
- 每个配置项必须有 `coverageCaseIds`。
- 每个 `coverageCaseIds` 必须能在 `cases` 中找到。
- `covered` 配置项必须至少有一个通过用例。
- `covered` 配置项必须有截图或结构化证据。
- `failed`、`blocked`、`skipped` 或 `unverified` 配置项必须有 `coverageReason`。
- 持久化字段和选项型配置项的 `covered` 状态必须具有完整 `writeVerification`：基线已记录、保存已提交、保存后已复核、恢复已提交、恢复后已复核，且包含证据。
- `authorized_all_actions` 运行中，每个可写配置项必须为 `covered`、`failed` 或 `blocked`；`skipped`、`unverified`、缺失 `writeVerification` 或仅代表项保存均为结构质量门禁失败。
- 每个配置项必须能在“配置项用例结果”中单独展示。
- 同一 `formContext` 下的多个配置项必须能通过 `id + label + controlType + containerPath` 区分。
- 只验证入口、页面可见性或首屏截图的配置项不能展示为完整覆盖，必须在覆盖维度或未覆盖原因中说明实际覆盖范围。
- 入口、页面、弹窗、抽屉和表单整体不能作为唯一配置项覆盖。
- 门禁失败时必须写入 `blockers`，并标记“不满足完整颗粒度”。

校验失败时仍生成 `report.html`，但必须在阻塞项中展示“结构质量门禁失败”和失败原因，不能无声生成最终报告。

## report.html

在写入最终 `case-results.json` 后，从 Skill 根目录运行：

`node scripts/render-report.mjs <run-directory>`

渲染器读取结构化结果并写入同目录 `report.html`。HTML 必须展示运行信息、用例与配置项状态汇总、页面能力表、配置项用例结果、页面可见模块与配置项原始清单、执行流程用例明细、缺陷、待产品确认项、阻塞项和截图证据。截图只使用 `screenshots/` 下的相对路径，不引入外部资源。
