const STORAGE_KEY = "lifeos_v13_entries";
const WR_STORAGE_KEY = "lifeos_v13_wr_entries";
const PATCH_STORAGE_KEY = "lifeos_v13_patch_entries";
const BACKUP_VERSION = "1.0";
const CODE_ORDER = ["S", "T", "P"];

const ruinCodeConfig = {
  S: {
    label: "Sleep",
    risk: "睡眠红灯会直接打断执行力，第二天高概率失控。",
    defense: "手机不进卧室（物理隔离），当天不加码任务。",
    bSteps: [
      "把手机和充电器移出卧室（立刻完成）。",
      "设置明早唯一 5 分钟动作并写在便签上。",
      "今天只做这个最小动作，不追加任务。"
    ]
  },
  T: {
    label: "Trading",
    risk: "交易违规会放大波动并破坏资金曲线。",
    defense: "当日不交易；若必须交易：风险<=0.5% + 强制止损 + 禁止加仓摊平。",
    bSteps: [
      "当日默认不交易，先退出交易界面。",
      "写 5 分钟违规复盘：违规点 -> 代价 -> 下次规则。",
      "把明日交易权限绑定到“先看复盘再开仓”。"
    ]
  },
  P: {
    label: "Priority Drop",
    risk: "关键任务掉线会让长期目标持续滑坡。",
    defense: "把关键任务切成 <=5 分钟启动动作，只交付一小块。",
    bSteps: [
      "把唯一关键任务切成 <=5 分钟启动动作。",
      "只交付“一小块”（标题+3要点 / 一封关键邮件 / 下一步清单）。",
      "取消今天所有非关键任务。"
    ]
  }
};

const defaultExperimentPool = [
  "晨间固定锚点：洗漱后立刻做最小行动（>=5天）",
  "晚间固定锚点：睡前提交 DL-30（>=5天）",
  "每日 15 分钟写作推进（>=5天）",
  "每日 15 分钟快走/有氧（>=5天）"
];

let latestOutputText = "";
let latestWrOutputText = "";
let latestPatchOutputText = "";
let latestPlaybookOutputText = "";
let latestDojoOutputText = "";
let latestDojoStarterText = "";

const el = {
  form: document.getElementById("dlForm"),
  date: document.getElementById("date"),
  ruinCodesWrap: document.getElementById("ruinCodesWrap"),
  yesterdayBTitle: document.getElementById("yesterdayBTitle"),
  yesterdayBText: document.getElementById("yesterdayBText"),
  output: document.getElementById("output"),
  scoreboard: document.getElementById("scoreboard"),
  history: document.getElementById("history"),
  copyDl: document.getElementById("copyDl"),
  copyOutput: document.getElementById("copyOutput"),
  quickZeroDay: document.getElementById("quickZeroDay"),
  historyItemTpl: document.getElementById("historyItemTpl"),

  wrForm: document.getElementById("wrForm"),
  wrWeekRange: document.getElementById("wrWeekRange"),
  wrOutput: document.getElementById("wrOutput"),
  wrAutofill: document.getElementById("wrAutofill"),
  copyWrOutput: document.getElementById("copyWrOutput"),
  wrDlDone: document.getElementById("wrDlDone"),
  wrBDone: document.getElementById("wrBDone"),
  wrRuinDays: document.getElementById("wrRuinDays"),
  wrCodeS: document.getElementById("wrCodeS"),
  wrCodeT: document.getElementById("wrCodeT"),
  wrCodeP: document.getElementById("wrCodeP"),
  wrSleepPass: document.getElementById("wrSleepPass"),
  wrTrainingPass: document.getElementById("wrTrainingPass"),
  wrOutputPass: document.getElementById("wrOutputPass"),

  patchForm: document.getElementById("patchForm"),
  patchStartDate: document.getElementById("patchStartDate"),
  patchOutput: document.getElementById("patchOutput"),
  copyPatchOutput: document.getElementById("copyPatchOutput"),

  playbookMonth: document.getElementById("playbookMonth"),
  playbookOutput: document.getElementById("playbookOutput"),
  buildPlaybook: document.getElementById("buildPlaybook"),
  copyPlaybook: document.getElementById("copyPlaybook"),

  dojoForm: document.getElementById("dojoForm"),
  dojoOutput: document.getElementById("dojoOutput"),
  copyDojoStarter: document.getElementById("copyDojoStarter"),
  copyDojoOutput: document.getElementById("copyDojoOutput"),

  exportJson: document.getElementById("exportJson"),
  exportCsv: document.getElementById("exportCsv"),
  exportMd: document.getElementById("exportMd"),
  importFile: document.getElementById("importFile"),
  importData: document.getElementById("importData"),
  dataOutput: document.getElementById("dataOutput")
};

init();

function init() {
  const now = new Date();

  if (el.date) {
    el.date.value = localDateISO(now);
  }

  if (el.patchStartDate) {
    el.patchStartDate.value = localDateISO(now);
  }

  if (el.wrWeekRange && !el.wrWeekRange.value) {
    el.wrWeekRange.value = defaultWeekRange(now);
  }

  if (el.playbookMonth) {
    el.playbookMonth.value = localMonthISO(now);
  }

  bindEvents();
  renderAll(loadEntries());
  renderWorkflowPanels();
  renderYesterdayBContext();
}

function bindEvents() {
  if (el.form) {
    el.form.addEventListener("submit", onSubmit);
  }

  if (el.date) {
    el.date.addEventListener("change", renderYesterdayBContext);
  }

  if (el.quickZeroDay) {
    el.quickZeroDay.addEventListener("click", onZeroDay);
  }

  if (el.copyDl) {
    el.copyDl.addEventListener("click", () => {
      copyWithFeedback(buildDlText(getFormData()), el.copyDl, "复制 DL-30");
    });
  }

  if (el.copyOutput) {
    el.copyOutput.addEventListener("click", () => {
      if (!latestOutputText) {
        alert("先提交一次 DL-30，才有可复制的 A/B/C/D 输出。");
        return;
      }
      copyWithFeedback(latestOutputText, el.copyOutput, "复制 A/B/C/D");
    });
  }

  const ruinRadios = document.querySelectorAll("input[name='ruin']");
  ruinRadios.forEach((radio) => radio.addEventListener("change", toggleRuinCodes));
  toggleRuinCodes();

  if (el.wrForm) {
    el.wrForm.addEventListener("submit", onWrSubmit);
  }

  if (el.wrAutofill) {
    el.wrAutofill.addEventListener("click", onWrAutofill);
  }

  if (el.copyWrOutput) {
    el.copyWrOutput.addEventListener("click", () => {
      if (!latestWrOutputText) {
        alert("先生成一次 WR-10 结果。");
        return;
      }
      copyWithFeedback(latestWrOutputText, el.copyWrOutput, "复制 WR-10");
    });
  }

  if (el.patchForm) {
    el.patchForm.addEventListener("submit", onPatchSubmit);
  }

  if (el.copyPatchOutput) {
    el.copyPatchOutput.addEventListener("click", () => {
      if (!latestPatchOutputText) {
        alert("先生成一次 Patch 规则。");
        return;
      }
      copyWithFeedback(latestPatchOutputText, el.copyPatchOutput, "复制 Patch");
    });
  }

  if (el.buildPlaybook) {
    el.buildPlaybook.addEventListener("click", onBuildPlaybook);
  }

  if (el.copyPlaybook) {
    el.copyPlaybook.addEventListener("click", () => {
      if (!latestPlaybookOutputText) {
        alert("先生成一次 Playbook 草案。");
        return;
      }
      copyWithFeedback(latestPlaybookOutputText, el.copyPlaybook, "复制 Playbook");
    });
  }

  if (el.dojoForm) {
    el.dojoForm.addEventListener("submit", onDojoSubmit);
  }

  if (el.copyDojoStarter) {
    el.copyDojoStarter.addEventListener("click", () => {
      const data = getDojoData();
      if (!data.scene || !data.goal || !data.constraint) {
        alert("先填写场景、目标、约束，再复制启动语句。");
        return;
      }
      latestDojoStarterText = `开始训练：场景=${data.scene} 目标=${data.goal} 约束=${data.constraint}`;
      copyWithFeedback(latestDojoStarterText, el.copyDojoStarter, "复制启动语句");
    });
  }

  if (el.copyDojoOutput) {
    el.copyDojoOutput.addEventListener("click", () => {
      if (!latestDojoOutputText) {
        alert("先生成一次 Dojo 训练脚本。");
        return;
      }
      copyWithFeedback(latestDojoOutputText, el.copyDojoOutput, "复制训练脚本");
    });
  }

  if (el.exportJson) {
    el.exportJson.addEventListener("click", onExportJson);
  }

  if (el.exportCsv) {
    el.exportCsv.addEventListener("click", onExportCsv);
  }

  if (el.exportMd) {
    el.exportMd.addEventListener("click", onExportMarkdown);
  }

  if (el.importData) {
    el.importData.addEventListener("click", onImportData);
  }
}

function onSubmit(event) {
  event.preventDefault();
  const entry = getFormData();

  if (entry.ruin === 1 && entry.ruinCodes.length === 0) {
    alert("RUIN=1 时，请至少勾选一个 RUIN 码（S/T/P）。");
    return;
  }

  const entries = loadEntries();
  const output = buildLifeOSOutput(entry);
  entry.output = output;
  entry.createdAt = new Date().toISOString();

  const nextEntries = upsertEntryByDate(entries, entry);
  saveEntries(nextEntries);
  renderAll(nextEntries, output);
  renderYesterdayBContext();
}

function onZeroDay() {
  const entry = getFormData();

  if (!entry.behavior || !entry.result) {
    alert("Zero-Day 至少填写“行为”和“结果”两项。");
    return;
  }

  entry.zeroDay = true;
  entry.intent = "";
  entry.ruinCodes = entry.ruin === 1 ? entry.ruinCodes : [];
  if (entry.ruin === 1 && entry.ruinCodes.length === 0) {
    entry.ruinCodes = ["P"];
  }

  const entries = loadEntries();
  const output = buildLifeOSOutput(entry);
  entry.output = output;
  entry.createdAt = new Date().toISOString();

  const nextEntries = upsertEntryByDate(entries, entry);
  saveEntries(nextEntries);
  renderAll(nextEntries, output);
  renderYesterdayBContext();
}

function onWrSubmit(event) {
  event.preventDefault();
  const data = getWrData();

  const outputText = buildWrOutput(data);
  latestWrOutputText = outputText;
  setModuleOutput(el.wrOutput, outputText, "提交 WR-10 后显示周总结与下周执行稿");

  const entries = loadCollection(WR_STORAGE_KEY);
  const entry = {
    ...data,
    outputText,
    createdAt: new Date().toISOString()
  };

  const next = upsertByKey(entries, entry, "weekRange");
  saveCollection(WR_STORAGE_KEY, next);
}

function onWrAutofill() {
  const snapshot = getScoreSnapshot(loadEntries());

  if (!snapshot.hasData) {
    alert("近7天还没有 DL 数据，先提交至少一天 DL-30 再自动带入。");
    return;
  }

  if (el.wrDlDone) {
    el.wrDlDone.value = String(snapshot.dl);
  }
  if (el.wrBDone) {
    el.wrBDone.value = String(snapshot.b);
  }
  if (el.wrRuinDays) {
    el.wrRuinDays.value = String(snapshot.ruinDays);
  }
  if (el.wrCodeS) {
    el.wrCodeS.value = String(snapshot.codeCount.S);
  }
  if (el.wrCodeT) {
    el.wrCodeT.value = String(snapshot.codeCount.T);
  }
  if (el.wrCodeP) {
    el.wrCodeP.value = String(snapshot.codeCount.P);
  }
  if (el.wrSleepPass) {
    el.wrSleepPass.checked = snapshot.sleepPass === 1;
  }
  if (el.wrTrainingPass) {
    el.wrTrainingPass.checked = snapshot.trainingPass === 1;
  }
  if (el.wrOutputPass) {
    el.wrOutputPass.checked = snapshot.outputPass === 1;
  }
}

function onPatchSubmit(event) {
  event.preventDefault();
  const data = getPatchData();

  const outputText = buildPatchOutput(data);
  latestPatchOutputText = outputText;
  setModuleOutput(el.patchOutput, outputText, "提交 System Patch 后显示新规则（<=3条）");

  const entries = loadCollection(PATCH_STORAGE_KEY);
  entries.unshift({
    ...data,
    outputText,
    createdAt: new Date().toISOString()
  });
  saveCollection(PATCH_STORAGE_KEY, entries.slice(0, 30));
}

function onBuildPlaybook() {
  const month = el.playbookMonth?.value || localMonthISO(new Date());
  const outputText = buildPlaybookOutput(month);
  latestPlaybookOutputText = outputText;
  setModuleOutput(el.playbookOutput, outputText, "点击“生成 Playbook v1 草案”后显示");
}

function onDojoSubmit(event) {
  event.preventDefault();
  const data = getDojoData();

  if (!data.scene || !data.goal || !data.constraint) {
    alert("请完整填写场景、目标、约束。");
    return;
  }

  const outputText = buildDojoOutput(data);
  latestDojoStarterText = `开始训练：场景=${data.scene} 目标=${data.goal} 约束=${data.constraint}`;
  latestDojoOutputText = outputText;
  setModuleOutput(el.dojoOutput, outputText, "提交场景后显示 Dojo 5轮脚本 + 评分规则");
}

function onExportJson() {
  const backup = buildBackupPayload();
  const text = JSON.stringify(backup, null, 2);
  const filename = `lifeos-backup-${localDateISO(new Date())}.json`;

  downloadFile(filename, text, "application/json;charset=utf-8");
  setModuleOutput(el.dataOutput, `已导出 JSON：${filename}`, "导出/导入结果会显示在这里");
}

function onExportCsv() {
  const csv = buildCsvExport();
  const filename = `lifeos-backup-${localDateISO(new Date())}.csv`;

  downloadFile(filename, csv, "text/csv;charset=utf-8");
  setModuleOutput(el.dataOutput, `已导出 CSV：${filename}`, "导出/导入结果会显示在这里");
}

function onExportMarkdown() {
  const markdown = buildMarkdownExport();
  const filename = `lifeos-backup-${localDateISO(new Date())}.md`;

  downloadFile(filename, markdown, "text/markdown;charset=utf-8");
  setModuleOutput(el.dataOutput, `已导出 Markdown：${filename}`, "导出/导入结果会显示在这里");
}

async function onImportData() {
  const file = el.importFile?.files?.[0];
  if (!file) {
    alert("先选择一个 JSON 备份文件。");
    return;
  }

  const ok = confirm("导入会覆盖当前本地数据（DL/WR/Patch）。确认继续？");
  if (!ok) {
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const data = parsed?.data || parsed;

    const dailyLogs = ensureArray(data.dailyLogs);
    const weeklyReviews = ensureArray(data.weeklyReviews);
    const systemPatches = ensureArray(data.systemPatches);

    saveEntries(dailyLogs);
    saveCollection(WR_STORAGE_KEY, weeklyReviews);
    saveCollection(PATCH_STORAGE_KEY, systemPatches);

    renderAll(loadEntries());
    renderWorkflowPanels();
    renderYesterdayBContext();

    const summary = [
      `导入成功：${file.name}`,
      `DL：${dailyLogs.length} 条`,
      `WR：${weeklyReviews.length} 条`,
      `Patch：${systemPatches.length} 条`
    ].join(" | ");
    setModuleOutput(el.dataOutput, summary, "导出/导入结果会显示在这里");
  } catch (error) {
    setModuleOutput(
      el.dataOutput,
      `导入失败：${String(error?.message || error)}`,
      "导出/导入结果会显示在这里"
    );
  }
}

function getFormData() {
  const fd = new FormData(el.form);
  const ruinCodes = fd.getAll("ruinCodes").filter(Boolean);

  return {
    date: String(fd.get("date") || "").trim(),
    behavior: String(fd.get("behavior") || "").trim(),
    result: String(fd.get("result") || "").trim(),
    bExecuted: Number(fd.get("bExecuted") || 0),
    ruin: Number(fd.get("ruin") || 0),
    ruinCodes,
    intent: String(fd.get("intent") || "").trim(),
    sleepHours: toNumber(fd.get("sleepHours")),
    trainingMinutes: toNumber(fd.get("trainingMinutes")),
    deepWorkMinutes: toNumber(fd.get("deepWorkMinutes")),
    outputWords: toNumber(fd.get("outputWords"))
  };
}

function getWrData() {
  const fd = new FormData(el.wrForm);
  return {
    weekRange: String(fd.get("wrWeekRange") || "").trim(),
    bestAction: String(fd.get("wrBestAction") || "").trim(),
    worstLeak: String(fd.get("wrWorstLeak") || "").trim(),
    ifThen: String(fd.get("wrIfThen") || "").trim(),
    priority: String(fd.get("wrPriority") || "").trim(),
    expName: String(fd.get("wrExpName") || "").trim(),
    expHypothesis: String(fd.get("wrExpHypothesis") || "").trim(),
    expAction: String(fd.get("wrExpAction") || "").trim(),
    expMetric: String(fd.get("wrExpMetric") || "").trim(),
    oneChange: String(fd.get("wrOneChange") || "").trim(),
    dlDone: toInt(fd.get("wrDlDone"), 0),
    bDone: toInt(fd.get("wrBDone"), 0),
    ruinDays: toInt(fd.get("wrRuinDays"), 0),
    codeS: toInt(fd.get("wrCodeS"), 0),
    codeT: toInt(fd.get("wrCodeT"), 0),
    codeP: toInt(fd.get("wrCodeP"), 0),
    sleepPass: fd.get("wrSleepPass") ? 1 : 0,
    trainingPass: fd.get("wrTrainingPass") ? 1 : 0,
    outputPass: fd.get("wrOutputPass") ? 1 : 0
  };
}

function getPatchData() {
  const fd = new FormData(el.patchForm);
  return {
    bottleneck: String(fd.get("patchBottleneck") || "").trim(),
    breakPoint: String(fd.get("patchBreak") || "").trim(),
    fix: String(fd.get("patchFix") || "").trim(),
    startDate: String(fd.get("patchStartDate") || "").trim()
  };
}

function getDojoData() {
  const fd = new FormData(el.dojoForm);
  return {
    scene: String(fd.get("dojoScene") || "").trim(),
    goal: String(fd.get("dojoGoal") || "").trim(),
    constraint: String(fd.get("dojoConstraint") || "").trim()
  };
}

function buildLifeOSOutput(entry) {
  const mode = buildMode(entry);
  const b = buildAction(entry);
  const riskLine = buildRisk(entry);
  const tailBet = buildTailBet(entry);

  const lines = [
    "A) 模式判断",
    `${mode}`,
    "",
    `B) 明日最小行动（${entry.ruin === 1 ? "<=5min" : "<=15min"}）`,
    ...b.map((step, i) => `${i + 1}. ${step}`),
    "",
    "C) 风险点 + 1条防线",
    `风险点：${riskLine.risk}`,
    `防线：${riskLine.defense}`,
    "",
    "D) tail bet（可选）",
    `${tailBet}`
  ];

  latestOutputText = lines.join("\n");

  return {
    mode,
    b,
    risk: riskLine,
    tailBet,
    text: latestOutputText
  };
}

function buildMode(entry) {
  if (entry.ruin === 1) {
    const codeText = entry.ruinCodes.length ? `（${entry.ruinCodes.join(",")}）` : "";
    return `红灯模式${codeText}：先防崩，再谈推进。今天按底线动作执行，不加码。`;
  }

  if (entry.bExecuted === 1) {
    return "稳态推进模式：闭环在工作，继续低摩擦重复最小行动。";
  }

  return "重启模式：昨天中断不追责，今天先用一个最小动作恢复节奏。";
}

function buildAction(entry) {
  if (entry.ruin === 1) {
    const selectedCodes = normalizeRuinCodes(entry.ruinCodes);
    const mainCode = selectedCodes[0];

    if (mainCode && ruinCodeConfig[mainCode]) {
      const steps = [...ruinCodeConfig[mainCode].bSteps];
      const extraLines = selectedCodes
        .slice(1)
        .map((code) => buildSupplementRuinStep(code))
        .filter(Boolean);
      return [...steps, ...extraLines];
    }

    return [
      "把今天目标缩到 5 分钟以内。",
      "只做一个关键动作，不追加任务。",
      "做完后马上记录一句结果。"
    ];
  }

  if (entry.intent) {
    return [
      `打开与“${entry.intent}”直接相关的唯一页面或文件。`,
      "计时 15 分钟，只交付一小块可见结果。",
      "结束后写一句“今天完成了什么”，用于明天 DL-30。"
    ];
  }

  return [
    "默认B（意图为空，按 Output > Training > Input control）：选择 Output。",
    "计时 15 分钟，完成“标题+3要点”或最小可交付草稿。",
    "写下一句结果，明天继续同一块，不开新战线。"
  ];
}

function buildRisk(entry) {
  if (entry.ruin === 1) {
    return buildRuinRiskAndDefense(entry.ruinCodes);
  }

  if (entry.bExecuted === 0) {
    return {
      risk: "若继续不执行 B，容易触发连续失败并断更。",
      defense: "固定早间锚点：洗漱后立刻开始 B 的第一步（先做 2 分钟）。"
    };
  }

  return {
    risk: "状态好时容易加码，明天反而掉线。",
    defense: "明天只做同强度最小行动，不增加新任务。"
  };
}

function buildTailBet(entry) {
  if (entry.ruin === 1) {
    return "完成 B 后再补 2 分钟，记录“防线是否生效 + 明天保持哪条规则”。";
  }

  if (entry.intent) {
    return "完成 B 后可选加 5 分钟，把下一步材料提前打开并写一行提示。";
  }

  return "完成 B 后可选加 5 分钟，把 Output 从“标题+3要点”扩成一个短段落。";
}

function buildRuinRiskAndDefense(codes) {
  const selectedCodes = normalizeRuinCodes(codes);
  const primary = selectedCodes[0];

  if (!primary || !ruinCodeConfig[primary]) {
    return {
      risk: "红灯信号未码化会导致防线执行不稳定。",
      defense: "先按 P 防线执行：关键任务切成 <=5 分钟启动动作。"
    };
  }

  if (selectedCodes.length === 1) {
    return {
      risk: ruinCodeConfig[primary].risk,
      defense: ruinCodeConfig[primary].defense
    };
  }

  const defenseLines = selectedCodes.map((code) => `${code}：${ruinCodeConfig[code].defense}`);
  return {
    risk: `多重红灯（${selectedCodes.join(",")}）会叠加失控风险，必须先执行全部默认防线。`,
    defense: defenseLines.join("；")
  };
}

function normalizeRuinCodes(codes) {
  return CODE_ORDER.filter((code) => Array.isArray(codes) && codes.includes(code));
}

function buildSupplementRuinStep(code) {
  if (code === "S") {
    return "追加防线：今晚手机不进卧室，并把明日任务锁定为单一动作。";
  }
  if (code === "T") {
    return "追加防线：当日默认不交易；若必须交易，风险<=0.5%且强制止损。";
  }
  if (code === "P") {
    return "追加防线：关键任务只允许提交一小块，不处理非关键任务。";
  }
  return "";
}

function buildWrOutput(data) {
  const score = {
    dl: clamp(data.dlDone, 0, 7),
    b: clamp(data.bDone, 0, 7),
    ruinDays: clamp(data.ruinDays, 0, 7),
    codeCount: {
      S: clamp(data.codeS, 0, 7),
      T: clamp(data.codeT, 0, 7),
      P: clamp(data.codeP, 0, 7)
    },
    sleepPass: data.sleepPass ? 1 : 0,
    trainingPass: data.trainingPass ? 1 : 0,
    outputPass: data.outputPass ? 1 : 0
  };

  const mechanism = inferMechanism(score.dl, score.b, score.ruinDays, score.codeCount, score.outputPass);
  const nextChange = data.oneChange || inferNextChange(score.dl, score.b, score.codeCount);

  const weeklyMode = score.ruinDays >= 2
    ? "本周进入红灯偏高区：下周必须先保底线，再追求推进速度。"
    : "本周处于可推进区：保持小步高频，避免加码过度。";

  const riskDefense = score.ruinDays >= 2
    ? "风险点：红灯频率偏高会导致节奏崩盘。防线：下周前3天只跑<=15分钟最小行动，不开新目标。"
    : "风险点：追求完美会拖慢执行。防线：每天只交付一小块，可见即可。";

  const lines = [
    `WR-10 | ${data.weekRange}`,
    `1) 本周最有效动作：${data.bestAction}`,
    `2) 本周最大浪费/失控：${data.worstLeak}`,
    `3) 本周模式：${data.ifThen}`,
    `4) 下周唯一优先事项：${data.priority}`,
    "5) 下周唯一实验（7天）",
    `- 实验名：${data.expName}`,
    `- 假设：${data.expHypothesis}`,
    `- 最小动作：${data.expAction}`,
    `- 成功标准：${data.expMetric}`,
    `6) 下周唯一改动：${nextChange}`,
    "",
    "[Scoreboard-5 v1.3]",
    `DL完成 ${score.dl}/7 | B执行 ${score.b}/7 | 红灯天数 ${score.ruinDays}/7（主码：S${score.codeCount.S} T${score.codeCount.T} P${score.codeCount.P}）`,
    `Sleep底线 ${score.sleepPass}/1 | Training ${score.trainingPass}/1 | Output ${score.outputPass}/1`,
    `机制一句话：本周主要被 ${mechanism} 驱动`,
    `下周唯一改动：只改 ${nextChange}`,
    "",
    "A) 模式判断",
    weeklyMode,
    "",
    "B) 下周最小执行稿（每天<=15min）",
    `1. 固定锚点：先做“${data.expAction}”再处理其他事务。`,
    `2. 只围绕“${data.priority}”推进一小块可见结果。`,
    "3. 每晚用 DL-30 记录行为、结果、B执行。",
    "",
    "C) 风险点 + 1条防线",
    riskDefense,
    "",
    "D) tail bet（可选）",
    "每完成 3 天实验，加 5 分钟复盘“最有效动作为何有效”，写进下周沿用清单。"
  ];

  return lines.join("\n");
}

function buildPatchOutput(data) {
  const rules = [
    `规则1：优先改这一处 -> ${data.fix}`,
    `规则2：若再次出现“${data.breakPoint}”，立即降级到 5 分钟版本，不硬扛。`,
    `规则3：从 ${data.startDate} 起连续执行 14 天，期间禁止新增第二个改动。`
  ];

  return [
    `System Patch | 从 ${data.startDate} 开始`,
    `1) 系统最卡的点：${data.bottleneck}`,
    `2) 最常断点：${data.breakPoint}`,
    `3) 减摩擦改动：${data.fix}`,
    "4) 新规则（<=3条）",
    ...rules.map((rule, i) => `${i + 1}. ${rule}`),
    "",
    "执行提醒：如果 3 天后仍卡住，继续只改一处，不要扩容改动范围。"
  ].join("\n");
}

function buildPlaybookOutput(month) {
  const wrEntries = loadCollection(WR_STORAGE_KEY);
  const dailyEntries = loadEntries();
  const patchEntries = loadCollection(PATCH_STORAGE_KEY);

  const wrInMonth = wrEntries.filter((item) => inMonth(item.createdAt, month));
  const dailyInMonth = dailyEntries.filter((item) => String(item.date || "").startsWith(month));
  const patchInMonth = patchEntries.filter((item) => inMonth(item.createdAt, month));

  const actionCounter = new Map();
  const triggerCounter = new Map();
  const experimentLines = [];

  wrInMonth.forEach((entry) => {
    pushCount(actionCounter, entry.bestAction);
    pushCount(actionCounter, entry.priority);
    pushCount(actionCounter, entry.expAction);

    pushCount(triggerCounter, entry.worstLeak);
    pushCount(triggerCounter, entry.ifThen);

    if (entry.expName && entry.expAction && entry.expMetric) {
      experimentLines.push(`[EXP:${entry.expName}] 行动：${entry.expAction} | 指标：${entry.expMetric}`);
    }
  });

  dailyInMonth.forEach((entry) => {
    pushCount(actionCounter, entry.behavior);

    if (entry.bExecuted === 0) {
      pushCount(triggerCounter, "B未执行（执行摩擦）");
    }

    (entry.ruinCodes || []).forEach((code) => {
      if (code === "S") {
        pushCount(triggerCounter, "睡眠红灯（S）");
      }
      if (code === "T") {
        pushCount(triggerCounter, "交易违规（T）");
      }
      if (code === "P") {
        pushCount(triggerCounter, "关键任务掉线（P）");
      }
    });
  });

  const topActions = topNFromCounter(actionCounter, 10);
  const topTriggers = topNFromCounter(triggerCounter, 10);

  const antiRuinRules = [
    "红灯日默认不加码，只执行 <=5 分钟最小动作。",
    "Sleep红灯：手机不进卧室，次日只做一个关键动作。",
    "Trading红灯：默认不交易；若必须交易，风险<=0.5%且强制止损。",
    "Priority红灯：任务切成 <=5 分钟启动动作，只交付一小块。",
    "连续2天失败立即降级，不做情绪补偿性加码。"
  ];

  patchInMonth.slice(0, 3).forEach((patch) => {
    antiRuinRules.push(`Patch沿用：${patch.fix}`);
  });

  const mergedExperiments = dedupe([...experimentLines, ...defaultExperimentPool]).slice(0, 10);

  return [
    `Playbook v1 | Month of ${month}`,
    `样本：WR ${wrInMonth.length} 条 | DL ${dailyInMonth.length} 条 | Patch ${patchInMonth.length} 条`,
    "",
    "1) Top 10 高收益动作",
    ...toListOrFallback(topActions, "本月 WR 样本不足，先延用：每天固定 15 分钟单点输出。"),
    "",
    "2) Top 10 高频触发器/坑",
    ...toListOrFallback(topTriggers, "本月触发器样本不足，先重点盯：晚睡与任务过大。"),
    "",
    "3) Anti-ruin rules",
    ...antiRuinRules.slice(0, 10).map((item) => `- ${item}`),
    "",
    "4) 实验库（7天，<=15分钟/天）",
    ...mergedExperiments.map((item) => `- ${item}`)
  ].join("\n");
}

function buildDojoOutput(data) {
  const starter = `开始训练：场景=${data.scene} 目标=${data.goal} 约束=${data.constraint}`;
  latestDojoStarterText = starter;

  const rounds = [
    `Round 1｜基线开场\n对手问：先用 30 秒讲清你在“${data.scene}”里要达成什么结果？`,
    `Round 2｜压力追问\n对手问：如果我质疑你的核心观点，你如何在“${data.constraint}”下继续推进？`,
    "Round 3｜资源受限\n对手问：现在只给你一个动作机会，你会做什么，为什么是这个？",
    "Round 4｜冲突升级\n对手问：对方明显不配合时，你如何不升级冲突但继续推进？",
    "Round 5｜收尾锁定\n对手问：请用一句话给出明确下一步和时间点。"
  ];

  return [
    "Dojo 5轮训练脚本",
    `场景：${data.scene}`,
    `目标：${data.goal}`,
    `约束：${data.constraint}`,
    "",
    `启动语句：${starter}`,
    "",
    ...rounds,
    "",
    "每轮评分（1-10）：清晰度 | 逻辑 | 情绪稳定 | 推进性",
    "每轮复盘：只给 3 条改进 + 1 句更强替换说法"
  ].join("\n\n");
}

function toggleRuinCodes() {
  const ruin = Number(document.querySelector("input[name='ruin']:checked")?.value || 0);
  if (ruin === 1) {
    el.ruinCodesWrap.classList.remove("hidden");
    return;
  }

  el.ruinCodesWrap.classList.add("hidden");
  document.querySelectorAll("input[name='ruinCodes']").forEach((box) => {
    box.checked = false;
  });
}

function renderAll(entries, outputObj) {
  const output = outputObj || entries[0]?.output;

  if (output?.text) {
    el.output.textContent = output.text;
    el.output.classList.remove("empty");
    latestOutputText = output.text;
  } else {
    el.output.textContent = "提交 DL-30 后显示 A/B/C/D";
    el.output.classList.add("empty");
    latestOutputText = "";
  }

  el.scoreboard.textContent = buildScoreboard(entries);
  renderHistory(entries);
}

function renderWorkflowPanels() {
  const wrEntries = loadCollection(WR_STORAGE_KEY);
  const patchEntries = loadCollection(PATCH_STORAGE_KEY);

  if (wrEntries[0]?.outputText) {
    latestWrOutputText = wrEntries[0].outputText;
    setModuleOutput(el.wrOutput, latestWrOutputText, "提交 WR-10 后显示周总结与下周执行稿");
  }

  if (patchEntries[0]?.outputText) {
    latestPatchOutputText = patchEntries[0].outputText;
    setModuleOutput(el.patchOutput, latestPatchOutputText, "提交 System Patch 后显示新规则（<=3条）");
  }
}

function renderYesterdayBContext() {
  if (!el.yesterdayBTitle || !el.yesterdayBText || !el.date) {
    return;
  }

  const selectedDate = el.date.value || localDateISO(new Date());
  const previousDate = shiftDateISO(selectedDate, -1);
  const previousEntry = loadEntries().find((item) => item.date === previousDate);

  if (!previousEntry) {
    el.yesterdayBTitle.textContent = `昨日系统B（${previousDate}）：暂无记录`;
    el.yesterdayBText.textContent = "先提交至少一天 DL-30，系统会在这里自动回填“昨天生成的B步骤”。";
    return;
  }

  const steps = Array.isArray(previousEntry.output?.b) ? previousEntry.output.b : [];
  if (steps.length === 0) {
    el.yesterdayBTitle.textContent = `昨日系统B（${previousDate}）：有记录但无步骤`;
    el.yesterdayBText.textContent = previousEntry.output?.text || "昨天没有可解析的 B 步骤，请手动回忆后选择 0/1。";
    return;
  }

  const lines = [
    ...steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    `昨日行为：${previousEntry.behavior || "-"}`,
    `昨日结果：${previousEntry.result || "-"}`
  ];
  el.yesterdayBTitle.textContent = `昨日系统B（${previousDate}）：请按这条B选择 0/1`;
  el.yesterdayBText.textContent = lines.join("\n");
}

function buildScoreboard(entries) {
  const snap = getScoreSnapshot(entries);

  return [
    `DL完成 ${snap.dl}/7 | B执行 ${snap.b}/7 | 红灯天数 ${snap.ruinDays}/7（主码：S${snap.codeCount.S} T${snap.codeCount.T} P${snap.codeCount.P}）`,
    `Sleep底线 ${snap.sleepPass}/1 | Training ${snap.trainingPass}/1 | Output ${snap.outputPass}/1`,
    `机制一句话：本周主要被 ${snap.mechanism} 驱动`,
    `下周唯一改动：只改 ${snap.nextChange}`
  ].join("\n");
}

function getScoreSnapshot(entries) {
  const recent = getRecentEntries(entries, 7);
  const dl = recent.length;
  const b = recent.filter((item) => item.bExecuted === 1).length;
  const ruinDays = recent.filter((item) => item.ruin === 1).length;

  const codeCount = { S: 0, T: 0, P: 0 };
  for (const item of recent) {
    for (const code of item.ruinCodes || []) {
      if (codeCount[code] !== undefined) {
        codeCount[code] += 1;
      }
    }
  }

  const sleepGoodDays = recent.filter((item) => Number(item.sleepHours) >= 7).length;
  const sleepPass = sleepGoodDays >= 5 ? 1 : 0;

  const trainingTotal = sumBy(recent, "trainingMinutes");
  const trainingPass = trainingTotal >= 150 ? 1 : 0;

  const deepWorkTotal = sumBy(recent, "deepWorkMinutes");
  const outputWordTotal = sumBy(recent, "outputWords");
  const outputPass = deepWorkTotal >= 300 || outputWordTotal >= 800 ? 1 : 0;

  const mechanism = inferMechanism(dl, b, ruinDays, codeCount, outputPass);
  const nextChange = inferNextChange(dl, b, codeCount);

  return {
    hasData: dl > 0,
    dl,
    b,
    ruinDays,
    codeCount,
    sleepPass,
    trainingPass,
    outputPass,
    mechanism,
    nextChange
  };
}

function inferMechanism(dl, b, ruinDays, codeCount, outputPass) {
  if (ruinDays >= 2) {
    if (codeCount.S >= codeCount.T && codeCount.S >= codeCount.P) {
      return "睡眠红灯";
    }
    if (codeCount.T >= codeCount.S && codeCount.T >= codeCount.P) {
      return "交易纪律波动";
    }
    return "关键任务掉线";
  }

  if (dl > 0 && b / dl < 0.7) {
    return "执行摩擦";
  }

  if (outputPass === 1) {
    return "稳定小步输出";
  }

  return "惯性节律";
}

function inferNextChange(dl, b, codeCount) {
  if (codeCount.T > 0) {
    return "红灯日默认不交易";
  }
  if (codeCount.S > 0) {
    return "手机不进卧室";
  }
  if (codeCount.P > 0) {
    return "关键任务固定拆成 5 分钟启动动作";
  }
  if (dl > 0 && b < dl) {
    return "洗漱后立刻执行 B 的第一步";
  }
  return "维持当前最小行动，不加码";
}

function renderHistory(entries) {
  if (entries.length === 0) {
    el.history.textContent = "暂无记录";
    return;
  }

  const frag = document.createDocumentFragment();
  const list = entries.slice(0, 12);

  for (const item of list) {
    const node = el.historyItemTpl.content.firstElementChild.cloneNode(true);
    const ruinCodes = item.ruinCodes?.length ? item.ruinCodes.join(",") : "-";

    node.querySelector(".history-meta").textContent = `${item.date} | B=${item.bExecuted} | RUIN=${item.ruin} | 码=${ruinCodes}`;
    node.querySelector(".history-text").textContent = `行为：${item.behavior} | 结果：${item.result}`;
    frag.appendChild(node);
  }

  el.history.innerHTML = "";
  el.history.appendChild(frag);
}

function buildDlText(entry) {
  const ruinCodePart = entry.ruin === 1 ? `；码=${entry.ruinCodes.join(",") || "(未填)"}` : "";
  return [
    `DL-30 | ${entry.date || localDateISO(new Date())}`,
    `行为：${entry.behavior || ""}`,
    `结果：${entry.result || ""}`,
    `昨日B执行：${entry.bExecuted}`,
    `RUIN：${entry.ruin}${ruinCodePart}`,
    `明日意图：${entry.intent || ""}`
  ].join("\n");
}

function getRecentEntries(entries, days) {
  const dates = new Set();
  const today = new Date();

  for (let i = 0; i < days; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.add(localDateISO(date));
  }

  return entries.filter((item) => dates.has(item.date));
}

function upsertEntryByDate(entries, entry) {
  const next = entries.slice();
  const index = next.findIndex((item) => item.date === entry.date);

  if (index >= 0) {
    next[index] = entry;
  } else {
    next.push(entry);
  }

  next.sort((a, b) => {
    if (a.date === b.date) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    return b.date.localeCompare(a.date);
  });

  return next;
}

function upsertByKey(entries, entry, key) {
  const next = entries.slice();
  const index = next.findIndex((item) => item[key] === entry[key]);

  if (index >= 0) {
    next[index] = entry;
  } else {
    next.unshift(entry);
  }

  next.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return next;
}

function loadEntries() {
  return loadCollection(STORAGE_KEY);
}

function saveEntries(entries) {
  saveCollection(STORAGE_KEY, entries);
}

function loadCollection(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load collection", key, error);
    return [];
  }
}

function saveCollection(key, entries) {
  localStorage.setItem(key, JSON.stringify(entries));
}

function setModuleOutput(node, text, emptyMessage) {
  if (!node) {
    return;
  }

  if (!text) {
    node.textContent = emptyMessage;
    node.classList.add("empty");
    return;
  }

  node.textContent = text;
  node.classList.remove("empty");
}

function inMonth(iso, month) {
  if (!iso || !month) {
    return false;
  }
  return String(iso).slice(0, 7) === month;
}

function pushCount(counter, raw) {
  const key = normalizeLine(raw);
  if (!key) {
    return;
  }
  counter.set(key, (counter.get(key) || 0) + 1);
}

function normalizeLine(raw) {
  if (!raw) {
    return "";
  }
  return String(raw).replace(/\s+/g, " ").trim();
}

function topNFromCounter(counter, n) {
  return Array.from(counter.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0].localeCompare(b[0]);
      }
      return b[1] - a[1];
    })
    .slice(0, n)
    .map(([label, count]) => `- ${label}（出现${count}次）`);
}

function toListOrFallback(list, fallback) {
  if (list.length > 0) {
    return list;
  }
  return [`- ${fallback}`];
}

function dedupe(items) {
  return Array.from(new Set(items.filter(Boolean).map((item) => String(item).trim())));
}

function buildBackupPayload() {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    policy: {
      storage: "localStorage",
      autoUpload: false,
      note: "数据默认仅保存在当前浏览器，不自动上传服务器。"
    },
    data: {
      dailyLogs: loadEntries(),
      weeklyReviews: loadCollection(WR_STORAGE_KEY),
      systemPatches: loadCollection(PATCH_STORAGE_KEY)
    }
  };
}

function buildCsvExport() {
  const rows = [];
  rows.push(["recordType", "primaryKey", "payloadJson", "createdAt"]);

  loadEntries().forEach((entry) => {
    rows.push([
      "dailyLog",
      entry.date || "",
      JSON.stringify(entry),
      entry.createdAt || ""
    ]);
  });

  loadCollection(WR_STORAGE_KEY).forEach((entry) => {
    rows.push([
      "weeklyReview",
      entry.weekRange || "",
      JSON.stringify(entry),
      entry.createdAt || ""
    ]);
  });

  loadCollection(PATCH_STORAGE_KEY).forEach((entry) => {
    rows.push([
      "systemPatch",
      entry.startDate || "",
      JSON.stringify(entry),
      entry.createdAt || ""
    ]);
  });

  return rows.map((row) => row.map(toCsvCell).join(",")).join("\n");
}

function buildMarkdownExport() {
  const daily = loadEntries();
  const wr = loadCollection(WR_STORAGE_KEY);
  const patches = loadCollection(PATCH_STORAGE_KEY);

  const lines = [
    "# LifeOS 数据导出",
    "",
    `导出时间：${new Date().toISOString()}`,
    "数据策略：默认仅保存在当前浏览器（localStorage），此文件用于迁移备份。",
    "",
    "## Daily Logs"
  ];

  if (daily.length === 0) {
    lines.push("- 无");
  } else {
    daily.forEach((entry) => {
      lines.push(`- ${entry.date} | B=${entry.bExecuted} | RUIN=${entry.ruin} | 码=${(entry.ruinCodes || []).join(",") || "-"}`);
      lines.push(`  - 行为：${entry.behavior || "-"}`);
      lines.push(`  - 结果：${entry.result || "-"}`);
    });
  }

  lines.push("", "## Weekly Reviews");
  if (wr.length === 0) {
    lines.push("- 无");
  } else {
    wr.forEach((entry) => {
      lines.push(`- ${entry.weekRange || "-"} | 优先事项：${entry.priority || "-"}`);
      lines.push(`  - 有效动作：${entry.bestAction || "-"}`);
      lines.push(`  - 最大失控：${entry.worstLeak || "-"}`);
    });
  }

  lines.push("", "## System Patches");
  if (patches.length === 0) {
    lines.push("- 无");
  } else {
    patches.forEach((entry) => {
      lines.push(`- ${entry.startDate || "-"} | 改动：${entry.fix || "-"}`);
      lines.push(`  - 卡点：${entry.bottleneck || "-"}`);
      lines.push(`  - 断点：${entry.breakPoint || "-"}`);
    });
  }

  return lines.join("\n");
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function toCsvCell(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function downloadFile(filename, content, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toNumber(value) {
  if (value === null || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sumBy(list, key) {
  return list.reduce((sum, item) => {
    const value = Number(item[key]);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

function localDateISO(date) {
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function localMonthISO(date) {
  return localDateISO(date).slice(0, 7);
}

function shiftDateISO(dateISO, days) {
  if (!dateISO) {
    return localDateISO(new Date());
  }
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return localDateISO(new Date());
  }
  date.setDate(date.getDate() + days);
  return localDateISO(date);
}

function defaultWeekRange(baseDate) {
  const now = new Date(baseDate);
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return `Week of ${localDateISO(monday)} ~ ${localDateISO(sunday)}`;
}

async function copyWithFeedback(text, button, fallbackLabel) {
  const origin = button.textContent;
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "已复制";
    setTimeout(() => {
      button.textContent = origin;
    }, 1200);
  } catch {
    button.textContent = "复制失败";
    setTimeout(() => {
      button.textContent = fallbackLabel;
    }, 1200);
  }
}
