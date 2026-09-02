#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const [runDirectoryArgument, outputArgument] = process.argv.slice(2);

if (!runDirectoryArgument) {
  console.error("Usage: node render-report.mjs <run-directory> [output-file]");
  process.exit(1);
}

const runDirectory = path.resolve(runDirectoryArgument);
const resultPath = path.join(runDirectory, "case-results.json");
const outputPath = outputArgument
  ? path.resolve(outputArgument)
  : path.join(runDirectory, "report.html");

let data;
try {
  data = JSON.parse(await readFile(resultPath, "utf8"));
} catch (error) {
  console.error("[report-renderer] Failed to read " + resultPath + ": " + error.message);
  process.exit(1);
}

const cases = asArray(data.cases);
const configurations = asArray(data.configurationInventory);
const capabilities = asArray(data.capabilities);
const confirmedDefects = asArray(data.confirmedDefects);
const productConfirmations = asArray(data.productConfirmations);
const rawBlockers = asArray(data.blockers);
const writePolicy = String(data.writePolicy || "");
const granularityValidation = validateGranularity(cases, configurations, writePolicy);
const blockers = granularityValidation.ok
  ? rawBlockers
  : rawBlockers.concat({
      item: "结构质量门禁失败",
      reason: granularityValidation.messages.join("；"),
      evidence: null,
    });

const statusLabels = {
  passed: "通过",
  failed: "失败",
  blocked: "阻塞",
  skipped: "跳过",
  covered: "已覆盖",
  unverified: "未验证",
};

const caseStatusCounts = countBy(cases, "status");
const configurationStatusCounts = countBy(configurations, "coverageStatus");
const evidencePaths = uniqueEvidencePaths(cases, configurations);

const documentTitle = data.runId
  ? "探索式 Web 测试报告 · " + data.runId
  : "探索式 Web 测试报告";

const style = [
  ":root {",
  "  color-scheme: light;",
  "  --ink: #172033;",
  "  --muted: #5f6b7a;",
  "  --line: #d7dee7;",
  "  --soft: #f5f7fa;",
  "  --paper: #ffffff;",
  "  --page: #edf1f5;",
  "  --blue: #1d4ed8;",
  "  --teal: #0f766e;",
  "  --green: #15803d;",
  "  --amber: #b45309;",
  "  --red: #b91c1c;",
  "  --slate: #475569;",
  "}",
  "* { box-sizing: border-box; letter-spacing: 0; }",
  "html { background: var(--page); }",
  "body {",
  "  margin: 0;",
  "  color: var(--ink);",
  "  background: var(--page);",
  "  font-family: \"Microsoft YaHei\", \"PingFang SC\", Arial, sans-serif;",
  "  font-size: 14px;",
  "  line-height: 1.55;",
  "}",
  "a { color: var(--blue); text-decoration: none; }",
  "a:hover { text-decoration: underline; }",
  ".report-shell { max-width: 1440px; margin: 0 auto; padding: 28px; }",
  ".report-header {",
  "  display: grid;",
  "  grid-template-columns: minmax(0, 1fr) auto;",
  "  gap: 24px;",
  "  padding: 8px 0 26px;",
  "  border-bottom: 2px solid var(--ink);",
  "}",
  ".eyebrow { color: var(--teal); font-size: 12px; font-weight: 700; }",
  "h1 { margin: 8px 0 10px; font-size: 30px; line-height: 1.2; }",
  "h2 { margin: 0; font-size: 19px; line-height: 1.3; }",
  "h3 { margin: 0; font-size: 15px; line-height: 1.35; }",
  ".subtitle { max-width: 760px; margin: 0; color: var(--muted); }",
  ".run-id {",
  "  align-self: start;",
  "  min-width: 210px;",
  "  padding: 13px 15px;",
  "  border: 1px solid var(--line);",
  "  border-radius: 6px;",
  "  background: var(--paper);",
  "  color: var(--slate);",
  "  font-family: Consolas, \"Courier New\", monospace;",
  "  font-size: 12px;",
  "  overflow-wrap: anywhere;",
  "}",
  ".metadata {",
  "  display: grid;",
  "  grid-template-columns: repeat(4, minmax(0, 1fr));",
  "  gap: 1px;",
  "  margin-top: 24px;",
  "  border: 1px solid var(--line);",
  "  border-radius: 6px;",
  "  overflow: hidden;",
  "  background: var(--line);",
  "}",
  ".metadata-item { min-width: 0; padding: 13px 15px; background: var(--paper); }",
  ".metadata-label { color: var(--muted); font-size: 12px; }",
  ".metadata-value { margin-top: 4px; overflow-wrap: anywhere; font-weight: 600; }",
  ".summary-grid {",
  "  display: grid;",
  "  grid-template-columns: repeat(6, minmax(120px, 1fr));",
  "  gap: 12px;",
  "  margin: 22px 0 6px;",
  "}",
  ".metric {",
  "  min-height: 102px;",
  "  padding: 15px;",
  "  border: 1px solid var(--line);",
  "  border-top: 4px solid var(--slate);",
  "  border-radius: 6px;",
  "  background: var(--paper);",
  "}",
  ".metric--passed { border-top-color: var(--green); }",
  ".metric--failed { border-top-color: var(--red); }",
  ".metric--blocked { border-top-color: var(--amber); }",
  ".metric--covered { border-top-color: var(--teal); }",
  ".metric--unverified { border-top-color: var(--blue); }",
  ".metric-label { color: var(--muted); font-size: 12px; }",
  ".metric-value { margin-top: 8px; font-size: 28px; font-weight: 700; line-height: 1; }",
  ".section { padding: 26px 0; border-top: 1px solid var(--line); }",
  ".section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 14px; }",
  ".section-note { color: var(--muted); font-size: 12px; }",
  ".table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); }",
  "table { width: 100%; min-width: 820px; border-collapse: collapse; }",
  "th, td { padding: 10px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }",
  "th { background: var(--soft); color: var(--slate); font-size: 12px; font-weight: 700; white-space: nowrap; }",
  "tr:last-child td { border-bottom: 0; }",
  "td { overflow-wrap: anywhere; }",
  ".status { display: inline-block; padding: 2px 8px; border: 1px solid currentColor; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; }",
  ".status--passed, .status--covered { color: var(--green); background: #f0fdf4; }",
  ".status--failed { color: var(--red); background: #fef2f2; }",
  ".status--blocked { color: var(--amber); background: #fffbeb; }",
  ".status--skipped, .status--unverified { color: var(--blue); background: #eff6ff; }",
  ".evidence-links { display: flex; flex-wrap: wrap; gap: 6px; }",
  ".evidence-link { font-size: 12px; white-space: nowrap; }",
  ".gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }",
  ".evidence-figure { margin: 0; overflow: hidden; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); }",
  ".evidence-figure img { display: block; width: 100%; aspect-ratio: 16 / 10; background: var(--soft); object-fit: contain; }",
  ".evidence-figure figcaption { padding: 9px 11px; color: var(--muted); font-family: Consolas, \"Courier New\", monospace; font-size: 11px; overflow-wrap: anywhere; }",
  ".finding-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }",
  ".finding { padding: 14px; border: 1px solid var(--line); border-left: 4px solid var(--slate); border-radius: 6px; background: var(--paper); }",
  ".finding--defect { border-left-color: var(--red); }",
  ".finding--confirmation { border-left-color: var(--amber); }",
  ".finding--blocker { border-left-color: var(--blue); }",
  ".finding p { margin: 8px 0 0; color: var(--muted); overflow-wrap: anywhere; }",
  ".empty { margin: 0; padding: 14px; border: 1px dashed var(--line); border-radius: 6px; color: var(--muted); background: var(--paper); }",
  ".footer { padding: 20px 0 0; color: var(--muted); font-size: 12px; }",
  "@media (max-width: 960px) {",
  "  .metadata { grid-template-columns: repeat(2, minmax(0, 1fr)); }",
  "  .summary-grid { grid-template-columns: repeat(3, minmax(120px, 1fr)); }",
  "}",
  "@media (max-width: 680px) {",
  "  .report-shell { padding: 18px; }",
  "  .report-header { grid-template-columns: 1fr; gap: 16px; }",
  "  h1 { font-size: 25px; }",
  "  .metadata, .summary-grid { grid-template-columns: 1fr; }",
  "  .section-heading { display: block; }",
  "  .section-note { display: block; margin-top: 5px; }",
  "}",
  "@media print {",
  "  html, body { background: #ffffff; }",
  "  .report-shell { max-width: none; padding: 0; }",
  "  .evidence-figure { break-inside: avoid; }",
  "  a { color: inherit; text-decoration: none; }",
  "}"
].join("\n");

const html = [
  "<!doctype html>",
  '<html lang="zh-CN">',
  "<head>",
  '  <meta charset="utf-8">',
  '  <meta name="viewport" content="width=device-width, initial-scale=1">',
  "  <title>" + escapeHtml(documentTitle) + "</title>",
  "  <style>",
  style,
  "  </style>",
  "</head>",
  "<body>",
  '  <main class="report-shell">',
  '    <header class="report-header">',
  "      <div>",
  '        <div class="eyebrow">WEBAPP TESTING / GENERATED HTML REPORT</div>',
  "        <h1>探索式 Web 测试报告</h1>",
  "        <p class=\"subtitle\">由结构化测试结果生成。页面状态、路由、持久化结果与未验证项保持分层呈现。</p>",
  "      </div>",
  '      <div class="run-id">' + escapeHtml(data.runId || "未提供运行 ID") + "</div>",
  "    </header>",
  '    <section class="metadata">',
  metadataItem("目标页面", nestedValue(data, ["target", "url"], "未提供")),
  metadataItem("测试环境", nestedValue(data, ["target", "environment"], "未提供")),
  metadataItem("写入策略", data.writePolicy || "未提供"),
  metadataItem("生成时间", new Date().toLocaleString("zh-CN", { hour12: false })),
  "    </section>",
  '    <section class="summary-grid" aria-label="测试汇总">',
  metric("用例总数", cases.length, ""),
  metric("通过", caseStatusCounts.passed || 0, "passed"),
  metric("失败", caseStatusCounts.failed || 0, "failed"),
  metric("阻塞", caseStatusCounts.blocked || 0, "blocked"),
  metric("配置项已覆盖", configurationStatusCounts.covered || 0, "covered"),
  metric("配置项失败", configurationStatusCounts.failed || 0, "failed"),
  metric("配置项未验证", configurationStatusCounts.unverified || 0, "unverified"),
  "    </section>",
  section("页面能力表", "能力由当前页面结构动态发现", renderCapabilities(capabilities)),
  section("配置项用例结果", "每个配置项一行，执行流程用例作为证据来源", renderConfigurationCases(configurations, cases)),
  section("页面可见模块与配置项原始清单", "配置项台账来自 configurationInventory", renderConfigurations(configurations)),
  section("执行流程用例明细", "状态和证据路径来自 case-results.json", renderCases(cases)),
  section("已确认缺陷", "仅收录有可复现依据的问题", renderFindings(confirmedDefects, "未记录已确认缺陷。", "defect")),
  section("待产品确认项", "缺少业务规则依据的观察项", renderFindings(productConfirmations, "未记录待产品确认项。", "confirmation")),
  section("阻塞项", "阻塞会保留现场证据和恢复状态", renderFindings(blockers, "未记录阻塞项。", "blocker")),
  section("截图证据", "截图保存在当前运行目录的 screenshots 文件夹", renderEvidence(evidencePaths)),
  '    <footer class="footer">报告由 webapp-testing 的 render-report.mjs 生成。JSON 为结构化审计源，HTML 不应脱离 JSON 单独修改。</footer>',
  "  </main>",
  "</body>",
  "</html>"
].join("\n");

await writeFile(outputPath, html, "utf8");
console.log("[report-renderer] Wrote " + outputPath);

function validateGranularity(cases, configurations, writePolicy) {
  const messages = [];
  const caseById = new Map(cases.filter(Boolean).map((item) => [String(item.id || ""), item]));
  const requiresWriteClosure = isAuthorizedAllActionsPolicy(writePolicy);

  if (!configurations.length) {
    messages.push("configurationInventory 为空");
  }

  for (const item of configurations) {
    const id = valueText(item && item.id, "<missing-id>");
    const coverageStatus = String(item && item.coverageStatus || "");
    const coverageCaseIds = asArray(item && item.coverageCaseIds).filter((caseId) => hasText(caseId));
    const linkedCases = coverageCaseIds.map((caseId) => caseById.get(String(caseId))).filter(Boolean);

    if (!hasText(item && item.id)) messages.push("存在缺少 id 的配置项");
    if (!hasText(item && item.formContext)) messages.push(id + " 缺少 formContext");
    if (!hasText(item && item.containerPath)) messages.push(id + " 缺少 containerPath");
    if (!hasText(item && item.controlType)) messages.push(id + " 缺少 controlType");
    if (!item || typeof item.initialState !== "object" || item.initialState === null) {
      messages.push(id + " 缺少 initialState");
    }
    if (!hasText(coverageStatus)) messages.push(id + " 缺少 coverageStatus");

    if (!coverageCaseIds.length) {
      messages.push(id + " 缺少 coverageCaseIds");
    } else if (linkedCases.length !== coverageCaseIds.length) {
      messages.push(id + " 存在无法匹配的 coverageCaseIds");
    }

    if (coverageStatus === "covered") {
      const hasExecutedCase = linkedCases.some((testCase) => String(testCase.status || "") === "passed");
      const hasEvidence = linkedCases.some((testCase) => asArray(testCase.evidence).some((evidence) => normaliseEvidencePath(evidence)))
        || asArray(item && item.writeVerification && item.writeVerification.evidence).some((evidence) => normaliseEvidencePath(evidence));

      if (!hasExecutedCase) {
        messages.push(id + " 标记 covered 但没有非阻塞、非跳过用例");
      }
      if (!hasEvidence) {
        messages.push(id + " 标记 covered 但没有证据");
      }
      if (isCoarseConfiguration(item)) {
        messages.push(id + " 疑似入口、页面、弹窗、抽屉或表单整体被标记为 covered，需拆分为内部配置项");
      }
      if (isPersistentConfiguration(item) && !hasCompleteWriteVerification(item)) {
        messages.push(id + " 标记 covered 但缺少完整保存、复核和恢复闭环");
      }
    }

    if (["failed", "blocked", "skipped", "unverified"].includes(coverageStatus) && !hasText(item && item.coverageReason)) {
      messages.push(id + " 未覆盖但缺少 coverageReason");
    }

    if (requiresWriteClosure && isPersistentConfiguration(item)) {
      if (["unverified", "skipped", ""].includes(coverageStatus)) {
        messages.push(id + " 在 authorized_all_actions 下未完成实际保存验证");
      }
      if (["failed", "blocked"].includes(coverageStatus) && !hasWriteFailureEvidence(item, linkedCases)) {
        messages.push(id + " 写入失败或阻塞但缺少现场证据");
      }
    }
  }

  return { ok: messages.length === 0, messages };
}

function isPersistentConfiguration(item) {
  const verificationType = String(item && item.verificationType || "");
  if (["persistent_field", "option"].includes(verificationType)) return true;
  if (["operation", "entry"].includes(verificationType)) return false;
  const controlType = String(item && item.controlType || "").toLowerCase();
  return [
    "switch", "checkbox", "radio", "select", "dropdown", "combobox", "input", "textarea",
    "text", "textbox", "number", "spinbutton", "date", "time", "editor", "field", "form-control",
  ].includes(controlType);
}

function isAuthorizedAllActionsPolicy(writePolicy) {
  return [
    "authorized_all_actions",
    "authorized_full_actions_with_cleanup",
    "authorized_full_actions_with_restore",
  ].includes(writePolicy);
}

function hasCompleteWriteVerification(item) {
  const verification = item && item.writeVerification;
  if (!verification || typeof verification !== "object") return false;
  return verification.baseline === "recorded"
    && verification.saveSubmitted === "verified"
    && verification.persistenceVerified === "verified"
    && verification.restoreSubmitted === "verified"
    && verification.restoreVerified === "verified"
    && asArray(verification.evidence).some((evidence) => normaliseEvidencePath(evidence));
}

function hasWriteFailureEvidence(item, linkedCases) {
  const configurationEvidence = asArray(item && item.writeVerification && item.writeVerification.evidence)
    .some((evidence) => normaliseEvidencePath(evidence));
  const caseEvidence = linkedCases.some((testCase) => asArray(testCase && testCase.evidence)
    .some((evidence) => normaliseEvidencePath(evidence)));
  return configurationEvidence || caseEvidence;
}

function hasText(value) {
  return value != null && String(value).trim() !== "";
}

function isCoarseConfiguration(item) {
  const text = [
    item.id,
    item.formContext,
    item.containerPath,
    item.label,
    item.controlType,
  ].map((value) => String(value || "").toLowerCase()).join(" ");
  const coarseTerms = [
    "入口",
    "新建",
    "编辑",
    "复制",
    "配置页面",
    "页面模块",
    "弹窗整体",
    "抽屉整体",
    "表单整体",
    "button-form",
    "button-dialog",
    "page",
    "drawer",
    "modal",
    "dialog",
  ];
  return coarseTerms.some((term) => text.includes(term));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function nestedValue(object, keys, fallback) {
  let current = object;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return fallback;
    current = current[key];
  }
  return valueText(current, fallback);
}

function valueText(value, fallback = "未提供") {
  if (value == null || value === "") return fallback;
  if (Array.isArray(value)) return value.map((item) => valueText(item, "")).filter(Boolean).join("、") || fallback;
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => key + ": " + valueText(item, ""))
      .filter(Boolean)
      .join("；") || fallback;
  }
  return String(value);
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function countBy(items, field) {
  return items.reduce((counts, item) => {
    const value = item && item[field] ? String(item[field]) : "unknown";
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function statusLabel(status) {
  return statusLabels[status] || valueText(status, "未知");
}

function statusMarkup(status) {
  const safeStatus = ["passed", "failed", "blocked", "skipped", "covered", "unverified"].includes(status)
    ? status
    : "skipped";
  return '<span class="status status--' + safeStatus + '">' + escapeHtml(statusLabel(status)) + "</span>";
}

function metadataItem(label, value) {
  return [
    '      <div class="metadata-item">',
    '        <div class="metadata-label">' + escapeHtml(label) + "</div>",
    '        <div class="metadata-value">' + escapeHtml(value) + "</div>",
    "      </div>"
  ].join("\n");
}

function metric(label, value, tone) {
  const modifier = tone ? " metric--" + tone : "";
  return [
    '      <div class="metric' + modifier + '">',
    '        <div class="metric-label">' + escapeHtml(label) + "</div>",
    '        <div class="metric-value">' + escapeHtml(value) + "</div>",
    "      </div>"
  ].join("\n");
}

function section(title, note, content) {
  return [
    '    <section class="section">',
    '      <div class="section-heading">',
    "        <h2>" + escapeHtml(title) + "</h2>",
    '        <span class="section-note">' + escapeHtml(note) + "</span>",
    "      </div>",
    content,
    "    </section>"
  ].join("\n");
}

function renderCapabilities(items) {
  if (!items.length) return '<p class="empty">未发现页面能力记录。</p>';
  const rows = items.map((item) => {
    return [
      "        <tr>",
      "          <td>" + escapeHtml(valueText(item.category)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.discovered)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.coverageCaseIds)) + "</td>",
      "        </tr>"
    ].join("\n");
  }).join("\n");
  return [
    '      <div class="table-wrap">',
    "        <table>",
    "          <thead><tr><th>类别</th><th>发现的能力</th><th>覆盖用例</th></tr></thead>",
    "          <tbody>",
    rows,
    "          </tbody>",
    "        </table>",
    "      </div>"
  ].join("\n");
}

function renderConfigurations(items) {
  if (!items.length) return '<p class="empty">当前运行未发现可编辑配置项。</p>';
  const rows = items.map((item) => {
    const initialState = item.initialState || {};
    const dependency = item.dependency || {};
    return [
      "        <tr>",
      "          <td>" + escapeHtml(valueText(item.id)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.visibleModule, "-")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.formContext)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.containerPath, "-")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.label, "-")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.verificationType, "未分类")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.controlType)) + "</td>",
      "          <td>" + escapeHtml(valueText(initialState.visibility)) + " / " + escapeHtml(valueText(initialState.enabled)) + " / " + escapeHtml(valueText(initialState.valueState)) + "</td>",
      "          <td>" + escapeHtml(valueText(dependency.condition, "无")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.coverageCaseIds)) + "</td>",
      "          <td>" + statusMarkup(item.coverageStatus) + "</td>",
      "          <td>" + escapeHtml(valueText(item.coverageReason, "-")) + "</td>",
      "          <td>" + escapeHtml(writeVerificationSummary(item)) + "</td>",
      "          <td>" + evidenceLinks(mergeEvidence(item, [])) + "</td>",
      "        </tr>"
    ].join("\n");
  }).join("\n");
  return [
    '      <div class="table-wrap">',
    "        <table>",
    "          <thead><tr><th>配置项 ID</th><th>页面可见模块</th><th>表单上下文</th><th>容器路径</th><th>配置项</th><th>验证类型</th><th>控件类型</th><th>初始状态</th><th>依赖条件</th><th>覆盖用例</th><th>状态</th><th>保存验证</th><th>未覆盖原因</th><th>证据</th></tr></thead>",
    "          <tbody>",
    rows,
    "          </tbody>",
    "        </table>",
    "      </div>"
  ].join("\n");
}

function renderConfigurationCases(configurations, cases) {
  if (!configurations.length) return '<p class="empty">当前运行未发现配置项用例结果。</p>';
  const caseById = new Map(cases.filter(Boolean).map((item) => [String(item.id || ""), item]));
  const rows = configurations.map((item) => {
    const initialState = item.initialState || {};
    const coverageCaseIds = asArray(item.coverageCaseIds).filter((caseId) => hasText(caseId));
    const linkedCases = coverageCaseIds.map((caseId) => caseById.get(String(caseId))).filter(Boolean);
    const coverageText = configurationCoverageText(item, linkedCases);
    const writeVerification = item.writeVerification || {};
    const actualResult = linkedCases.length
      ? linkedCases.map((testCase) => valueText(testCase.id) + "：" + caseActualResult(testCase)).join("；")
      : valueText(item.coverageReason, "-");
    const evidence = mergeEvidence(item, linkedCases);

    return [
      "        <tr>",
      "          <td>" + escapeHtml(valueText(item.id)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.formContext)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.label, "-")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.verificationType, "未分类")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.controlType)) + "</td>",
      "          <td>" + escapeHtml(valueText(initialState.visibility)) + " / " + escapeHtml(valueText(initialState.enabled)) + " / " + escapeHtml(valueText(initialState.valueState)) + "</td>",
      "          <td>" + escapeHtml(valueText(writeVerification.targetState, "不适用")) + "</td>",
      "          <td>" + escapeHtml(valueText(writeVerification.persistenceVerified, "未提供")) + "</td>",
      "          <td>" + escapeHtml(valueText(writeVerification.restoreVerified, "未提供")) + "</td>",
      "          <td>" + statusMarkup(item.coverageStatus) + "</td>",
      "          <td>" + escapeHtml(coverageText) + "</td>",
      "          <td>" + escapeHtml(valueText(coverageCaseIds, "-")) + "</td>",
      "          <td>" + escapeHtml(actualResult) + "</td>",
      "          <td>" + evidenceLinks(evidence) + "</td>",
      "        </tr>"
    ].join("\n");
  }).join("\n");
  return [
    '      <div class="table-wrap">',
    "        <table>",
    "          <thead><tr><th>配置项用例 ID</th><th>表单上下文</th><th>配置项名称</th><th>验证类型</th><th>控件类型</th><th>初始状态</th><th>目标状态</th><th>保存后复核</th><th>恢复后复核</th><th>覆盖状态</th><th>覆盖维度/原因</th><th>关联执行用例</th><th>实际结果</th><th>证据</th></tr></thead>",
    "          <tbody>",
    rows,
    "          </tbody>",
    "        </table>",
    "      </div>"
  ].join("\n");
}

function renderCases(items) {
  if (!items.length) return '<p class="empty">未记录测试用例。</p>';
  const rows = items.map((item) => {
    return [
      "        <tr>",
      "          <td>" + escapeHtml(valueText(item.id)) + "</td>",
      "          <td>" + statusMarkup(item.status) + "</td>",
      "          <td>" + escapeHtml(valueText(item.capability)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.configurationId, "-")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.coverage, "-")) + "</td>",
      "          <td>" + escapeHtml(valueText(item.risk)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.expectedBasis)) + "</td>",
      "          <td>" + escapeHtml(caseActualResult(item)) + "</td>",
      "          <td>" + escapeHtml(valueText(item.restoration)) + "</td>",
      "          <td>" + evidenceLinks(item.evidence) + "</td>",
      "        </tr>"
    ].join("\n");
  }).join("\n");
  return [
    '      <div class="table-wrap">',
    "        <table>",
    "          <thead><tr><th>ID</th><th>状态</th><th>能力</th><th>配置项</th><th>覆盖维度</th><th>风险</th><th>预期依据</th><th>实际结果</th><th>恢复</th><th>证据</th></tr></thead>",
    "          <tbody>",
    rows,
    "          </tbody>",
    "        </table>",
    "      </div>"
  ].join("\n");
}

function renderFindings(items, emptyText, tone) {
  if (!items.length) return '<p class="empty">' + escapeHtml(emptyText) + "</p>";
  const cards = items.map((item, index) => {
    const content = typeof item === "object" && item !== null
      ? Object.entries(item).map(([key, value]) => "<p><strong>" + escapeHtml(key) + "：</strong>" + escapeHtml(valueText(value, "-")) + "</p>").join("")
      : "<p>" + escapeHtml(valueText(item, "-")) + "</p>";
    return [
      '        <article class="finding finding--' + tone + '">',
      "          <h3>记录 " + (index + 1) + "</h3>",
      content,
      "        </article>"
    ].join("\n");
  }).join("\n");
  return '      <div class="finding-grid">\n' + cards + "\n      </div>";
}

function caseActualResult(item) {
  if (item && item.actualResult) return valueText(item.actualResult);
  if (item && item.status === "passed") return "断言通过";
  if (item && item.status === "blocked") return "执行被阻塞";
  if (item && item.status === "skipped") return "未执行";
  return "未提供实际结果";
}

function configurationCoverageText(configuration, linkedCases) {
  const coverageParts = linkedCases
    .flatMap((testCase) => asArray(testCase && testCase.coverage))
    .filter((item) => hasText(item));
  const uniqueCoverage = [...new Set(coverageParts.map((item) => String(item)))];
  const reason = valueText(configuration && configuration.coverageReason, "");
  const coverage = uniqueCoverage.length ? uniqueCoverage.join("、") : "";

  if (coverage && reason) return coverage + "；" + reason;
  if (coverage) return coverage;
  if (reason) return reason;
  return "-";
}

function mergeEvidence(configuration, linkedCases) {
  const paths = [];
  for (const evidence of asArray(configuration && configuration.evidence)) {
    paths.push(evidence);
  }
  for (const evidence of asArray(configuration && configuration.writeVerification && configuration.writeVerification.evidence)) {
    paths.push(evidence);
  }
  for (const testCase of linkedCases) {
    for (const evidence of asArray(testCase && testCase.evidence)) {
      paths.push(evidence);
    }
  }
  return [...new Set(paths.filter((item) => hasText(item)))];
}

function writeVerificationSummary(item) {
  const verification = item && item.writeVerification;
  if (!verification || typeof verification !== "object") return "未提供";
  return [
    "基线=" + valueText(verification.baseline, "未提供"),
    "保存=" + valueText(verification.saveSubmitted, "未提供"),
    "持久化=" + valueText(verification.persistenceVerified, "未提供"),
    "恢复=" + valueText(verification.restoreVerified, "未提供"),
  ].join("；");
}

function normaliseEvidencePath(value) {
  const normalised = String(value == null ? "" : value).replaceAll("\\\\", "/");
  if (!normalised.startsWith("screenshots/") || normalised.includes("..") || /^[a-z]+:/i.test(normalised)) {
    return null;
  }
  return normalised.split("/").map(encodeURIComponent).join("/");
}

function uniqueEvidencePaths(items, configurations) {
  const paths = [];
  for (const item of items) {
    for (const evidence of asArray(item.evidence)) {
      const safePath = normaliseEvidencePath(evidence);
      if (safePath) paths.push(safePath);
    }
  }
  for (const configuration of configurations) {
    for (const evidence of mergeEvidence(configuration, [])) {
      const safePath = normaliseEvidencePath(evidence);
      if (safePath) paths.push(safePath);
    }
  }
  return [...new Set(paths)];
}

function evidenceLinks(evidence) {
  const paths = asArray(evidence).map(normaliseEvidencePath).filter(Boolean);
  if (!paths.length) return "-";
  return '<div class="evidence-links">' + paths.map((item, index) => '<a class="evidence-link" href="' + escapeHtml(item) + '" target="_blank" rel="noreferrer">截图 ' + (index + 1) + "</a>").join("") + "</div>";
}

function renderEvidence(paths) {
  if (!paths.length) return '<p class="empty">未引用截图证据。</p>';
  const figures = paths.map((item, index) => {
    return [
      '        <figure class="evidence-figure">',
      '          <a href="' + escapeHtml(item) + '" target="_blank" rel="noreferrer"><img src="' + escapeHtml(item) + '" alt="测试证据 ' + (index + 1) + '" loading="lazy"></a>',
      "          <figcaption>" + escapeHtml(item) + "</figcaption>",
      "        </figure>"
    ].join("\n");
  }).join("\n");
  return '      <div class="gallery">\n' + figures + "\n      </div>";
}
