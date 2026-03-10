const STORAGE_KEY = "lifeos_v13_entries";
const WR_STORAGE_KEY = "lifeos_v13_wr_entries";
const PATCH_STORAGE_KEY = "lifeos_v13_patch_entries";
const APPLE_SYNC_META_KEY = "lifeos_v13_apple_sync_meta";
const SYNC_SETTINGS_KEY = "lifeos_v13_sync_settings";
const SYNC_FILENAME = "lifeos-sync.json";
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
  intent: document.getElementById("intent"),
  intentDefault: document.getElementById("intentDefault"),
  intentCarry: document.getElementById("intentCarry"),
  intentVoice: document.getElementById("intentVoice"),
  intentAi: document.getElementById("intentAi"),
  sleepHours: document.getElementById("sleepHours"),
  trainingMinutes: document.getElementById("trainingMinutes"),
  deepWorkMinutes: document.getElementById("deepWorkMinutes"),
  outputWords: document.getElementById("outputWords"),
  appUsageMinutes: document.getElementById("appUsageMinutes"),
  phoneUsageMinutes: document.getElementById("phoneUsageMinutes"),
  macUsageMinutes: document.getElementById("macUsageMinutes"),
  topAppName: document.getElementById("topAppName"),
  topAppMinutes: document.getElementById("topAppMinutes"),
  steps: document.getElementById("steps"),
  activeCalories: document.getElementById("activeCalories"),
  distanceKm: document.getElementById("distanceKm"),
  ruinCodesWrap: document.getElementById("ruinCodesWrap"),
  yesterdayBTitle: document.getElementById("yesterdayBTitle"),
  yesterdayBText: document.getElementById("yesterdayBText"),
  bFocus: document.getElementById("bFocus"),
  copyAppleTemplate: document.getElementById("copyAppleTemplate"),
  copyMacBridgeCmd: document.getElementById("copyMacBridgeCmd"),
  appleSyncStatus: document.getElementById("appleSyncStatus"),
  output: document.getElementById("output"),
  scoreboard: document.getElementById("scoreboard"),
  history: document.getElementById("history"),
  copyDl: document.getElementById("copyDl"),
  copyOutput: document.getElementById("copyOutput"),
  copyLifeOS: document.getElementById("copyLifeOS"),
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
  dataOutput: document.getElementById("dataOutput"),

  syncToken: document.getElementById("syncToken"),
  syncGistId: document.getElementById("syncGistId"),
  syncAuto: document.getElementById("syncAuto"),
  syncSave: document.getElementById("syncSave"),
  syncInit: document.getElementById("syncInit"),
  syncNow: document.getElementById("syncNow"),
  syncOutput: document.getElementById("syncOutput")
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
  hydrateSyncSettingsForm();
  applyAppleAutofillFromUrl();
  hydrateMetricsFromLastAppleSync();
  renderAll(loadEntries());
  renderWorkflowPanels();
  renderYesterdayBContext();
  renderAppleSyncStatus();
  renderSyncStatus();
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

  if (el.copyLifeOS) {
    el.copyLifeOS.addEventListener("click", () => {
      const packet = buildLifeOSPacket(getFormData(), latestOutputText);
      copyWithFeedback(packet, el.copyLifeOS, "复制给 LifeOS");
    });
  }

  if (el.intentDefault) {
    el.intentDefault.addEventListener("click", onIntentDefault);
  }

  if (el.intentCarry) {
    el.intentCarry.addEventListener("click", onIntentCarry);
  }

  if (el.intentVoice) {
    el.intentVoice.addEventListener("click", onIntentVoice);
  }

  if (el.intentAi) {
    el.intentAi.addEventListener("click", onIntentAi);
  }

  if (el.copyAppleTemplate) {
    el.copyAppleTemplate.addEventListener("click", onCopyAppleTemplate);
  }

  if (el.copyMacBridgeCmd) {
    el.copyMacBridgeCmd.addEventListener("click", onCopyMacBridgeCmd);
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

  if (el.syncSave) {
    el.syncSave.addEventListener("click", onSyncSaveSettings);
  }

  if (el.syncInit) {
    el.syncInit.addEventListener("click", onSyncInitCloud);
  }

  if (el.syncNow) {
    el.syncNow.addEventListener("click", onSyncNow);
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
  void maybeAutoSync("DL");
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
  void maybeAutoSync("Zero-Day");
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
  void maybeAutoSync("WR-10");
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
  void maybeAutoSync("Patch");
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
    const appleSyncMeta = data.appleSyncMeta && typeof data.appleSyncMeta === "object"
      ? data.appleSyncMeta
      : null;

    saveEntries(dailyLogs);
    saveCollection(WR_STORAGE_KEY, weeklyReviews);
    saveCollection(PATCH_STORAGE_KEY, systemPatches);
    if (appleSyncMeta) {
      localStorage.setItem(APPLE_SYNC_META_KEY, JSON.stringify(appleSyncMeta));
    } else {
      localStorage.removeItem(APPLE_SYNC_META_KEY);
    }

    renderAll(loadEntries());
    renderWorkflowPanels();
    renderYesterdayBContext();
    renderAppleSyncStatus();
    renderSyncStatus();

    const summary = [
      `导入成功：${file.name}`,
      `DL：${dailyLogs.length} 条`,
      `WR：${weeklyReviews.length} 条`,
      `Patch：${systemPatches.length} 条`,
      `Apple同步：${appleSyncMeta ? "已恢复" : "无"}`
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

function loadSyncSettings() {
  try {
    const raw = localStorage.getItem(SYNC_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      token: String(parsed?.token || ""),
      gistId: String(parsed?.gistId || ""),
      auto: Boolean(parsed?.auto)
    };
  } catch {
    return { token: "", gistId: "", auto: false };
  }
}

function saveSyncSettings(settings) {
  localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify({
    token: settings.token || "",
    gistId: settings.gistId || "",
    auto: Boolean(settings.auto)
  }));
}

function getSyncSettingsFromForm() {
  const current = loadSyncSettings();
  const tokenInput = String(el.syncToken?.value || "").trim();
  const gistInput = String(el.syncGistId?.value || "").trim();
  return {
    token: tokenInput || current.token || "",
    gistId: gistInput || "",
    auto: Boolean(el.syncAuto?.checked)
  };
}

function hydrateSyncSettingsForm() {
  const settings = loadSyncSettings();
  if (el.syncToken) {
    el.syncToken.value = settings.token;
  }
  if (el.syncGistId) {
    el.syncGistId.value = settings.gistId;
  }
  if (el.syncAuto) {
    el.syncAuto.checked = settings.auto;
  }
}

function renderSyncStatus(overrideMessage) {
  if (!el.syncOutput) {
    return;
  }

  if (overrideMessage) {
    setModuleOutput(el.syncOutput, overrideMessage, "尚未配置云同步");
    return;
  }

  const settings = loadSyncSettings();
  if (!settings.gistId || !settings.token) {
    setModuleOutput(el.syncOutput, "", "尚未配置云同步");
    return;
  }

  const lines = [
    "云同步已配置",
    `Gist ID：${settings.gistId}`,
    `自动同步：${settings.auto ? "开启" : "关闭"}`,
    "建议：两端都点一次“同步现在（先拉后推）”后再开始日常使用。"
  ];
  setModuleOutput(el.syncOutput, lines.join("\n"), "尚未配置云同步");
}

function onSyncSaveSettings() {
  const settings = getSyncSettingsFromForm();
  saveSyncSettings(settings);
  const lines = [
    "同步配置已保存",
    `Gist ID：${settings.gistId || "(未填)"}`,
    `自动同步：${settings.auto ? "开启" : "关闭"}`
  ];
  renderSyncStatus(lines.join("\n"));
}

async function onSyncInitCloud() {
  const settings = getSyncSettingsFromForm();
  if (!settings.token) {
    alert("先填写 GitHub Token。");
    return;
  }

  try {
    const payload = buildBackupPayload();
    const gistId = await createCloudGist(settings.token, payload);
    const next = { ...settings, gistId };
    saveSyncSettings(next);
    hydrateSyncSettingsForm();
    renderSyncStatus(`初始化完成：已创建云仓\nGist ID：${gistId}\n现在可点“同步现在（先拉后推）”。`);
  } catch (error) {
    renderSyncStatus(`初始化失败：${String(error?.message || error)}`);
  }
}

async function onSyncNow() {
  const settings = getSyncSettingsFromForm();
  if (!settings.token || !settings.gistId) {
    alert("先填写 Token 和 Gist ID，或点“初始化云仓”。");
    return;
  }
  saveSyncSettings(settings);
  await syncNowInternal(settings, { reason: "手动同步", showStatus: true });
}

async function maybeAutoSync(reason) {
  const settings = loadSyncSettings();
  if (!settings.auto || !settings.token || !settings.gistId) {
    return;
  }
  await syncNowInternal(settings, { reason: `自动同步(${reason})`, showStatus: false });
}

async function syncNowInternal(settings, options = {}) {
  const reason = options.reason || "同步";
  const showStatus = options.showStatus !== false;

  try {
    const local = buildBackupPayload();
    const cloud = await fetchCloudPayload(settings);
    const merged = mergeLocalAndCloud(local, cloud);
    applyMergedPayload(merged);
    await pushCloudPayload(settings, merged);

    if (showStatus) {
      const data = merged.data || {};
      const lines = [
        `${reason}完成`,
        `DL：${ensureArray(data.dailyLogs).length} 条`,
        `WR：${ensureArray(data.weeklyReviews).length} 条`,
        `Patch：${ensureArray(data.systemPatches).length} 条`
      ];
      renderSyncStatus(lines.join("\n"));
    }
  } catch (error) {
    if (showStatus) {
      renderSyncStatus(`${reason}失败：${String(error?.message || error)}`);
    } else {
      console.warn("auto sync failed", error);
    }
  }
}

async function createCloudGist(token, payload) {
  const body = {
    description: "LifeOS v1.3 sync",
    public: false,
    files: {
      [SYNC_FILENAME]: {
        content: JSON.stringify(payload, null, 2)
      }
    }
  };

  const res = await githubFetchJson("https://api.github.com/gists", token, {
    method: "POST",
    body: JSON.stringify(body)
  });

  const gistId = String(res?.id || "").trim();
  if (!gistId) {
    throw new Error("创建 Gist 失败：未返回 Gist ID");
  }
  return gistId;
}

async function fetchCloudPayload(settings) {
  const gist = await githubFetchJson(`https://api.github.com/gists/${settings.gistId}`, settings.token);
  const files = gist?.files || {};
  let file = files[SYNC_FILENAME];
  if (!file) {
    const first = Object.values(files)[0];
    file = first || null;
  }
  if (!file) {
    throw new Error("云仓中没有可用的同步文件。");
  }

  let content = String(file.content || "");
  if (file.truncated && file.raw_url) {
    const rawRes = await fetch(file.raw_url, { headers: { Accept: "application/json,text/plain;q=0.9,*/*;q=0.8" } });
    content = await rawRes.text();
  }

  const parsed = JSON.parse(content);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("云端同步文件格式无效。");
  }
  return parsed;
}

async function pushCloudPayload(settings, payload) {
  const body = {
    files: {
      [SYNC_FILENAME]: {
        content: JSON.stringify(payload, null, 2)
      }
    }
  };

  await githubFetchJson(`https://api.github.com/gists/${settings.gistId}`, settings.token, {
    method: "PATCH",
    body: JSON.stringify(body)
  });
}

async function githubFetchJson(url, token, options = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || text || `${res.status} ${res.statusText}`;
    throw new Error(`GitHub API 错误：${msg}`);
  }

  return data;
}

function mergeLocalAndCloud(localPayload, cloudPayload) {
  const local = (localPayload && localPayload.data) ? localPayload.data : {};
  const cloud = (cloudPayload && cloudPayload.data) ? cloudPayload.data : cloudPayload;

  const mergedDaily = mergeByKey(
    ensureArray(local.dailyLogs),
    ensureArray(cloud?.dailyLogs),
    (item) => item?.date || `${item?.createdAt || ""}|${item?.behavior || ""}`
  ).sort((a, b) => {
    if (a.date === b.date) {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    }
    return String(b.date || "").localeCompare(String(a.date || ""));
  });

  const mergedWeekly = mergeByKey(
    ensureArray(local.weeklyReviews),
    ensureArray(cloud?.weeklyReviews),
    (item) => item?.weekRange || item?.createdAt || JSON.stringify(item)
  ).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const mergedPatches = mergeByKey(
    ensureArray(local.systemPatches),
    ensureArray(cloud?.systemPatches),
    (item) => `${item?.startDate || ""}|${item?.fix || ""}|${item?.createdAt || ""}`
  ).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const appleSyncMeta = pickNewestMeta(local.appleSyncMeta, cloud?.appleSyncMeta);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    policy: {
      storage: "mixed",
      autoUpload: false,
      note: "Cloud sync via GitHub Gist"
    },
    data: {
      dailyLogs: mergedDaily,
      weeklyReviews: mergedWeekly,
      systemPatches: mergedPatches,
      appleSyncMeta
    }
  };
}

function mergeByKey(localList, cloudList, keyFn) {
  const map = new Map();
  const all = [...ensureArray(localList), ...ensureArray(cloudList)];

  all.forEach((item) => {
    const key = String(keyFn(item) || "");
    if (!key) {
      return;
    }
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      return;
    }
    const existingTs = String(existing?.createdAt || "");
    const currentTs = String(item?.createdAt || "");
    if (currentTs >= existingTs) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function pickNewestMeta(localMeta, cloudMeta) {
  if (!localMeta) {
    return cloudMeta || null;
  }
  if (!cloudMeta) {
    return localMeta;
  }
  const localTs = String(localMeta.syncedAt || "");
  const cloudTs = String(cloudMeta.syncedAt || "");
  return cloudTs >= localTs ? cloudMeta : localMeta;
}

function applyMergedPayload(payload) {
  const data = payload?.data || payload || {};
  const dailyLogs = ensureArray(data.dailyLogs);
  const weeklyReviews = ensureArray(data.weeklyReviews);
  const systemPatches = ensureArray(data.systemPatches);

  saveEntries(dailyLogs);
  saveCollection(WR_STORAGE_KEY, weeklyReviews);
  saveCollection(PATCH_STORAGE_KEY, systemPatches);

  if (data.appleSyncMeta && typeof data.appleSyncMeta === "object") {
    localStorage.setItem(APPLE_SYNC_META_KEY, JSON.stringify(data.appleSyncMeta));
  }

  renderAll(loadEntries());
  renderWorkflowPanels();
  renderYesterdayBContext();
  renderAppleSyncStatus();
}

async function onCopyAppleTemplate() {
  const base = `${window.location.origin}${window.location.pathname}`;
  const today = localDateISO(new Date());
  const template = [
    `${base}?source=apple-shortcuts`,
    `date=${today}`,
    "sleepHours={{sleepHours}}",
    "trainingMinutes={{exerciseMinutes}}",
    "deepWorkMinutes={{studyMinutes}}",
    "outputWords={{outputWords}}",
    "steps={{steps}}",
    "activeCalories={{activeCalories}}",
    "distanceKm={{distanceKm}}",
    "appUsageMinutes={{appUsageMinutes}}",
    "phoneUsageMinutes={{phoneUsageMinutes}}",
    "topAppName={{topAppName}}",
    "topAppMinutes={{topAppMinutes}}",
    "autoRuin=1"
  ].join("&");

  await copyWithFeedback(template, el.copyAppleTemplate, "复制快捷指令 URL 模板");
}

async function onCopyMacBridgeCmd() {
  const cmd = [
    "cd /Users/xiaoxuan/Documents/Playground/lifeos-v13",
    "python3 scripts/macos_usage_bridge.py --open"
  ].join(" && ");
  await copyWithFeedback(cmd, el.copyMacBridgeCmd, "复制 Mac 自动采集命令");
}

function onIntentDefault() {
  if (!el.intent) {
    return;
  }
  el.intent.value = "";
  flashButton(el.intentDefault, "已切默认B");
}

function onIntentCarry() {
  if (!el.intent || !el.date) {
    return;
  }

  const selectedDate = el.date.value || localDateISO(new Date());
  const previousDate = shiftDateISO(selectedDate, -1);
  const previousEntry = loadEntries().find((item) => item.date === previousDate);

  if (!previousEntry) {
    alert("昨天没有记录，无法沿用。可直接点“不用写（默认B）”。");
    return;
  }

  const carryText = buildCarryIntent(previousEntry);
  el.intent.value = carryText;
  flashButton(el.intentCarry, "已沿用");
}

function onIntentVoice() {
  if (!el.intentVoice || !el.intent) {
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("当前浏览器不支持语音输入。可改用“沿用昨天”或“默认B”。");
    return;
  }

  const rec = new SpeechRecognition();
  rec.lang = "zh-CN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  el.intentVoice.disabled = true;
  const origin = el.intentVoice.textContent;
  el.intentVoice.textContent = "正在听...";
  let done = false;
  let safetyTimer = null;

  const restore = () => {
    if (done) {
      return;
    }
    done = true;
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      safetyTimer = null;
    }
    el.intentVoice.disabled = false;
    el.intentVoice.textContent = origin;
  };

  rec.onresult = (event) => {
    const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
    if (text) {
      el.intent.value = text;
    }
  };

  rec.onerror = () => {
    alert("语音识别失败，请再试一次。");
    restore();
  };

  rec.onend = () => {
    restore();
  };

  safetyTimer = setTimeout(() => {
    restore();
  }, 10000);

  rec.start();
}

function onIntentAi() {
  if (!el.intent) {
    return;
  }

  const suggestion = buildIntentSuggestion(getFormData());
  if (!suggestion) {
    alert("当前信息太少，建议直接点“不用写（默认B）”。");
    return;
  }

  el.intent.value = suggestion;
  flashButton(el.intentAi, "已代写");
}

function buildIntentSuggestion(entry) {
  if (!entry) {
    return "";
  }

  if (entry.ruin === 1) {
    const codes = normalizeRuinCodes(entry.ruinCodes);
    if (codes.length > 0) {
      const ruinSuggestions = {
        S: "先稳住睡眠节律，明天只做一个5分钟关键动作",
        T: "先做交易纪律复盘，明天默认不交易",
        P: "先恢复唯一关键任务推进，只交付一小块"
      };
      const parts = codes.map((code) => ruinSuggestions[code]).filter(Boolean);
      if (parts.length > 0) {
        return `先防崩：${parts.join("；")}`;
      }
    }
    return "先防崩，明天只做一个5分钟关键动作";
  }

  if (entry.result) {
    return `把今天结果再推进一小步：${shortenIntentText(entry.result, 28)}`;
  }

  if (entry.behavior) {
    return `继续昨天这块：${shortenIntentText(entry.behavior, 28)}`;
  }

  const apple = loadAppleSyncMeta();
  if (apple?.metrics && apple.date === (el.date?.value || "")) {
    if (Number(apple.metrics.deepWorkMinutes) > 0 || Number(apple.metrics.outputWords) > 0) {
      return "延续今天的学习/输出同一块，先做15分钟";
    }
    if (Number(apple.metrics.trainingMinutes) > 0) {
      return "延续今天的训练节奏，再做15分钟";
    }
  }

  return "";
}

function applyAppleAutofillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params || params.toString().length === 0) {
    return;
  }

  const payload = {
    source: String(params.get("source") || "external").trim(),
    date: getFirstDateParam(params, ["date", "logDate"]),
    sleepHours: getFirstNumericParam(params, ["sleepHours", "sleep", "sleep_h"]),
    trainingMinutes: getFirstNumericParam(params, ["trainingMinutes", "exerciseMinutes", "workoutMinutes"]),
    deepWorkMinutes: getFirstNumericParam(params, ["deepWorkMinutes", "studyMinutes", "focusMinutes", "learningMinutes"]),
    outputWords: getFirstNumericParam(params, ["outputWords", "words", "writingWords"]),
    appUsageMinutes: getFirstNumericParam(params, ["appUsageMinutes", "softwareUsageMinutes", "usageMinutes", "screenMinutes"]),
    phoneUsageMinutes: getFirstNumericParam(params, ["phoneUsageMinutes", "mobileUsageMinutes", "iosUsageMinutes"]),
    macUsageMinutes: getFirstNumericParam(params, ["macUsageMinutes", "desktopUsageMinutes"]),
    topAppName: String(params.get("topAppName") || params.get("topApp") || "").trim(),
    topAppMinutes: getFirstNumericParam(params, ["topAppMinutes", "topAppUsageMinutes"]),
    steps: getFirstNumericParam(params, ["steps", "stepCount"]),
    activeCalories: getFirstNumericParam(params, ["activeCalories", "calories", "moveCalories"]),
    distanceKm: getFirstNumericParam(params, ["distanceKm", "workoutDistanceKm", "distance"])
  };

  let metricTouched = 0;
  if (setNumericInputValue(el.sleepHours, payload.sleepHours)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.trainingMinutes, payload.trainingMinutes)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.deepWorkMinutes, payload.deepWorkMinutes)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.outputWords, payload.outputWords)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.appUsageMinutes, payload.appUsageMinutes)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.phoneUsageMinutes, payload.phoneUsageMinutes)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.macUsageMinutes, payload.macUsageMinutes)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.topAppMinutes, payload.topAppMinutes)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.steps, payload.steps)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.activeCalories, payload.activeCalories)) {
    metricTouched += 1;
  }
  if (setNumericInputValue(el.distanceKm, payload.distanceKm)) {
    metricTouched += 1;
  }
  if (el.topAppName && payload.topAppName) {
    el.topAppName.value = payload.topAppName;
    metricTouched += 1;
  }

  if (metricTouched === 0) {
    return;
  }

  if (payload.date && el.date) {
    el.date.value = payload.date;
  }

  if (params.get("autoRuin") === "1" && Number(payload.sleepHours) < 6.5) {
    const ruinOne = document.querySelector("input[name='ruin'][value='1']");
    const sleepCode = document.querySelector("input[name='ruinCodes'][value='S']");
    if (ruinOne) {
      ruinOne.checked = true;
    }
    if (sleepCode) {
      sleepCode.checked = true;
    }
    toggleRuinCodes();
  }

  const meta = {
    source: payload.source || "external",
    syncedAt: new Date().toISOString(),
    date: payload.date || el.date?.value || "",
    metrics: {
      sleepHours: payload.sleepHours,
      trainingMinutes: payload.trainingMinutes,
      deepWorkMinutes: payload.deepWorkMinutes,
      outputWords: payload.outputWords,
      appUsageMinutes: payload.appUsageMinutes,
      phoneUsageMinutes: payload.phoneUsageMinutes,
      macUsageMinutes: payload.macUsageMinutes,
      topAppName: payload.topAppName,
      topAppMinutes: payload.topAppMinutes,
      steps: payload.steps,
      activeCalories: payload.activeCalories,
      distanceKm: payload.distanceKm
    }
  };

  localStorage.setItem(APPLE_SYNC_META_KEY, JSON.stringify(meta));
  renderAppleSyncStatus(meta);

  if (window.history?.replaceState) {
    window.history.replaceState({}, "", window.location.pathname);
  }
}

function renderAppleSyncStatus(metaOverride) {
  if (!el.appleSyncStatus) {
    return;
  }

  const raw = metaOverride || loadAppleSyncMeta();
  if (!raw) {
    setModuleOutput(el.appleSyncStatus, "", "尚未接收 Apple 自动填充数据");
    return;
  }

  const rows = [];
  if (raw.syncedAt) {
    rows.push(`最近自动填充：${new Date(raw.syncedAt).toLocaleString()}`);
  }
  rows.push(`来源：${raw.source || "external"}`);
  if (raw.date) {
    rows.push(`日期：${raw.date}`);
  }

  const metrics = raw.metrics || {};
  const metricParts = [];
  if (hasMetricValue(metrics.sleepHours)) {
    metricParts.push(`睡眠 ${Number(metrics.sleepHours)}h`);
  }
  if (hasMetricValue(metrics.trainingMinutes)) {
    metricParts.push(`训练 ${Number(metrics.trainingMinutes)}min`);
  }
  if (hasMetricValue(metrics.deepWorkMinutes)) {
    metricParts.push(`学习/深度工作 ${Number(metrics.deepWorkMinutes)}min`);
  }
  if (hasMetricValue(metrics.outputWords)) {
    metricParts.push(`输出 ${Number(metrics.outputWords)}字`);
  }
  if (hasMetricValue(metrics.appUsageMinutes)) {
    metricParts.push(`软件使用 ${Number(metrics.appUsageMinutes)}min`);
  }
  if (hasMetricValue(metrics.phoneUsageMinutes)) {
    metricParts.push(`手机使用 ${Number(metrics.phoneUsageMinutes)}min`);
  }
  if (hasMetricValue(metrics.macUsageMinutes)) {
    metricParts.push(`电脑使用 ${Number(metrics.macUsageMinutes)}min`);
  }
  if (metrics.topAppName) {
    const topMins = hasMetricValue(metrics.topAppMinutes) ? ` ${Number(metrics.topAppMinutes)}min` : "";
    metricParts.push(`头号应用 ${metrics.topAppName}${topMins}`);
  }
  if (hasMetricValue(metrics.steps)) {
    metricParts.push(`步数 ${Number(metrics.steps)}`);
  }
  if (hasMetricValue(metrics.activeCalories)) {
    metricParts.push(`活动卡路里 ${Number(metrics.activeCalories)}`);
  }
  if (hasMetricValue(metrics.distanceKm)) {
    metricParts.push(`距离 ${Number(metrics.distanceKm)}km`);
  }
  if (metricParts.length > 0) {
    rows.push(`已带入：${metricParts.join(" | ")}`);
  }
  rows.push("提示：以上仅自动填表，仍需点击“生成 A/B/C/D 并保存”。");

  setModuleOutput(el.appleSyncStatus, rows.join("\n"), "尚未接收 Apple 自动填充数据");
}

function hydrateMetricsFromLastAppleSync() {
  const meta = loadAppleSyncMeta();
  if (!meta || !meta.metrics || !el.date || !el.date.value) {
    return;
  }

  if (meta.date !== el.date.value) {
    return;
  }

  setNumericInputIfEmpty(el.sleepHours, meta.metrics.sleepHours);
  setNumericInputIfEmpty(el.trainingMinutes, meta.metrics.trainingMinutes);
  setNumericInputIfEmpty(el.deepWorkMinutes, meta.metrics.deepWorkMinutes);
  setNumericInputIfEmpty(el.outputWords, meta.metrics.outputWords);
  setNumericInputIfEmpty(el.appUsageMinutes, meta.metrics.appUsageMinutes);
  setNumericInputIfEmpty(el.phoneUsageMinutes, meta.metrics.phoneUsageMinutes);
  setNumericInputIfEmpty(el.macUsageMinutes, meta.metrics.macUsageMinutes);
  setNumericInputIfEmpty(el.topAppMinutes, meta.metrics.topAppMinutes);
  setNumericInputIfEmpty(el.steps, meta.metrics.steps);
  setNumericInputIfEmpty(el.activeCalories, meta.metrics.activeCalories);
  setNumericInputIfEmpty(el.distanceKm, meta.metrics.distanceKm);
  if (el.topAppName && el.topAppName.value === "" && meta.metrics.topAppName) {
    el.topAppName.value = String(meta.metrics.topAppName);
  }
}

function loadAppleSyncMeta() {
  try {
    const raw = localStorage.getItem(APPLE_SYNC_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getFirstNumericParam(params, keys) {
  for (const key of keys) {
    const value = params.get(key);
    const parsed = toNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
}

function getFirstDateParam(params, keys) {
  for (const key of keys) {
    const value = String(params.get(key) || "").trim();
    if (!value) {
      continue;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
  }
  return "";
}

function setNumericInputValue(input, value) {
  if (!input || value === null) {
    return false;
  }
  input.value = String(value);
  return true;
}

function setNumericInputIfEmpty(input, value) {
  if (!input || input.value !== "") {
    return false;
  }
  return setNumericInputValue(input, value);
}

function shortenIntentText(text, maxLen) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return "";
  }
  if (clean.length <= maxLen) {
    return clean;
  }
  return `${clean.slice(0, maxLen)}...`;
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
    outputWords: toNumber(fd.get("outputWords")),
    appUsageMinutes: toNumber(fd.get("appUsageMinutes")),
    phoneUsageMinutes: toNumber(fd.get("phoneUsageMinutes")),
    macUsageMinutes: toNumber(fd.get("macUsageMinutes")),
    topAppName: String(fd.get("topAppName") || "").trim(),
    topAppMinutes: toNumber(fd.get("topAppMinutes")),
    steps: toNumber(fd.get("steps")),
    activeCalories: toNumber(fd.get("activeCalories")),
    distanceKm: toNumber(fd.get("distanceKm"))
  };
}

function buildCarryIntent(previousEntry) {
  const behavior = String(previousEntry.behavior || "").trim();
  if (behavior) {
    return `继续昨天这块：${behavior}`;
  }

  const firstStep = String(previousEntry.output?.b?.[0] || "").trim();
  if (firstStep) {
    return `沿用昨天步骤：${firstStep}`;
  }

  return "继续昨天同一块";
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
  renderExecutionFocus(output);

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

function renderExecutionFocus(output) {
  if (!el.bFocus) {
    return;
  }

  if (!output || !Array.isArray(output.b) || output.b.length === 0) {
    el.bFocus.textContent = "提交 DL-30 后，这里会锁定显示你明天唯一要做的 B。";
    return;
  }

  const steps = output.b.slice(0, 6).map((step, index) => `${index + 1}. ${step}`);
  el.bFocus.textContent = steps.join("\n");
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
  const deviceParts = [];
  if (hasMetricValue(entry.sleepHours)) deviceParts.push(`睡眠${entry.sleepHours}h`);
  if (hasMetricValue(entry.trainingMinutes)) deviceParts.push(`训练${entry.trainingMinutes}min`);
  if (hasMetricValue(entry.deepWorkMinutes)) deviceParts.push(`深度工作${entry.deepWorkMinutes}min`);
  if (hasMetricValue(entry.outputWords)) deviceParts.push(`输出${entry.outputWords}字`);
  if (hasMetricValue(entry.appUsageMinutes)) deviceParts.push(`软件使用${entry.appUsageMinutes}min`);
  if (hasMetricValue(entry.phoneUsageMinutes)) deviceParts.push(`手机${entry.phoneUsageMinutes}min`);
  if (hasMetricValue(entry.macUsageMinutes)) deviceParts.push(`电脑${entry.macUsageMinutes}min`);
  if (entry.topAppName) {
    const topMins = hasMetricValue(entry.topAppMinutes) ? `${entry.topAppMinutes}min` : "";
    deviceParts.push(`头号应用${entry.topAppName}${topMins ? `(${topMins})` : ""}`);
  }
  if (hasMetricValue(entry.steps)) deviceParts.push(`步数${entry.steps}`);
  if (hasMetricValue(entry.activeCalories)) deviceParts.push(`卡路里${entry.activeCalories}`);
  if (hasMetricValue(entry.distanceKm)) deviceParts.push(`距离${entry.distanceKm}km`);

  return [
    `DL-30 | ${entry.date || localDateISO(new Date())}`,
    `行为：${entry.behavior || ""}`,
    `结果：${entry.result || ""}`,
    `昨日B执行：${entry.bExecuted}`,
    `RUIN：${entry.ruin}${ruinCodePart}`,
    `明日意图：${entry.intent || ""}`,
    deviceParts.length > 0 ? `设备数据：${deviceParts.join(" | ")}` : ""
  ].filter(Boolean).join("\n");
}

function buildLifeOSPacket(entry, outputText) {
  const lines = [
    "请按 LifeOS v1.3 验收标准输出 A/B/C/D：",
    "1) A 只做1-2句模式判断。",
    "2) B 必须步骤化：普通日<=15min，红灯日<=5min。",
    "3) C 必须给“风险点 + 1条防线”；RUIN=1 时按 S/T/P 默认防线。",
    "4) D 仅可选，不得替代 B。",
    "",
    "以下是我的 DL-30：",
    buildDlText(entry)
  ];

  if (outputText) {
    lines.push(
      "",
      "网站当前生成的 A/B/C/D（请校验并在必要时把 B 再缩小一步）：",
      outputText
    );
  }

  return lines.join("\n");
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
      systemPatches: loadCollection(PATCH_STORAGE_KEY),
      appleSyncMeta: loadAppleSyncMeta()
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

function hasMetricValue(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }
  return Number.isFinite(Number(value));
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

function flashButton(button, text) {
  if (!button) {
    return;
  }
  const origin = button.textContent;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = origin;
  }, 900);
}
