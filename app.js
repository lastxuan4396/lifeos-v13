// lifeos-shell-v99
const STORAGE_KEY = "lifeos_v13_entries";
const WR_STORAGE_KEY = "lifeos_v13_wr_entries";
const PATCH_STORAGE_KEY = "lifeos_v13_patch_entries";
const APPLE_SYNC_META_KEY = "lifeos_v13_apple_sync_meta";
const SYNC_SETTINGS_KEY = "lifeos_v13_sync_settings";
const SYNC_FAILURE_KEY = "lifeos_v13_sync_failed";
const UI_MODE_KEY = "lifeos_v13_ui_mode";
const DRAFT_KEY = "lifeos_v13_dl_draft";
const WR_DRAFT_KEY = "lifeos_v13_wr_draft";
const PATCH_DRAFT_KEY = "lifeos_v13_patch_draft";
const DOJO_DRAFT_KEY = "lifeos_v13_dojo_draft";
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
let latestOutputDate = "";
let latestWrOutputText = "";
let latestPatchOutputText = "";
let selectedWeeklyRecord = null;
let latestPlaybookOutputText = "";
let latestDojoOutputText = "";
let latestDojoStarterText = "";
let syncQueue = Promise.resolve();
let syncSettingsSnapshot = null;
let historyLimit = 12;
let backupPreviewRequest = 0;
const unreadableCollections = new Set();
let dailyDraftSnapshot = null;
let dailyDraftSaveFailed = false;
const workflowDraftSnapshots = new Map([[WR_DRAFT_KEY, null], [PATCH_DRAFT_KEY, null], [DOJO_DRAFT_KEY, null]]);
const workflowDraftSaveFailed = new Set();
const WR_SCORE_FIELDS = new Set(["wrDlDone", "wrBDone", "wrBObserved", "wrRuinDays", "wrCodeS", "wrCodeT", "wrCodeP", "wrSleepPass", "wrTrainingPass", "wrOutputPass"]);
const wrScoreTouched = new Set();

const el = {
  modeQuick: document.getElementById("modeQuick"),
  modeFull: document.getElementById("modeFull"),
  quickModeBanner: document.getElementById("quickModeBanner"),
  form: document.getElementById("dlForm"),
  date: document.getElementById("date"),
  behavior: document.getElementById("behavior"),
  result: document.getElementById("result"),
  intent: document.getElementById("intent"),
  intentDetails: document.getElementById("intentDetails"),
  intentDefault: document.getElementById("intentDefault"),
  intentCarry: document.getElementById("intentCarry"),
  intentVoice: document.getElementById("intentVoice"),
  intentAi: document.getElementById("intentAi"),
  intentApplySuggestion: document.getElementById("intentApplySuggestion"),
  intentAssistTitle: document.getElementById("intentAssistTitle"),
  intentAssistText: document.getElementById("intentAssistText"),
  engineSignalTitle: document.getElementById("engineSignalTitle"),
  engineSignalText: document.getElementById("engineSignalText"),
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
  ruinAssist: document.getElementById("ruinAssist"),
  ruinAssistTitle: document.getElementById("ruinAssistTitle"),
  ruinAssistText: document.getElementById("ruinAssistText"),
  applySleepRuin: document.getElementById("applySleepRuin"),
  yesterdayBTitle: document.getElementById("yesterdayBTitle"),
  yesterdayBText: document.getElementById("yesterdayBText"),
  quickFillTitle: document.getElementById("quickFillTitle"),
  quickFillText: document.getElementById("quickFillText"),
  behaviorFromYesterdayB: document.getElementById("behaviorFromYesterdayB"),
  resultDoneMinimal: document.getElementById("resultDoneMinimal"),
  resultStartedMinimal: document.getElementById("resultStartedMinimal"),
  bFocus: document.getElementById("bFocus"),
  copyAppleTemplate: document.getElementById("copyAppleTemplate"),
  copyMacBridgeCmd: document.getElementById("copyMacBridgeCmd"),
  appleSyncStatus: document.getElementById("appleSyncStatus"),
  output: document.getElementById("output"),
  woopLiteCard: document.getElementById("woopLiteCard"),
  woopLiteText: document.getElementById("woopLiteText"),
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
  initUIMode();

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
  restoreWorkflowDraft(el.wrForm, WR_DRAFT_KEY, "wrDraftStatus", "wrDraftBadge");
  restoreWorkflowDraft(el.patchForm, PATCH_DRAFT_KEY, "patchDraftStatus", "patchDraftBadge");
  restoreWorkflowDraft(el.dojoForm, DOJO_DRAFT_KEY, "dojoDraftStatus", "dojoDraftBadge");
  initWorkspaceDraftStatus();
  try { hydrateSyncSettingsForm(); } catch { syncSettingsSnapshot = undefined; }
  const hasDraft = restoreDailyDraft();
  const params = new URLSearchParams(window.location.search);
  const bridgeKeys = ["sleepHours", "sleep", "sleep_h", "trainingMinutes", "exerciseMinutes", "workoutMinutes", "deepWorkMinutes", "studyMinutes", "focusMinutes", "learningMinutes", "outputWords", "words", "writingWords", "appUsageMinutes", "softwareUsageMinutes", "usageMinutes", "screenMinutes", "phoneUsageMinutes", "mobileUsageMinutes", "iosUsageMinutes", "macUsageMinutes", "desktopUsageMinutes", "topAppName", "topApp", "topAppMinutes", "topAppUsageMinutes", "steps", "stepCount", "activeCalories", "calories", "moveCalories", "distanceKm", "workoutDistanceKm", "distance"];
  const hasBridgeData = bridgeKeys.some((key) => params.has(key));
  const bridgeDate = getFirstDateParam(params, ["date", "logDate"]);
  if (hasDraft) {
    if (hasBridgeData) document.getElementById("pendingBridge").classList.remove("hidden");
  } else if (hasBridgeData && bridgeDate && loadEntries().some((entry) => entry.date === bridgeDate)) {
    loadDailyRecord(bridgeDate);
    document.getElementById("pendingBridge").classList.remove("hidden");
    mergePendingBridgeIntoDraft();
  } else if (hasBridgeData && !bridgeDate && !params.has("date") && !params.has("logDate") && loadEntries().some((entry) => entry.date === el.date.value)) {
    document.getElementById("pendingBridge").classList.remove("hidden");
    document.getElementById("pendingBridgeStatus").textContent = "链接没有日期，今天已有记录。请确认设备数据日期后，重新生成带日期的链接。";
  } else {
    applyAppleAutofillFromUrl();
    hydrateMetricsFromLastAppleSync();
  }
  if (el.date) el.date.dataset.previousDate = el.date.value;
  toggleRuinCodes();
  renderAll(loadEntries());
  renderWorkflowPanels();
  renderYesterdayBContext();
  renderQuickFillCard();
  renderIntentAssist();
  renderEngineSignal();
  renderSleepRuinAssist();
  renderAppleSyncStatus();
  renderSyncStatus();
  try { if (localStorage.getItem(SYNC_FAILURE_KEY) === "1") showSyncNotice(true); } catch { /* storage may be unavailable */ }
  initOfflineSupport();
}

async function initOfflineSupport() {
  const status = document.getElementById("offlineStatus");
  if (!status) return;
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    status.textContent = "离线打开不可用：请通过 HTTPS 或 localhost 访问。已打开的页面仍可在本机保存记录。";
    return;
  }
  const checkButton = document.getElementById("checkUpdate");
  checkButton.classList.remove("hidden");
  let registration;
  try {
    registration = await navigator.serviceWorker.register("./sw.js");
    let updating = false;
    const showUpdate = () => {
      if (registration.waiting && navigator.serviceWorker.controller) document.getElementById("updateAvailable").classList.remove("hidden");
    };
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (updating) window.location.reload();
    });
    document.getElementById("applyUpdate").addEventListener("click", () => {
      if (!registration.waiting) return;
      if (!canActivateUpdate()) return;
      if (!confirm("网页将重新打开。请先保存正在填写的内容，是否继续？")) return;
      if (!canActivateUpdate()) return;
      updating = true;
      registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
    });
    registration.addEventListener("updatefound", () => {
      const worker = registration.installing;
      if (worker) worker.addEventListener("statechange", () => { if (worker.state === "installed") showUpdate(); });
    });
    showUpdate();
    const readyTimer = setTimeout(() => {
      if (!registration.active && !checkButton.disabled) status.textContent = "离线页面尚未准备好，请联网后点击检查更新重试；当前页面仍可保存记录。";
    }, 8000);
    navigator.serviceWorker.ready.then(() => {
      clearTimeout(readyTimer);
      if (!checkButton.disabled) status.textContent = "离线页面已准备好；云同步仍需联网。";
      showUpdate();
    });
    checkButton.addEventListener("click", async () => {
      checkButton.disabled = true;
      status.textContent = "正在检查更新…";
      const hadActiveWorker = !!registration?.active;
      try {
        registration = await navigator.serviceWorker.register("./sw.js");
        await registration.update();
        const worker = registration.installing;
        if (worker && !["installed", "activated", "redundant"].includes(worker.state)) {
          await new Promise((resolve) => {
            const finish = () => { clearTimeout(timer); worker.removeEventListener("statechange", changed); resolve(); };
            const changed = () => { if (["installed", "activated", "redundant"].includes(worker.state)) finish(); };
            const timer = setTimeout(finish, 20000);
            worker.addEventListener("statechange", changed);
            changed();
          });
        }
        showUpdate();
        if (registration.waiting && navigator.serviceWorker.controller) status.textContent = "新版本已准备好，保存内容后可更新。";
        else if (worker?.state === "redundant") status.textContent = "未能准备更新，请稍后联网重试。";
        else if (registration.installing) status.textContent = "更新仍在准备，请稍后再检查。";
        else if (!registration.active) status.textContent = "离线页面尚未准备好，请稍后联网重试。";
        else if (!hadActiveWorker) status.textContent = "离线页面已准备好；云同步仍需联网。";
        else status.textContent = "目前没有检测到可用更新。";
      } catch {
        status.textContent = "检查更新失败，请确认网络后重试；本地记录不受影响。";
      } finally {
        checkButton.disabled = false;
      }
    });
  } catch (error) {
    status.textContent = "离线页面准备失败，请联网后重新打开页面；记录仍保存在当前浏览器。";
    checkButton.classList.add("hidden");
    console.warn("Offline setup failed", error);
  }
}

function canActivateUpdate() {
  try {
    collectBackupDrafts();
    return true;
  } catch {
    document.getElementById("offlineStatus").textContent = "暂不能更新：草稿尚未保存、无法读取或与其他标签页冲突。请先保留当前内容并处理草稿提示。";
    return false;
  }
}

function initUIMode() {
  const saved = String(localStorage.getItem(UI_MODE_KEY) || "quick").trim().toLowerCase();
  setUIMode(saved === "full" ? "full" : "quick");
}

function setUIMode(mode) {
  const nextMode = mode === "full" ? "full" : "quick";
  localStorage.setItem(UI_MODE_KEY, nextMode);
  document.body.classList.toggle("quick-mode", nextMode === "quick");

  if (el.modeQuick) {
    el.modeQuick.classList.toggle("active", nextMode === "quick");
    el.modeQuick.setAttribute("aria-pressed", String(nextMode === "quick"));
  }

  if (el.modeFull) {
    el.modeFull.classList.toggle("active", nextMode === "full");
    el.modeFull.setAttribute("aria-pressed", String(nextMode === "full"));
  }

  if (el.quickModeBanner) {
    el.quickModeBanner.classList.toggle("hidden", nextMode !== "quick");
  }

  if (el.intentDetails) {
    el.intentDetails.open = nextMode === "full";
  }
  document.getElementById("secondaryWorkspace").open = nextMode === "full";
  document.getElementById("fullOutputDetails").open = nextMode === "full";
}

function initWorkspaceDraftStatus() {
  const wr = document.getElementById("wrDraftBadge");
  const patch = document.getElementById("patchDraftBadge");
  const dojo = document.getElementById("dojoDraftBadge");
  const update = () => {
    const parts = [];
    if (!wr.classList.contains("hidden")) parts.push(`周复盘${wr.textContent.includes("冲突") ? "草稿冲突" : "有草稿"}`);
    if (!patch.classList.contains("hidden")) parts.push(`Patch${patch.textContent.includes("冲突") ? "草稿冲突" : "有草稿"}`);
    if (!dojo.classList.contains("hidden")) parts.push(`训练${dojo.textContent.includes("冲突") ? "输入冲突" : "有输入"}`);
    document.getElementById("workspaceDraftStatus").textContent = parts.length ? ` · ${parts.join("、")}` : "";
  };
  const observer = new MutationObserver(update);
  for (const badge of [wr, patch, dojo]) observer.observe(badge, { attributes: true, attributeFilter: ["class"], childList: true, characterData: true, subtree: true });
  update();
}

function bindEvents() {
  document.getElementById("goToDaily")?.addEventListener("click", () => {
    const title = document.getElementById("dailyInputTitle");
    title.focus({ preventScroll: true });
    title.scrollIntoView({ block: "start", behavior: "auto" });
  });
  document.getElementById("goToWorkspace")?.addEventListener("click", () => {
    const workspace = document.getElementById("secondaryWorkspace");
    workspace.open = true;
    const summary = workspace.querySelector("summary");
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ block: "start", behavior: "auto" });
  });
  document.getElementById("exportRawRecovery")?.addEventListener("click", exportRawRecovery);
  document.getElementById("openSyncSettings")?.addEventListener("click", () => {
    document.getElementById("secondaryWorkspace").open = true;
    const details = document.getElementById("dataSettings");
    details.open = true;
    details.scrollIntoView({ block: "start", behavior: "auto" });
  });
  document.getElementById("retrySync")?.addEventListener("click", async (event) => {
    const settings = loadSyncSettings();
    if (!settings.token || !settings.gistId) {
      document.getElementById("syncNoticeText").textContent = "请先在同步设置中填写 Token 和 Gist ID。";
      return;
    }
    const button = event.currentTarget;
    button.disabled = true;
    document.getElementById("syncNoticeText").textContent = "正在重试同步，本地记录仍可使用。";
    try { await syncNowInternal(settings, { reason: "重试同步", showStatus: true }); }
    finally { button.disabled = false; }
  });
  document.getElementById("selectCopyFallback")?.addEventListener("click", () => {
    const field = document.getElementById("copyFallbackText");
    field.focus();
    field.select();
  });
  document.getElementById("closeCopyFallback")?.addEventListener("click", () => document.getElementById("copyFallback").close());
  document.getElementById("mergePendingBridge")?.addEventListener("click", mergePendingBridgeIntoDraft);
  document.getElementById("finishBridgeReview")?.addEventListener("click", finishBridgeReview);
  document.getElementById("finishBridgeReviewAtMetrics")?.addEventListener("click", finishBridgeReview);
  document.getElementById("reviewBridgeFields")?.addEventListener("click", () => {
    document.getElementById("optionalMetrics").open = true;
    const field = document.getElementById(document.getElementById("reviewBridgeFields").dataset.firstField || "sleepHours");
    field?.focus({ preventScroll: true });
    field?.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  document.getElementById("applyPendingBridge")?.addEventListener("click", () => {
    try {
      const current = localStorage.getItem(DRAFT_KEY);
      if (current !== dailyDraftSnapshot) { showDailyDraftConflict(); return; }
      if ((current !== null || dailyDraftSaveFailed) && !confirm("当前表单有未提交内容。继续将放弃这些内容并重新载入设备数据，是否继续？")) return;
      if (localStorage.getItem(DRAFT_KEY) !== dailyDraftSnapshot) { showDailyDraftConflict(); return; }
      localStorage.removeItem(DRAFT_KEY);
      dailyDraftSnapshot = null;
      window.location.reload();
    } catch (error) {
      document.getElementById("draftStatus").textContent = "无法清除草稿，请检查浏览器存储权限。";
    }
  });
  if (el.modeQuick) {
    el.modeQuick.addEventListener("click", () => setUIMode("quick"));
  }

  if (el.modeFull) {
    el.modeFull.addEventListener("click", () => setUIMode("full"));
  }

  if (el.form) {
    el.form.addEventListener("submit", onSubmit);
    el.form.addEventListener("invalid", (event) => {
      let parent = event.target.parentElement;
      let opened = false;
      while (parent && parent !== el.form) {
        if (parent.tagName === "DETAILS" && !parent.open) { parent.open = true; opened = true; }
        parent = parent.parentElement;
      }
      if (opened) {
        document.getElementById("dailyValidationStatus").textContent = "有可选项目需要检查，已展开对应区域。";
        const firstInvalid = Array.from(el.form.elements).find((field) => field.willValidate && !field.validity.valid);
        if (firstInvalid === event.target) {
          event.preventDefault();
          requestAnimationFrame(() => {
            if (event.target.isConnected && !event.target.validity.valid) {
              event.target.focus();
              event.target.reportValidity();
            }
          });
        }
      }
    }, true);
    el.form.addEventListener("input", () => { document.getElementById("dailyValidationStatus").textContent = ""; });
    el.form.addEventListener("input", saveDailyDraft);
    el.form.addEventListener("change", saveDailyDraft);
    el.form.addEventListener("click", (event) => {
      const button = event.target.closest("button[type='button']");
      if (button && button !== el.quickZeroDay && !["loadDailyRecord", "discardDailyDraft", "useTodayDate", "keepThisDailyDraft", "loadOtherDailyDraft"].includes(button.id)) setTimeout(saveDailyDraft, 0);
    });
  }

  document.getElementById("openPatch")?.addEventListener("click", () => {
    document.getElementById("secondaryWorkspace").open = true;
    const details = document.getElementById("patchDetails");
    details.open = true;
    details.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("loadDailyRecord")?.addEventListener("click", () => loadDailyRecord(el.date.value));
  document.getElementById("useTodayDate")?.addEventListener("click", () => {
    const today = localDateISO(new Date());
    if (el.date.value === today) return;
    if (!confirm("切换日期会保留当前表单内容。请确认这些内容适用于今天，并重新核对昨日 B、红灯和指标。是否继续？")) return;
    el.date.value = today;
    el.date.dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("dateSwitchHint").textContent = "日期已切换到今天，请重新选择昨日 B，并核对其他表单内容。";
  });
  document.getElementById("discardDailyDraft")?.addEventListener("click", discardDailyDraft);
  document.getElementById("keepThisDailyDraft")?.addEventListener("click", () => {
    if (confirm("将用当前页面的内容覆盖另一标签页保存的每日草稿。是否继续？")) saveDailyDraft(true);
  });
  document.getElementById("loadOtherDailyDraft")?.addEventListener("click", loadOtherDailyDraft);
  window.addEventListener("storage", (event) => {
    if (event.key === SYNC_SETTINGS_KEY || event.key === null) ensureSyncSettingsCurrent();
    if (event.key === null || [STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY, APPLE_SYNC_META_KEY].includes(event.key)) markSyncDataChanged();
    if (event.key === null || [STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY].includes(event.key)) markPlaybookOutputStale();
    if ((event.key === DRAFT_KEY || event.key === null) && event.newValue !== dailyDraftSnapshot) showDailyDraftConflict();
    if (event.key === STORAGE_KEY || event.key === null) {
      const entries = loadEntries();
      el.scoreboard.textContent = buildScoreboard(entries);
      renderTodayAction(entries);
      renderPatchReminder(entries);
      renderHistory(entries);
      renderYesterdayBContext();
      renderQuickFillCard();
      renderDailyRecordAvailability();
      document.getElementById("outputExternalNotice").classList.remove("hidden");
    }
    if (event.key === WR_STORAGE_KEY || event.key === null) renderWeeklyAvailability();
    if (event.key === PATCH_STORAGE_KEY || event.key === null) renderPatchAvailability();
    if (event.key === WR_STORAGE_KEY || event.key === null) markWorkflowOutputStale(WR_DRAFT_KEY);
    if (event.key === PATCH_STORAGE_KEY || event.key === null) markWorkflowOutputStale(PATCH_DRAFT_KEY);
    if (event.key === APPLE_SYNC_META_KEY || event.key === null) renderAppleSyncStatus();
    for (const key of [WR_DRAFT_KEY, PATCH_DRAFT_KEY, DOJO_DRAFT_KEY]) {
      if ((event.key === key || event.key === null) && event.newValue !== workflowDraftSnapshots.get(key)) showWorkflowDraftConflict(key);
    }
  });
  document.getElementById("keepWrDraft")?.addEventListener("click", () => keepWorkflowDraft(WR_DRAFT_KEY));
  document.getElementById("loadWrDraft")?.addEventListener("click", () => loadOtherWorkflowDraft(WR_DRAFT_KEY));
  document.getElementById("keepPatchDraft")?.addEventListener("click", () => keepWorkflowDraft(PATCH_DRAFT_KEY));
  document.getElementById("loadPatchDraft")?.addEventListener("click", () => loadOtherWorkflowDraft(PATCH_DRAFT_KEY));
  document.getElementById("keepDojoDraft")?.addEventListener("click", () => keepWorkflowDraft(DOJO_DRAFT_KEY));
  document.getElementById("loadDojoDraft")?.addEventListener("click", () => loadOtherWorkflowDraft(DOJO_DRAFT_KEY));
  document.getElementById("clearDojoDraft")?.addEventListener("click", clearDojoDraft);
  document.getElementById("copyTodayAction")?.addEventListener("click", (event) => {
    const steps = document.getElementById("todayActionSteps").textContent;
    const defense = document.getElementById("todayRedDefense");
    const text = defense.classList.contains("hidden") ? steps : `${steps}\n\n红灯防线：${document.getElementById("todayRedDefenseText").textContent}`;
    copyWithFeedback(text, event.currentTarget, "复制今天的行动");
  });
  document.getElementById("useTodayAction")?.addEventListener("click", () => useTodayAction(false));
  document.getElementById("markTodayActionDone")?.addEventListener("click", () => useTodayAction(true));
  document.getElementById("editTodayRecord")?.addEventListener("click", () => {
    loadDailyRecord(localDateISO(new Date()), true);
    renderTodayAction(loadEntries());
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      renderTodayAction(loadEntries());
      renderDailyRecordAvailability();
    }
  });
  document.getElementById("historySearch")?.addEventListener("input", () => {
    historyLimit = 12;
    renderHistory(loadEntries());
  });
  document.getElementById("historyMore")?.addEventListener("click", () => {
    historyLimit += 12;
    renderHistory(loadEntries());
  });
  document.getElementById("historyLess")?.addEventListener("click", () => {
    historyLimit = 12;
    renderHistory(loadEntries());
  });

  if (el.date) {
    el.date.addEventListener("change", () => {
      const changedDate = el.date.dataset.previousDate !== el.date.value;
      if (changedDate) el.form.querySelectorAll("input[name='bExecuted']").forEach((radio) => { radio.checked = false; });
      el.date.dataset.previousDate = el.date.value;
      const hasContent = Array.from(el.form.elements).some((field) => {
        if (!field.name || field.name === "date") return false;
        if (field.type === "radio") return field.checked && (field.name !== "ruin" || field.value !== "0");
        if (field.type === "checkbox") return field.checked;
        return ["INPUT", "TEXTAREA", "SELECT"].includes(field.tagName) && String(field.value || "").trim() !== "";
      });
      document.getElementById("dateSwitchHint").textContent = changedDate ? "日期已更改，请重新选择昨日 B；其他内容仍保留，请核对红灯和指标。" : (hasContent ? "请核对红灯和指标是否适用于所选日期。" : "");
      renderYesterdayBContext();
      renderQuickFillCard();
      renderIntentAssist();
      renderEngineSignal();
      renderSleepRuinAssist();
      renderDailyRecordAvailability();
    });
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
      const pending = hasPendingOutput();
      const external = hasExternalOutputChange();
      if ((pending || external) && !confirm(`${pending ? "表单有未提交内容。" : ""}${external ? "另一标签页更改了记录，当前结果可能已过期。" : ""}复制的是页面当前显示的 A/B/C/D。是否继续？`)) return;
      document.getElementById("copyNotice").textContent = pending || external ? "复制的是页面当前显示的结果，请核对日期与内容。" : "";
      copyWithFeedback(latestOutputText, el.copyOutput, "复制 A/B/C/D");
    });
  }

  if (el.copyLifeOS) {
    el.copyLifeOS.addEventListener("click", () => {
      const pending = hasPendingOutput();
      const external = hasExternalOutputChange();
      const entry = getFormData();
      const includeOutput = !pending && !external && outputMatchesDailyForm(entry);
      const packet = buildLifeOSPacket(entry, includeOutput ? latestOutputText : "");
      document.getElementById("copyNotice").textContent = !includeOutput && latestOutputText ? "复制内容使用当前表单；结果与表单不一致或可能过期，未附带结果。" : "";
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

  if (el.intentApplySuggestion) {
    el.intentApplySuggestion.addEventListener("click", onIntentApplySuggestion);
  }

  if (el.behaviorFromYesterdayB) {
    el.behaviorFromYesterdayB.addEventListener("click", onBehaviorFromYesterdayB);
  }

  if (el.resultDoneMinimal) {
    el.resultDoneMinimal.addEventListener("click", onResultDoneMinimal);
  }

  if (el.resultStartedMinimal) {
    el.resultStartedMinimal.addEventListener("click", onResultStartedMinimal);
  }

  if (el.copyAppleTemplate) {
    el.copyAppleTemplate.addEventListener("click", onCopyAppleTemplate);
  }

  if (el.copyMacBridgeCmd) {
    el.copyMacBridgeCmd.addEventListener("click", onCopyMacBridgeCmd);
  }

  const ruinRadios = document.querySelectorAll("input[name='ruin']");
  ruinRadios.forEach((radio) => radio.addEventListener("change", () => {
    toggleRuinCodes();
    renderIntentAssist();
    renderEngineSignal();
    renderQuickFillCard();
  }));

  const ruinCodeChecks = document.querySelectorAll("input[name='ruinCodes']");
  ruinCodeChecks.forEach((checkbox) => checkbox.addEventListener("change", () => {
    renderIntentAssist();
    renderEngineSignal();
    renderQuickFillCard();
  }));
  toggleRuinCodes();

  if (el.sleepHours) {
    el.sleepHours.addEventListener("input", () => {
      renderSleepRuinAssist();
      renderIntentAssist();
      renderEngineSignal();
    });
  }

  if (el.behavior) {
    el.behavior.addEventListener("input", () => {
      renderIntentAssist();
      renderEngineSignal();
    });
  }

  if (el.result) {
    el.result.addEventListener("input", () => {
      renderIntentAssist();
      renderEngineSignal();
    });
  }

  if (el.trainingMinutes) {
    el.trainingMinutes.addEventListener("input", () => {
      renderIntentAssist();
      renderEngineSignal();
    });
  }

  if (el.deepWorkMinutes) {
    el.deepWorkMinutes.addEventListener("input", () => {
      renderIntentAssist();
      renderEngineSignal();
    });
  }

  if (el.outputWords) {
    el.outputWords.addEventListener("input", () => {
      renderIntentAssist();
      renderEngineSignal();
    });
  }

  [el.appUsageMinutes, el.phoneUsageMinutes, el.macUsageMinutes, el.topAppName, el.topAppMinutes, el.steps, el.activeCalories, el.distanceKm]
    .filter(Boolean)
    .forEach((node) => {
      node.addEventListener("input", renderEngineSignal);
    });

  if (el.applySleepRuin) {
    el.applySleepRuin.addEventListener("click", () => {
      applySleepRuinRule(true);
      renderIntentAssist();
    });
  }

  if (el.wrForm) {
    el.wrForm.addEventListener("submit", onWrSubmit);
    ["input", "change"].forEach((eventName) => el.wrForm.addEventListener(eventName, (event) => {
      if (WR_SCORE_FIELDS.has(event.target.name)) {
        wrScoreTouched.add(event.target.name);
        document.getElementById("wrAutofillStatus").textContent = "指标已手动调整；重新带入时请核对日期和周期。";
      }
      if (!["savedWeeklyPicker", "weeklyTargetOnly"].includes(event.target.id)) saveWorkflowDraft(el.wrForm, WR_DRAFT_KEY, "wrDraftStatus", "wrDraftBadge");
    }));
  }
  el.wrWeekRange?.addEventListener("input", () => {
    selectedWeeklyRecord = null;
    renderWeeklyAvailability();
    document.getElementById("wrPeriodStatus").textContent = "周期已更改；现有复盘内容、指标、实验和结果不会自动更新，请核对或载入此周期的记录。";
  });
  document.getElementById("wrPreviousWeek")?.addEventListener("click", () => shiftWeeklyPeriod(-7));
  document.getElementById("wrNextWeek")?.addEventListener("click", () => shiftWeeklyPeriod(7));
  document.getElementById("loadWeeklyRecord")?.addEventListener("click", () => loadWeeklyRecord(el.wrWeekRange.value.trim()));
  document.getElementById("savedWeeklyPicker")?.addEventListener("change", (event) => {
    event.stopPropagation();
    const option = event.currentTarget.selectedOptions[0];
    if (option?.value) {
      const index = Number(option.value) - 1;
      if (document.getElementById("weeklyTargetOnly").checked) selectWeeklySaveTarget(index, option.dataset.signature);
      else loadWeeklyRecord(null, index, option.dataset.signature);
    }
    event.currentTarget.value = "";
  });

  if (el.wrAutofill) {
    el.wrAutofill.addEventListener("click", onWrAutofill);
  }
  document.getElementById("wrPeriodAutofill")?.addEventListener("click", onWrPeriodAutofill);
  document.getElementById("suggestExperiment")?.addEventListener("click", onSuggestExperiment);
  document.getElementById("suggestPeriodExperiment")?.addEventListener("click", onSuggestPeriodExperiment);

  if (el.copyWrOutput) {
    el.copyWrOutput.addEventListener("click", () => {
      if (!latestWrOutputText) {
        alert("先生成一次 WR-10 结果。");
        return;
      }
      if (!document.getElementById("wrOutputPending").classList.contains("hidden") && !confirm("周复盘输入或记录可能已更改，复制的是当前显示的旧结果。是否继续？")) return;
      copyWithFeedback(latestWrOutputText, el.copyWrOutput, "复制 WR-10");
    });
  }

  if (el.patchForm) {
    el.patchForm.addEventListener("submit", onPatchSubmit);
    ["input", "change"].forEach((eventName) => el.patchForm.addEventListener(eventName, (event) => {
      if (event.target.id !== "savedPatchPicker") saveWorkflowDraft(el.patchForm, PATCH_DRAFT_KEY, "patchDraftStatus", "patchDraftBadge");
    }));
  }
  document.getElementById("savedPatchPicker")?.addEventListener("change", (event) => {
    event.stopPropagation();
    const picker = event.currentTarget;
    const option = picker.selectedOptions[0];
    if (option?.value !== "") loadPatchRecord(Number(option.value), option.dataset.signature);
    picker.value = "";
  });

  if (el.copyPatchOutput) {
    el.copyPatchOutput.addEventListener("click", () => {
      if (!latestPatchOutputText) {
        alert("先生成一次 Patch 规则。");
        return;
      }
      if (!document.getElementById("patchOutputPending").classList.contains("hidden") && !confirm("Patch 输入或记录可能已更改，复制的是当前显示的旧结果。是否继续？")) return;
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
      if (!document.getElementById("playbookOutputPending").classList.contains("hidden") && !confirm("月份或记录已更改，复制的是上次生成的 Playbook。是否继续？")) return;
      copyWithFeedback(latestPlaybookOutputText, el.copyPlaybook, "复制 Playbook");
    });
  }
  el.playbookMonth?.addEventListener("change", markPlaybookOutputStale);

  if (el.dojoForm) {
    el.dojoForm.addEventListener("submit", onDojoSubmit);
    ["input", "change"].forEach((eventName) => el.dojoForm.addEventListener(eventName, () => {
      markDojoOutputStale();
      saveWorkflowDraft(el.dojoForm, DOJO_DRAFT_KEY, "dojoDraftStatus", "dojoDraftBadge");
    }));
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
      if (!document.getElementById("dojoOutputPending").classList.contains("hidden") && !confirm("训练输入已更改，复制的是上次生成的脚本。是否继续？")) return;
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
  el.importFile?.addEventListener("change", renderBackupPreview);
  document.getElementById("restoreBackupDrafts")?.addEventListener("change", renderBackupPreview);

  if (el.syncSave) {
    el.syncSave.addEventListener("click", onSyncSaveSettings);
  }
  document.getElementById("syncClear")?.addEventListener("click", clearLocalSyncSettings);
  document.getElementById("loadOtherSyncConfig")?.addEventListener("click", () => {
    if (!confirm("载入最新同步配置会替换当前页面的配置输入。是否继续？")) return;
    try {
      hydrateSyncSettingsForm();
      document.getElementById("syncConfigConflict").classList.add("hidden");
      renderSyncStatus("已载入最新同步配置，请核对后再操作。");
    } catch { renderSyncStatus("无法读取同步配置；当前输入仍保留。"); }
  });

  if (el.syncInit) {
    el.syncInit.addEventListener("click", onSyncInitCloud);
  }

  if (el.syncNow) {
    el.syncNow.addEventListener("click", onSyncNow);
  }
}

function hasPendingOutput() {
  return !document.getElementById("outputPending").classList.contains("hidden");
}

function hasExternalOutputChange() {
  return !document.getElementById("outputExternalNotice").classList.contains("hidden");
}

function outputMatchesDailyForm(entry) {
  if (!latestOutputText || !latestOutputDate || latestOutputDate !== entry.date) return false;
  const record = loadEntries().find((item) => item.date === entry.date);
  if (!record || record.output?.text !== latestOutputText) return false;
  const normalized = { ...record, ruinCodes: Array.isArray(record.ruinCodes) ? record.ruinCodes : [] };
  return buildDlText(entry) === buildDlText(normalized);
}

function renderDailyRecordAvailability() {
  const record = loadEntries().find((item) => item.date === el.date.value);
  const button = document.getElementById("loadDailyRecord");
  const hint = document.getElementById("loadDailyHint");
  if (!button || !hint) return;
  document.getElementById("useTodayDate").disabled = el.date.value === localDateISO(new Date());
  button.disabled = !record;
  hint.textContent = record ? `${record.date} 已有记录，可以载入后修改。` : "所选日期暂无保存的记录。";
}

function loadDailyRecord(date, focusForm = false) {
  const record = loadEntries().find((item) => item.date === date);
  if (!record) { renderDailyRecordAvailability(); return; }
  try {
    const current = localStorage.getItem(DRAFT_KEY);
    if ((current !== null || dailyDraftSaveFailed) && !confirm("载入记录会替换当前表单里的未提交内容。是否继续？")) return;
  } catch {
    document.getElementById("draftStatus").textContent = "无法读取草稿，暂未载入记录。";
    return;
  }
  el.date.value = record.date;
  el.date.dataset.previousDate = record.date;
  document.getElementById("dateSwitchHint").textContent = "";
  for (const field of el.form.elements) {
    if (!field.name || field.name === "date") continue;
    const value = record[field.name];
    if (field.type === "radio") field.checked = field.name === "bExecuted" && value == null ? field.value === "unknown" : value !== null && value !== undefined && String(value) === field.value;
    else if (field.type === "checkbox") field.checked = Array.isArray(value) && value.includes(field.value);
    else if (field.tagName === "INPUT" || field.tagName === "TEXTAREA" || field.tagName === "SELECT") field.value = value ?? "";
  }
  toggleRuinCodes();
  renderAll(loadEntries(), record.output || null, record.date);
  renderYesterdayBContext();
  renderQuickFillCard();
  renderIntentAssist();
  renderEngineSignal();
  renderSleepRuinAssist();
  renderDailyRecordAvailability();
  if (saveDailyDraft()) document.getElementById("draftStatus").textContent = "已载入记录；修改后请点击保存。";
  if (focusForm) {
    el.date.focus({ preventScroll: true });
    el.form.scrollIntoView({ block: "start", behavior: "auto" });
  }
}

function showDailyDraftConflict() {
  dailyDraftSaveFailed = true;
  document.getElementById("dailyDraftConflict").classList.remove("hidden");
  document.getElementById("draftStatus").textContent = "当前页面的草稿尚未保存，请先处理另一标签页的更改。";
}

function saveDailyDraft(allowOverwrite = false) {
  document.getElementById("outputPending").classList.toggle("hidden", !latestOutputText);
  const fields = Array.from(el.form.elements)
    .filter((field) => field.name && !field.disabled && field.type !== "file")
    .map((field) => ({ name: field.name, type: field.type, value: field.value, checked: field.checked }));
  try {
    if (localStorage.getItem(DRAFT_KEY) !== dailyDraftSnapshot && allowOverwrite !== true) {
      showDailyDraftConflict();
      return false;
    }
    const next = JSON.stringify(fields);
    localStorage.setItem(DRAFT_KEY, next);
    dailyDraftSnapshot = next;
    dailyDraftSaveFailed = false;
    document.getElementById("dailyDraftConflict").classList.add("hidden");
    document.getElementById("draftStatus").textContent = "草稿已保存在当前浏览器";
    return true;
  } catch (error) {
    dailyDraftSaveFailed = true;
    document.getElementById("draftStatus").textContent = "草稿保存失败，请检查浏览器存储空间或权限。";
    return false;
  }
}

function discardDailyDraft() {
  try {
    if (localStorage.getItem(DRAFT_KEY) !== dailyDraftSnapshot) { showDailyDraftConflict(); return; }
  } catch {
    document.getElementById("draftStatus").textContent = "无法读取草稿，请检查浏览器存储权限。";
    return;
  }
  if (!confirm("将清空当前表单并放弃未提交的每日草稿。已保存的记录不会删除。是否继续？")) return;
  try {
    if (localStorage.getItem(DRAFT_KEY) !== dailyDraftSnapshot) { showDailyDraftConflict(); return; }
    localStorage.removeItem(DRAFT_KEY);
    dailyDraftSnapshot = null;
    dailyDraftSaveFailed = false;
  } catch {
    document.getElementById("draftStatus").textContent = "无法清除草稿，请检查浏览器存储权限。";
    return;
  }
  el.form.reset();
  el.date.value = localDateISO(new Date());
  el.date.dataset.previousDate = el.date.value;
  document.getElementById("dateSwitchHint").textContent = "";
  toggleRuinCodes();
  renderDailyRecordAvailability();
  renderYesterdayBContext();
  renderQuickFillCard();
  renderIntentAssist();
  renderEngineSignal();
  renderSleepRuinAssist();
  document.getElementById("draftStatus").textContent = "未提交内容已清空，已保存的记录不受影响。";
  document.getElementById("outputPending").classList.add("hidden");
}

function restoreDailyDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    dailyDraftSnapshot = raw;
    dailyDraftSaveFailed = false;
    if (raw === null) return false;
    const fields = JSON.parse(raw);
    if (!Array.isArray(fields)) throw new Error("Invalid draft");
    const controls = Array.from(el.form.elements);
    for (const saved of fields) {
      const field = controls.find((item) => item.name === saved.name && item.type === saved.type &&
        ((item.type !== "radio" && item.type !== "checkbox") || item.value === saved.value));
      if (!field) continue;
      if (field.type === "radio" || field.type === "checkbox") field.checked = !!saved.checked;
      else field.value = saved.value;
    }
    document.getElementById("draftStatus").textContent = "已恢复未提交的草稿，请核对日期后提交。";
    return true;
  } catch (error) {
    document.getElementById("draftStatus").textContent = "草稿无法读取，原有记录不受影响。";
    return true;
  }
}

function loadOtherDailyDraft() {
  try {
    if (!confirm("将放弃当前页面尚未保存的内容，并载入浏览器中最新的每日草稿。是否继续？")) return;
    const raw = localStorage.getItem(DRAFT_KEY);
    const fields = raw === null ? null : JSON.parse(raw);
    if (fields !== null && (!Array.isArray(fields) || fields.some((item) => !item || typeof item !== "object" || Array.isArray(item)))) throw new Error("Invalid draft");
    el.form.reset();
    el.date.value = localDateISO(new Date());
    restoreDailyDraft();
    el.date.dataset.previousDate = el.date.value;
    toggleRuinCodes();
    renderAll(loadEntries());
    renderYesterdayBContext();
    renderQuickFillCard();
    renderIntentAssist();
    renderEngineSignal();
    renderSleepRuinAssist();
    document.getElementById("dailyDraftConflict").classList.add("hidden");
    document.getElementById("draftStatus").textContent = raw === null ? "另一标签页已清除草稿，当前表单已重置。" : "已载入浏览器中最新的每日草稿。";
  } catch {
    document.getElementById("draftStatus").textContent = "载入未完成，请检查当前表单；已保存的记录不受影响。";
  }
}

function clearDailyDraft() {
  try {
    if (localStorage.getItem(DRAFT_KEY) !== dailyDraftSnapshot) {
      showDailyDraftConflict();
      document.getElementById("draftStatus").textContent = "记录已保存，另一标签页的草稿仍保留。";
      return;
    }
    localStorage.removeItem(DRAFT_KEY);
    dailyDraftSnapshot = null;
    dailyDraftSaveFailed = false;
    document.getElementById("dailyDraftConflict").classList.add("hidden");
    document.getElementById("draftStatus").textContent = "记录已保存，草稿已清除。";
  } catch (error) {
    document.getElementById("draftStatus").textContent = "记录已保存，但草稿清除失败。";
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
  if (!confirmDailyOverwrite(entries, entry.date)) return;
  const output = buildLifeOSOutput(entry);
  entry.output = output;
  entry.createdAt = new Date().toISOString();

  const nextEntries = upsertEntryByDate(entries, entry);
  if (!saveDailyEntries(nextEntries)) return;
  clearDailyDraft();
  renderAll(nextEntries, output, entry.date);
  renderYesterdayBContext();
  showSavedOutputOnSmallScreen();
  void maybeAutoSync("DL");
}

function onZeroDay() {
  if (!el.form.reportValidity()) return;
  const entry = getFormData();

  if (!entry.behavior || !entry.result) {
    alert("Zero-Day 至少填写“行为”和“结果”两项。");
    return;
  }

  entry.zeroDay = true;
  entry.intent = "";
  entry.ruinCodes = entry.ruin === 1 ? entry.ruinCodes : [];
  if (entry.ruin === 1 && entry.ruinCodes.length === 0) {
    alert("RUIN=1 时，请至少勾选一个 RUIN 码（S/T/P）。");
    return;
  }

  const entries = loadEntries();
  if (!confirmDailyOverwrite(entries, entry.date)) return;
  const output = buildLifeOSOutput(entry);
  entry.output = output;
  entry.createdAt = new Date().toISOString();

  const nextEntries = upsertEntryByDate(entries, entry);
  if (!saveDailyEntries(nextEntries)) return;
  clearDailyDraft();
  renderAll(nextEntries, output, entry.date);
  renderYesterdayBContext();
  showSavedOutputOnSmallScreen();
  void maybeAutoSync("Zero-Day");
}

function showSavedOutputOnSmallScreen() {
  if (!window.matchMedia("(max-width: 1024px)").matches) return;
  const outputCard = document.getElementById("outputCard");
  if (!outputCard) return;
  outputCard.focus({ preventScroll: true });
  outputCard.scrollIntoView({ block: "start", behavior: "auto" });
}

function confirmDailyOverwrite(entries, date) {
  const previous = entries.find((item) => item.date === date);
  if (!previous) return true;
  return confirm(`${date} 已有一条记录：\n行为：${previous.behavior || "（空）"}\n结果：${previous.result || "（空）"}\n\n继续会用当前表单覆盖当天记录。是否继续？`);
}

function saveDailyEntries(entries) {
  try {
    saveEntries(entries);
    return true;
  } catch (error) {
    document.getElementById("draftStatus").textContent = "记录保存失败，请检查浏览器存储空间；请勿关闭页面，并先复制当前内容。";
    return false;
  }
}

function workflowDraftInfo(key) {
  if (key === DOJO_DRAFT_KEY) return { form: el.dojoForm, statusId: "dojoDraftStatus", badgeId: "dojoDraftBadge", conflictId: "dojoDraftConflict" };
  return key === WR_DRAFT_KEY
    ? { form: el.wrForm, statusId: "wrDraftStatus", badgeId: "wrDraftBadge", conflictId: "wrDraftConflict" }
    : { form: el.patchForm, statusId: "patchDraftStatus", badgeId: "patchDraftBadge", conflictId: "patchDraftConflict" };
}

function showWorkflowDraftConflict(key) {
  workflowDraftSaveFailed.add(key);
  const info = workflowDraftInfo(key);
  document.getElementById(info.conflictId).classList.remove("hidden");
  document.getElementById(info.statusId).textContent = "当前页面的草稿尚未保存，请先处理另一标签页的更改。";
  const badge = document.getElementById(info.badgeId);
  badge.textContent = " · 草稿冲突";
  badge.classList.remove("hidden");
}

function saveWorkflowDraft(form, key, statusId, badgeId, allowOverwrite = false) {
  markWorkflowOutputStale(key);
  const fields = Array.from(form.elements).filter((field) => field.name && !field.disabled)
    .map((field) => ({ name: field.name, value: field.value, ...(key === WR_DRAFT_KEY && WR_SCORE_FIELDS.has(field.name) ? { touched: wrScoreTouched.has(field.name) } : {}) }));
  try {
    if (localStorage.getItem(key) !== workflowDraftSnapshots.get(key) && !allowOverwrite) {
      showWorkflowDraftConflict(key);
      return false;
    }
    const next = JSON.stringify(fields);
    localStorage.setItem(key, next);
    workflowDraftSnapshots.set(key, next);
    workflowDraftSaveFailed.delete(key);
    document.getElementById(workflowDraftInfo(key).conflictId).classList.add("hidden");
    document.getElementById(statusId).textContent = "草稿已保存在当前浏览器。";
    const badge = document.getElementById(badgeId);
    badge.textContent = " · 有草稿";
    badge.classList.remove("hidden");
    return true;
  } catch {
    workflowDraftSaveFailed.add(key);
    document.getElementById(statusId).textContent = "草稿保存失败，请检查浏览器存储空间或权限。";
    return false;
  }
}

function keepWorkflowDraft(key) {
  const info = workflowDraftInfo(key);
  if (confirm("将用当前页面的内容覆盖另一标签页保存的草稿。是否继续？")) {
    saveWorkflowDraft(info.form, key, info.statusId, info.badgeId, true);
  }
}

function clearDojoDraft() {
  try {
    if (localStorage.getItem(DOJO_DRAFT_KEY) !== workflowDraftSnapshots.get(DOJO_DRAFT_KEY)) { showWorkflowDraftConflict(DOJO_DRAFT_KEY); return; }
    if (!confirm("清除本机保存的训练输入？页面上已生成的脚本会暂时保留。")) return;
    if (localStorage.getItem(DOJO_DRAFT_KEY) !== workflowDraftSnapshots.get(DOJO_DRAFT_KEY)) { showWorkflowDraftConflict(DOJO_DRAFT_KEY); return; }
    localStorage.removeItem(DOJO_DRAFT_KEY);
    workflowDraftSnapshots.set(DOJO_DRAFT_KEY, null);
    workflowDraftSaveFailed.delete(DOJO_DRAFT_KEY);
    el.dojoForm.reset();
    document.getElementById("dojoDraftConflict").classList.add("hidden");
    document.getElementById("dojoDraftBadge").classList.add("hidden");
    document.getElementById("dojoDraftStatus").textContent = "训练输入已清除；已生成的脚本仍在当前页面。";
    markDojoOutputStale();
  } catch {
    document.getElementById("dojoDraftStatus").textContent = "无法清除训练输入，请检查浏览器存储权限；当前表单仍保留。";
  }
}

function loadOtherWorkflowDraft(key) {
  const info = workflowDraftInfo(key);
  try {
    if (!confirm("将放弃当前页面尚未保存的内容，并载入浏览器中最新的草稿。是否继续？")) return;
    const raw = localStorage.getItem(key);
    const fields = raw === null ? null : JSON.parse(raw);
    if (fields !== null && (!Array.isArray(fields) || fields.some((item) => !item || typeof item !== "object" || Array.isArray(item)))) throw new Error("Invalid draft");
    info.form.reset();
    if (key === WR_DRAFT_KEY) el.wrWeekRange.value = defaultWeekRange(new Date());
    else if (key === PATCH_DRAFT_KEY) el.patchStartDate.value = localDateISO(new Date());
    restoreWorkflowDraft(info.form, key, info.statusId, info.badgeId);
    if (key === DOJO_DRAFT_KEY) markDojoOutputStale();
    else markWorkflowOutputStale(key);
    if (key === WR_DRAFT_KEY) renderWeeklyAvailability();
    document.getElementById(info.conflictId).classList.add("hidden");
    document.getElementById(info.statusId).textContent = raw === null ? "另一标签页已清除草稿，当前表单已重置。" : "已载入浏览器中最新的草稿。";
    const badge = document.getElementById(info.badgeId);
    badge.textContent = " · 有草稿";
    badge.classList.toggle("hidden", raw === null);
  } catch {
    document.getElementById(info.statusId).textContent = "载入未完成，请检查当前表单；已保存的记录不受影响。";
  }
}

function restoreWorkflowDraft(form, key, statusId, badgeId) {
  try {
    const raw = localStorage.getItem(key);
    workflowDraftSnapshots.set(key, raw);
    workflowDraftSaveFailed.delete(key);
    if (key === WR_DRAFT_KEY) wrScoreTouched.clear();
    if (raw === null) return;
    const fields = JSON.parse(raw);
    if (!Array.isArray(fields)) throw new Error("Invalid draft");
    for (const saved of fields) {
      const field = Array.from(form.elements).find((item) => item.name === saved.name);
      if (field && typeof saved.value === "string") field.value = saved.value;
      if (key === WR_DRAFT_KEY && WR_SCORE_FIELDS.has(saved.name) && saved.touched !== false) wrScoreTouched.add(saved.name);
    }
    document.getElementById(statusId).textContent = key === DOJO_DRAFT_KEY ? "已恢复上次训练输入，可以重新生成脚本。" : "已恢复未提交草稿，请检查内容后保存。";
    document.getElementById(badgeId).classList.remove("hidden");
  } catch {
    document.getElementById(statusId).textContent = "草稿无法读取，已有记录不受影响。";
  }
}

function clearWorkflowDraft(key, statusId, badgeId) {
  try {
    if (localStorage.getItem(key) !== workflowDraftSnapshots.get(key)) {
      showWorkflowDraftConflict(key);
      document.getElementById(statusId).textContent = "记录已保存，另一标签页的草稿仍保留。";
      return;
    }
    localStorage.removeItem(key);
    workflowDraftSnapshots.set(key, null);
    workflowDraftSaveFailed.delete(key);
    document.getElementById(workflowDraftInfo(key).conflictId).classList.add("hidden");
    document.getElementById(statusId).textContent = "记录已保存，草稿已清除。";
    document.getElementById(badgeId).textContent = " · 有草稿";
    document.getElementById(badgeId).classList.add("hidden");
  } catch {
    document.getElementById(statusId).textContent = "记录已保存，但草稿清除失败。";
  }
}

function onWrSubmit(event) {
  event.preventDefault();
  const data = getWrData();
  if (data.bObserved !== null && (data.bObserved < data.bDone || data.bObserved > data.dlDone)) {
    alert("B 可判断天数应不少于 B 执行天数，且不超过 DL 完成天数。");
    return;
  }
  const entries = loadCollection(WR_STORAGE_KEY);
  const matches = matchingWeeklyRecords(entries, data.weekRange);
  const exactMatches = matches.filter((item) => item.weekRange === data.weekRange);
  let existing = null;
  let selectedIndex = -1;
  if (selectedWeeklyRecord && selectedWeeklyRecord.weekRange === data.weekRange) {
    selectedIndex = selectedWeeklyRecord.index;
    if (!entries[selectedIndex] || JSON.stringify(entries[selectedIndex]) !== selectedWeeklyRecord.signature) {
      document.getElementById("wrPeriodStatus").textContent = "所选记录已变化，请重新选择后再保存；当前输入仍保留。";
      renderWeeklyAvailability();
      return;
    }
    existing = entries[selectedIndex];
  } else if (exactMatches.length === 1) existing = exactMatches[0];
  else if (!exactMatches.length && matches.length === 1) existing = matches[0];
  else if (matches.length > 1) {
    document.getElementById("wrPeriodStatus").textContent = "这个日期范围已有多份周复盘，请先从已保存的周期中选择要修改的记录。";
    return;
  }
  if (existing) {
    const others = matches.length > 1 ? "其他同日期记录会保留。\n" : "";
    if (!confirm(`已有周复盘：${existing.weekRange}\n最有效动作：${shortenIntentText(existing.bestAction, 50) || "未填写"}\n当前列表第 ${entries.indexOf(existing) + 1} 条；继续将覆盖这条记录。\n${others}是否继续？`)) return;
    data.weekRange = existing.weekRange;
    el.wrWeekRange.value = existing.weekRange;
  }

  const outputText = buildWrOutput(data);
  const entry = {
    ...data,
    outputText,
    createdAt: new Date().toISOString()
  };

  const next = entries.slice();
  const replaceIndex = selectedIndex >= 0 ? selectedIndex : entries.indexOf(existing);
  if (replaceIndex >= 0) next[replaceIndex] = entry;
  else next.unshift(entry);
  next.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  try { saveCollection(WR_STORAGE_KEY, next); } catch {
    document.getElementById("wrDraftStatus").textContent = "保存失败，请检查浏览器存储空间；请勿关闭页面，并先复制当前内容。";
    return;
  }
  latestWrOutputText = outputText;
  setModuleOutput(el.wrOutput, outputText, "提交 WR-10 后显示周总结与下周执行稿");
  document.getElementById("wrOutputPending").classList.add("hidden");
  selectedWeeklyRecord = null;
  clearWorkflowDraft(WR_DRAFT_KEY, "wrDraftStatus", "wrDraftBadge");
  renderWeeklyAvailability();
  void maybeAutoSync("WR-10");
}

function renderWeeklyAvailability() {
  const records = loadCollection(WR_STORAGE_KEY);
  const matches = matchingWeeklyRecords(records, el.wrWeekRange.value);
  const exact = matches.filter((item) => item.weekRange === el.wrWeekRange.value.trim());
  const record = exact.length === 1 ? exact[0] : (matches.length === 1 ? matches[0] : null);
  document.getElementById("loadWeeklyRecord").disabled = !record;
  document.getElementById("loadWeeklyHint").textContent = matches.length > 1 ? "此日期范围有多份周复盘，请从下方选择要载入的记录。" : record ? `此周期已有周复盘（${record.weekRange}），可以载入后修改。` : "此周期暂无已保存的周复盘。";
  const picker = document.getElementById("savedWeeklyPicker");
  const available = records.map((record, index) => ({record, index})).filter(({record}) => typeof record.weekRange === "string" && record.weekRange.trim());
  picker.replaceChildren(new Option(available.length ? "选择已保存的周复盘" : "暂无已保存的周复盘", ""));
  available.forEach(({record, index}) => {
    const label = `${record.weekRange} · ${shortenIntentText(record.bestAction, 32) || "未填写动作"} · 第 ${index + 1} 条`;
    const option = new Option(label, String(index + 1));
    option.dataset.signature = JSON.stringify(record);
    picker.add(option);
  });
  picker.disabled = available.length === 0;
}

function loadWeeklyRecord(period, chosenIndex = null, signature = null) {
  const entries = loadCollection(WR_STORAGE_KEY);
  const matches = period === null ? [] : matchingWeeklyRecords(entries, period);
  const exact = matches.filter((item) => item.weekRange === period);
  const record = chosenIndex === null ? (exact.length === 1 ? exact[0] : (matches.length === 1 ? matches[0] : null)) : entries[chosenIndex];
  if (chosenIndex !== null && (!record || JSON.stringify(record) !== signature)) {
    renderWeeklyAvailability();
    document.getElementById("wrPeriodStatus").textContent = "记录已变化，请重新选择；当前输入未更改。";
    return;
  }
  if (!record) { renderWeeklyAvailability(); return; }
  try {
    const current = localStorage.getItem(WR_DRAFT_KEY);
    if ((current !== null || workflowDraftSaveFailed.has(WR_DRAFT_KEY)) && !confirm("载入记录会替换当前未提交的周复盘内容。是否继续？")) return;
  } catch {
    document.getElementById("wrDraftStatus").textContent = "无法读取草稿，暂未载入记录。";
    return;
  }
  el.wrWeekRange.value = record.weekRange;
  selectedWeeklyRecord = {index: entries.indexOf(record), signature: JSON.stringify(record), weekRange: record.weekRange};
  for (const field of el.wrForm.elements) {
    if (!field.name?.startsWith("wr") || field.name === "wrWeekRange") continue;
    const suffix = field.name.slice(2);
    const key = suffix.charAt(0).toLowerCase() + suffix.slice(1);
    field.value = record[key] ?? "";
  }
  wrScoreTouched.clear();
  for (const field of el.wrForm.elements) if (WR_SCORE_FIELDS.has(field.name)) wrScoreTouched.add(field.name);
  document.getElementById("wrPeriodStatus").textContent = "已载入此周期的周复盘，请核对内容。";
  document.getElementById("wrAutofillStatus").textContent = "已载入保存的周复盘；重新带入近 7 天数据前请核对周期。";
  latestWrOutputText = typeof record.outputText === "string" ? record.outputText : "";
  setModuleOutput(el.wrOutput, latestWrOutputText, "此周期尚无保存的周复盘结果。");
  saveWorkflowDraft(el.wrForm, WR_DRAFT_KEY, "wrDraftStatus", "wrDraftBadge");
  document.getElementById("wrOutputPending").classList.toggle("hidden", !latestWrOutputText || buildWrOutput(getWrData()) === latestWrOutputText);
  renderWeeklyAvailability();
}

function selectWeeklySaveTarget(index, signature) {
  const entries = loadCollection(WR_STORAGE_KEY);
  const record = entries[index];
  const status = document.getElementById("wrPeriodStatus");
  if (!record || JSON.stringify(record) !== signature) {
    selectedWeeklyRecord = null;
    renderWeeklyAvailability();
    status.textContent = "记录已变化，请重新选择；当前输入未更改。";
    return;
  }
  if (record.weekRange !== el.wrWeekRange.value.trim()) {
    selectedWeeklyRecord = null;
    status.textContent = "所选记录的周期与当前输入不完全相同；请先核对并填写相同的周期。当前输入未更改。";
    return;
  }
  selectedWeeklyRecord = {index, signature, weekRange: record.weekRange};
  status.textContent = `已指定保存目标：${record.weekRange} · ${shortenIntentText(record.bestAction, 50) || "未填写动作"} · 第 ${index + 1} 条。当前输入未更改；保存时会再次确认。`;
}

function onWrAutofill() {
  const end = localDateISO(new Date());
  applyWeeklyAutofill({ start: shiftDateISO(end, -6), end }, "近 7 天");
}

function onWrPeriodAutofill() {
  const period = parseWeeklyPeriod(el.wrWeekRange.value);
  if (!period) {
    document.getElementById("wrAutofillStatus").textContent = "请将周期填写为连续 7 天，例如 2026-11-02 ~ 2026-11-08；也可以选择带入近 7 天。";
    return;
  }
  applyWeeklyAutofill(period, "复盘周期");
}

function shiftWeeklyPeriod(days) {
  const period = parseWeeklyPeriod(el.wrWeekRange.value);
  if (!period) {
    document.getElementById("wrPeriodStatus").textContent = "请先填写连续 7 天的日期范围，例如 2026-11-02 ~ 2026-11-08，再切换周期。";
    return;
  }
  const dates = [shiftDateISO(period.start, days), shiftDateISO(period.end, days)];
  let index = 0;
  el.wrWeekRange.value = el.wrWeekRange.value.replace(/\d{4}-\d{2}-\d{2}/g, () => dates[index++]);
  el.wrWeekRange.dispatchEvent(new Event("input", { bubbles: true }));
}

function parseWeeklyPeriod(value) {
  const match = value.trim().match(/^(?:Week of\s*)?(\d{4}-\d{2}-\d{2})\s*[~～至]\s*(\d{4}-\d{2}-\d{2})$/i);
  const validDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    return !Number.isNaN(date.getTime()) && localDateISO(date) === value;
  };
  if (!match || !validDate(match[1]) || !validDate(match[2]) || shiftDateISO(match[1], 6) !== match[2]) return null;
  return { start: match[1], end: match[2] };
}

function matchingWeeklyRecords(records, value) {
  const input = String(value || "").trim();
  const period = parseWeeklyPeriod(input);
  return records.filter((item) => {
    if (typeof item.weekRange !== "string") return false;
    if (item.weekRange.trim() === input) return true;
    const stored = parseWeeklyPeriod(item.weekRange);
    return period && stored && period.start === stored.start && period.end === stored.end;
  });
}

function applyWeeklyAutofill(period, source) {
  const snapshot = getScoreSnapshot(loadEntries(), period);

  if (!snapshot.hasData) {
    document.getElementById("wrAutofillStatus").textContent = `${period.start} 至 ${period.end} 没有 DL 数据，已有指标未更改。`;
    return;
  }

  const values = [
    [el.wrDlDone, String(snapshot.dl), "DL 完成"],
    [el.wrBDone, String(snapshot.b), "B 执行"],
    [document.getElementById("wrBObserved"), String(snapshot.bObserved), "B 可判断天数"],
    [el.wrRuinDays, String(snapshot.ruinDays), "红灯天数"],
    [el.wrCodeS, String(snapshot.codeCount.S), "S 码次数"],
    [el.wrCodeT, String(snapshot.codeCount.T), "T 码次数"],
    [el.wrCodeP, String(snapshot.codeCount.P), "P 码次数"],
    [el.wrSleepPass, snapshot.sleepPass === null ? "" : String(snapshot.sleepPass), "Sleep 底线"],
    [el.wrTrainingPass, snapshot.trainingPass === null ? "" : String(snapshot.trainingPass), "Training"],
    [el.wrOutputPass, snapshot.outputPass === null ? "" : String(snapshot.outputPass), "Output"]
  ].filter(([field]) => !!field);
  const changed = values.filter(([field, next]) => {
    const initial = field.tagName === "SELECT" ? (Array.from(field.options).find((option) => option.defaultSelected)?.value ?? field.options[0]?.value ?? "") : field.defaultValue;
    return field.value !== next && (field.value !== initial || wrScoreTouched.has(field.name));
  });
  if (changed.length && !confirm(`以下已填写的指标将被${source}统计替换：${changed.map((item) => item[2]).join("、")}。\n统计日期：${period.start} 至 ${period.end}。\n是否继续？`)) return;
  for (const [field, value] of values) field.value = value;
  const saved = saveWorkflowDraft(el.wrForm, WR_DRAFT_KEY, "wrDraftStatus", "wrDraftBadge");
  document.getElementById("wrAutofillStatus").textContent = `已带入${source} ${period.start} 至 ${period.end} 的数据；请核对上方周期。${saved ? "草稿已保存。" : "草稿尚未保存，请查看提示。"}`;
}

function onSuggestExperiment() {
  const end = localDateISO(new Date());
  suggestExperiment({ start: shiftDateISO(end, -6), end }, "近 7 天");
}

function onSuggestPeriodExperiment() {
  const period = parseWeeklyPeriod(el.wrWeekRange.value);
  if (!period) {
    document.getElementById("experimentHint").textContent = "请先将上方周期填写为连续 7 天，例如 2026-11-02 ~ 2026-11-08；也可以选择近 7 天生成。";
    return;
  }
  suggestExperiment(period, "复盘周期");
}

function suggestExperiment(period, source) {
  const fields = ["wrExpName", "wrExpHypothesis", "wrExpAction", "wrExpMetric"].map((id) => document.getElementById(id));
  if (fields.some((field) => field.value.trim()) && !confirm(`实验栏已有内容，生成草案会替换这四项。\n参考日期：${period.start} 至 ${period.end}。是否继续？`)) return;
  const snap = getScoreSnapshot(loadEntries(), period);
  let reason;
  let values;
  if (snap.ruinDays >= 2) {
    reason = `有 ${snap.ruinDays} 天标记红灯，先试一周低负荷启动。`;
    values = ["五分钟保底", "如果动作足够小，低状态时也更容易启动", "每天选一个关键动作，只做 5 分钟", "7 天中至少 5 天完成并记录"];
  } else if (snap.dl < 3) {
    reason = `有 ${snap.dl} 条记录，先尝试建立轻量记录习惯。`;
    values = ["固定时刻记录", "如果给记录一个固定时刻，更容易持续", "每天选一个方便的时刻，填写一条简短 DL-30", "7 天中至少 5 天完成记录"];
  } else if (snap.bObserved < 3) {
    reason = `有 ${snap.bObserved} 条记录包含明确的昨日 B 执行状态，先积累观察。`;
    values = ["记录执行状态", "如果每天如实记录执行情况，就能更清楚地找到阻力", "每天填写一条简短 DL-30，并选择昨日 B 状态", "7 天中至少 5 天完成记录"];
  } else if (snap.bFailed > 0) {
    reason = `有 ${snap.bFailed} 条记录标记昨日 B 未执行，先降低启动门槛。`;
    values = ["五分钟启动", "如果先做最小一步，开始执行的阻力会降低", "每天在固定时刻开始唯一 B，先做 5 分钟", "7 天中至少 5 天完成启动并记录"];
  } else {
    reason = `已有 ${snap.dl} 条记录，先维持已有节奏。`;
    values = ["维持一个动作", "如果保持单一小动作，更容易稳定延续", "每天在固定时刻执行唯一 B，不超过 15 分钟", "7 天中至少 5 天完成并记录"];
  }
  fields.forEach((field, index) => { field.value = values[index]; });
  const saved = saveWorkflowDraft(el.wrForm, WR_DRAFT_KEY, "wrDraftStatus", "wrDraftBadge");
  document.getElementById("experimentHint").textContent = `参考${source} ${period.start} 至 ${period.end}：${reason}这只是草案，请按自己的情况修改。${saved ? "草稿已保存。" : "草稿尚未保存，请查看提示。"}`;
}

function renderPatchAvailability() {
  const records = loadCollection(PATCH_STORAGE_KEY);
  const picker = document.getElementById("savedPatchPicker");
  picker.replaceChildren(new Option(records.length ? "选择已保存的 Patch" : "暂无已保存的 Patch", ""));
  records.forEach((record, index) => {
    const option = new Option(`${record.startDate || "日期未知"} · ${shortenIntentText(record.fix, 45) || "未填写改动"}`, String(index));
    option.dataset.signature = JSON.stringify(record);
    picker.add(option);
  });
  picker.disabled = records.length === 0;
}

function loadPatchRecord(index, signature) {
  const record = loadCollection(PATCH_STORAGE_KEY)[index];
  const hint = document.getElementById("loadPatchHint");
  if (!record || JSON.stringify(record) !== signature) {
    renderPatchAvailability();
    hint.textContent = "记录已变化，请重新选择；当前输入未更改。";
    return;
  }
  try {
    if ((localStorage.getItem(PATCH_DRAFT_KEY) !== null || workflowDraftSaveFailed.has(PATCH_DRAFT_KEY)) && !confirm("载入记录会替换当前未提交的 Patch 内容。是否继续？")) return;
  } catch {
    hint.textContent = "无法读取草稿，暂未载入记录。";
    return;
  }
  for (const [id, key] of [["patchBottleneck", "bottleneck"], ["patchBreak", "breakPoint"], ["patchFix", "fix"], ["patchStartDate", "startDate"]]) {
    document.getElementById(id).value = record[key] ?? "";
  }
  latestPatchOutputText = typeof record.outputText === "string" ? record.outputText : "";
  setModuleOutput(el.patchOutput, latestPatchOutputText, "此记录没有保存的 Patch 结果。");
  const saved = saveWorkflowDraft(el.patchForm, PATCH_DRAFT_KEY, "patchDraftStatus", "patchDraftBadge");
  document.getElementById("patchOutputPending").classList.toggle("hidden", !latestPatchOutputText || buildPatchOutput(getPatchData()) === latestPatchOutputText);
  hint.textContent = `已载入历史记录；重新生成会新增一条记录，不会覆盖原记录。${saved ? "草稿已保存。" : "草稿尚未保存，请查看提示。"}`;
}

function onPatchSubmit(event) {
  event.preventDefault();
  const data = getPatchData();

  const outputText = buildPatchOutput(data);

  const entries = loadCollection(PATCH_STORAGE_KEY);
  entries.unshift({
    ...data,
    outputText,
    createdAt: new Date().toISOString()
  });
  try { saveCollection(PATCH_STORAGE_KEY, entries); } catch {
    document.getElementById("patchDraftStatus").textContent = "保存失败，请检查浏览器存储空间；请勿关闭页面，并先复制当前内容。";
    return;
  }
  latestPatchOutputText = outputText;
  setModuleOutput(el.patchOutput, outputText, "提交 System Patch 后显示新规则（<=3条）");
  document.getElementById("patchOutputPending").classList.add("hidden");
  clearWorkflowDraft(PATCH_DRAFT_KEY, "patchDraftStatus", "patchDraftBadge");
  renderPatchAvailability();
  void maybeAutoSync("Patch");
}

function onBuildPlaybook() {
  const month = el.playbookMonth?.value || localMonthISO(new Date());
  const outputText = buildPlaybookOutput(month);
  latestPlaybookOutputText = outputText;
  document.getElementById("playbookOutputPending").classList.add("hidden");
  setModuleOutput(el.playbookOutput, outputText, "点击“生成 Playbook v1 草案”后显示");
}

function markPlaybookOutputStale() {
  if (latestPlaybookOutputText) document.getElementById("playbookOutputPending").classList.remove("hidden");
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
  document.getElementById("dojoOutputPending").classList.add("hidden");
  setModuleOutput(el.dojoOutput, outputText, "提交场景后显示 Dojo 5轮脚本 + 评分规则");
}

function markDojoOutputStale() {
  if (latestDojoOutputText) document.getElementById("dojoOutputPending").classList.remove("hidden");
}

function onExportJson() {
  try {
    const backup = buildBackupPayload();
    let withDrafts = true;
    try { backup.drafts = collectBackupDrafts(); }
    catch (error) {
      withDrafts = false;
      if (!confirm(`无法完整备份草稿：${String(error?.message || error)}\n\n是否先导出已保存的记录（不含草稿）？`)) return;
    }
    const text = JSON.stringify(backup, null, 2);
    const filename = `lifeos-backup-${localDateISO(new Date())}.json`;
    downloadFile(filename, text, "application/json;charset=utf-8");
    setModuleOutput(el.dataOutput, `已导出 JSON（${withDrafts ? "含已保存草稿" : "仅记录，不含草稿"}）：${filename}`, "导出/导入结果会显示在这里");
  } catch (error) {
    setModuleOutput(el.dataOutput, `导出失败：${String(error?.message || error)}`, "导出/导入结果会显示在这里");
  }
}

function collectBackupDrafts() {
  if (dailyDraftSaveFailed || workflowDraftSaveFailed.size) throw new Error("有草稿未保存或存在冲突，请先处理后再导出完整备份。");
  const entries = [["daily", DRAFT_KEY, dailyDraftSnapshot], ["weekly", WR_DRAFT_KEY, workflowDraftSnapshots.get(WR_DRAFT_KEY)], ["patch", PATCH_DRAFT_KEY, workflowDraftSnapshots.get(PATCH_DRAFT_KEY)], ["dojo", DOJO_DRAFT_KEY, workflowDraftSnapshots.get(DOJO_DRAFT_KEY)]];
  const drafts = {};
  for (const [name, key, snapshot] of entries) {
    const raw = localStorage.getItem(key);
    if (raw !== snapshot) throw new Error("请先处理其他标签页的草稿冲突，再导出完整备份。");
    drafts[name] = raw === null ? null : JSON.parse(raw);
  }
  return validateBackupDrafts({ drafts });
}

function validateBackupDrafts(payload) {
  if (!Object.prototype.hasOwnProperty.call(payload, "drafts")) return null;
  const drafts = payload.drafts;
  if (!drafts || typeof drafts !== "object" || Array.isArray(drafts)) throw new Error("备份中的草稿格式无效，未修改现有数据。");
  for (const name of ["daily", "weekly", "patch", ...(Object.prototype.hasOwnProperty.call(drafts, "dojo") ? ["dojo"] : [])]) {
    const fields = drafts[name];
    if (fields === null) continue;
    if (!Array.isArray(fields) || fields.some((field) => !field || typeof field !== "object" || Array.isArray(field) || typeof field.name !== "string" || typeof field.value !== "string" || (name === "daily" && (typeof field.type !== "string" || typeof field.checked !== "boolean")))) {
      throw new Error(`备份中的 ${name} 草稿格式无效，未修改现有数据。`);
    }
  }
  return { daily: drafts.daily, weekly: drafts.weekly, patch: drafts.patch, ...(Object.prototype.hasOwnProperty.call(drafts, "dojo") ? { dojo: drafts.dojo } : {}) };
}

function onExportCsv() {
  try {
    assertCollectionsReadable();
    const csv = buildCsvExport();
    const filename = `lifeos-backup-${localDateISO(new Date())}.csv`;
    downloadFile(filename, `\uFEFF${csv}`, "text/csv;charset=utf-8");
    setModuleOutput(el.dataOutput, `已导出 CSV：${filename}`, "导出/导入结果会显示在这里");
  } catch (error) { setModuleOutput(el.dataOutput, `导出失败：${String(error?.message || error)}`, "导出/导入结果会显示在这里"); }
}

function onExportMarkdown() {
  try {
    assertCollectionsReadable();
    const markdown = buildMarkdownExport();
    const filename = `lifeos-backup-${localDateISO(new Date())}.md`;
    downloadFile(filename, markdown, "text/markdown;charset=utf-8");
    setModuleOutput(el.dataOutput, `已导出 Markdown：${filename}`, "导出/导入结果会显示在这里");
  } catch (error) { setModuleOutput(el.dataOutput, `导出失败：${String(error?.message || error)}`, "导出/导入结果会显示在这里"); }
}

function backupTimeDescription(payload) {
  if (typeof payload?.exportedAt !== "string" || !payload.exportedAt.trim()) return "备份时间未知";
  const date = new Date(payload.exportedAt);
  return Number.isNaN(date.getTime()) ? "备份时间未知" : `备份时间（本机时间）：${date.toLocaleString()}`;
}

async function renderBackupPreview() {
  const request = ++backupPreviewRequest;
  const preview = document.getElementById("backupPreview");
  const file = el.importFile?.files?.[0];
  if (!file) {
    preview.textContent = "选择备份后可在此预览，尚不会导入。";
    return;
  }
  preview.textContent = "正在检查备份…";
  try {
    const parsed = JSON.parse(await file.text());
    const data = validateBackup(parsed);
    const restoreDrafts = document.getElementById("restoreBackupDrafts").checked;
    const drafts = restoreDrafts ? validateBackupDrafts(parsed) : null;
    if (request !== backupPreviewRequest) return;
    const draftInfo = restoreDrafts ? (drafts ? `将恢复备份草稿，空草稿会清除本机对应草稿。${Object.prototype.hasOwnProperty.call(drafts, "dojo") ? "" : "备份不含训练输入，本机训练输入会保留。"}` : "备份没有草稿，本机草稿会保留。") : "本机草稿会保留。";
    preview.textContent = `备份预览：${file.name}；${backupTimeDescription(parsed)}；每日 ${data.dailyLogs.length} 条，周复盘 ${data.weeklyReviews.length} 条，Patch ${data.systemPatches.length} 条；Apple 同步数据${data.appleSyncMeta ? "有" : "无"}。${draftInfo}尚未导入。`;
  } catch (error) {
    if (request !== backupPreviewRequest) return;
    const reason = error instanceof SyntaxError ? "文件不是有效的 JSON。" : String(error?.message || error);
    preview.textContent = `无法预览备份：${reason} 尚未修改本机数据。`;
  }
}

async function onImportData() {
  const file = el.importFile?.files?.[0];
  if (!file) {
    alert("先选择一个 JSON 备份文件。");
    return;
  }

  try {
    const raw = await file.text();
    const parsed = JSON.parse(raw);
    const { dailyLogs, weeklyReviews, systemPatches, appleSyncMeta } = validateBackup(parsed);
    const restoreDrafts = document.getElementById("restoreBackupDrafts").checked;
    const drafts = restoreDrafts ? validateBackupDrafts(parsed) : null;
    const draftMessage = restoreDrafts ? (drafts ? `将替换当前每日、周复盘和 Patch 草稿；备份中为空的草稿会清除。${Object.prototype.hasOwnProperty.call(drafts, "dojo") ? "训练输入也会按备份恢复。" : "备份不含训练输入，本机训练输入保持不变。"}` : "该备份没有草稿，本机草稿保持不变。") : "本机草稿保持不变。";
    const currentCounts = `每日 ${loadEntries().length} 条、周复盘 ${loadCollection(WR_STORAGE_KEY).length} 条、Patch ${loadCollection(PATCH_STORAGE_KEY).length} 条`;
    const issueMessage = unreadableCollections.size ? `\n部分当前数据无法读取；${[STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY].some((key) => unreadableCollections.has(key)) ? "上述记录数量不完整；" : ""}导入会覆盖这些原始数据。请先用页面顶部的按钮下载原始数据供恢复。` : "";
    const exportAdvice = unreadableCollections.size ? "确认已保存可用于恢复的原始数据后再继续。" : "建议先导出当前 JSON。";
    const ok = confirm(`将用 ${file.name} 覆盖当前浏览器的数据。\n${backupTimeDescription(parsed)}。\n备份包含：每日 ${dailyLogs.length} 条、周复盘 ${weeklyReviews.length} 条、Patch ${systemPatches.length} 条。\n当前数据：${currentCounts}。${issueMessage}\n${draftMessage}\n${exportAdvice}确认覆盖？`);
    if (!ok) return;

    replaceBackupData({ dailyLogs, weeklyReviews, systemPatches, appleSyncMeta }, drafts);
    if (drafts) restoreImportedDrafts(drafts);

    renderAll(loadEntries());
    renderWorkflowPanels();
    renderYesterdayBContext();
    renderAppleSyncStatus();

    const summary = [
      `导入成功：${file.name}`,
      `DL：${dailyLogs.length} 条`,
      `WR：${weeklyReviews.length} 条`,
      `Patch：${systemPatches.length} 条`,
      `Apple同步：${appleSyncMeta ? "已恢复" : "无"}`,
      `草稿：${drafts ? "已恢复" : "保持不变"}`
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

function restoreImportedDrafts(drafts) {
  el.form.reset();
  el.date.value = localDateISO(new Date());
  const hasDailyDraft = restoreDailyDraft();
  el.date.dataset.previousDate = el.date.value;
  document.getElementById("dailyDraftConflict").classList.add("hidden");
  document.getElementById("dateSwitchHint").textContent = "";
  if (!hasDailyDraft) document.getElementById("draftStatus").textContent = "备份中没有每日草稿，表单已重置。";
  toggleRuinCodes();

  for (const key of [WR_DRAFT_KEY, PATCH_DRAFT_KEY, ...(Object.prototype.hasOwnProperty.call(drafts, "dojo") ? [DOJO_DRAFT_KEY] : [])]) {
    const info = workflowDraftInfo(key);
    info.form.reset();
    if (key === WR_DRAFT_KEY) el.wrWeekRange.value = defaultWeekRange(new Date());
    else if (key === PATCH_DRAFT_KEY) el.patchStartDate.value = localDateISO(new Date());
    const badge = document.getElementById(info.badgeId);
    badge.textContent = " · 有草稿";
    badge.classList.add("hidden");
    document.getElementById(info.conflictId).classList.add("hidden");
    document.getElementById(info.statusId).textContent = "备份中没有此草稿，表单已重置。";
    restoreWorkflowDraft(info.form, key, info.statusId, info.badgeId);
    if (key === DOJO_DRAFT_KEY) markDojoOutputStale();
  }
  if (!document.getElementById("pendingBridge").classList.contains("hidden")) {
    document.getElementById("bridgeConflicts").classList.add("hidden");
    document.getElementById("reviewBridgeFields").classList.add("hidden");
    document.getElementById("finishBridgeReview").classList.add("hidden");
    document.getElementById("finishBridgeReviewAtMetrics").classList.add("hidden");
    document.getElementById("mergePendingBridge").classList.remove("hidden");
    document.getElementById("applyPendingBridge").classList.remove("hidden");
    document.getElementById("pendingBridgeStatus").textContent = "草稿已恢复，设备链接仍待处理，请核对日期。";
  }
}

function validateBackup(payload) {
  const data = payload?.data ?? payload;
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("不是有效的 LifeOS 备份对象。");
  for (const key of ["dailyLogs", "weeklyReviews", "systemPatches"]) {
    if (!Array.isArray(data[key])) throw new Error(`备份缺少有效的 ${key} 列表，未修改现有数据。`);
    if (data[key].some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      throw new Error(`${key} 包含无效记录，未修改现有数据。`);
    }
  }
  const dates = new Set();
  for (const item of data.dailyLogs) {
    if (typeof item.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
        localDateISO(new Date(`${item.date}T00:00:00`)) !== item.date || dates.has(item.date)) {
      throw new Error("每日记录日期无效或重复，未修改现有数据。");
    }
    if (item.ruinCodes != null && (!Array.isArray(item.ruinCodes) || item.ruinCodes.some((code) => !CODE_ORDER.includes(code)))) {
      throw new Error("每日记录的红灯码格式无效，未修改现有数据。");
    }
    for (const key of ["behavior", "result", "intent", "topAppName", "createdAt"]) {
      if (item[key] != null && typeof item[key] !== "string") throw new Error(`每日记录 ${item.date} 的 ${key} 格式无效，未修改现有数据。`);
    }
    for (const key of ["bExecuted", "ruin"]) {
      if (item[key] != null && item[key] !== 0 && item[key] !== 1) throw new Error(`每日记录 ${item.date} 的 ${key} 不是 0 或 1，未修改现有数据。`);
    }
    for (const key of ["sleepHours", "trainingMinutes", "deepWorkMinutes", "outputWords", "appUsageMinutes", "phoneUsageMinutes", "macUsageMinutes", "topAppMinutes", "steps", "activeCalories", "distanceKm"]) {
      if (item[key] != null && (typeof item[key] !== "number" || !Number.isFinite(item[key]))) throw new Error(`每日记录 ${item.date} 的 ${key} 格式无效，未修改现有数据。`);
    }
    if (item.output != null) {
      if (typeof item.output !== "object" || Array.isArray(item.output) ||
          (item.output.text != null && typeof item.output.text !== "string") ||
          (item.output.b != null && (!Array.isArray(item.output.b) || item.output.b.some((step) => typeof step !== "string")))) {
        throw new Error(`每日记录 ${item.date} 的输出格式无效，未修改现有数据。`);
      }
    }
    dates.add(item.date);
  }
  for (const [name, entries] of [["周复盘", data.weeklyReviews], ["Patch", data.systemPatches]]) {
    for (const item of entries) {
      for (const key of ["createdAt", "outputText", ...(name === "周复盘" ? ["weekRange"] : ["startDate"])]) {
        if (item[key] != null && typeof item[key] !== "string") throw new Error(`${name}的 ${key} 格式无效，未修改现有数据。`);
      }
    }
  }
  if (data.appleSyncMeta != null && (typeof data.appleSyncMeta !== "object" || Array.isArray(data.appleSyncMeta))) {
    throw new Error("Apple 同步数据格式无效，未修改现有数据。");
  }
  return { dailyLogs: data.dailyLogs.slice().sort((a, b) => b.date.localeCompare(a.date)), weeklyReviews: data.weeklyReviews, systemPatches: data.systemPatches, appleSyncMeta: data.appleSyncMeta || null };
}

function replaceBackupData(data, drafts = null) {
  const replacements = new Map([
    [STORAGE_KEY, JSON.stringify(data.dailyLogs)],
    [WR_STORAGE_KEY, JSON.stringify(data.weeklyReviews)],
    [PATCH_STORAGE_KEY, JSON.stringify(data.systemPatches)],
    [APPLE_SYNC_META_KEY, data.appleSyncMeta ? JSON.stringify(data.appleSyncMeta) : null]
  ]);
  if (drafts) {
    for (const [key, value] of [[DRAFT_KEY, drafts.daily], [WR_DRAFT_KEY, drafts.weekly], [PATCH_DRAFT_KEY, drafts.patch]]) {
      replacements.set(key, value === null ? null : JSON.stringify(value));
    }
    if (Object.prototype.hasOwnProperty.call(drafts, "dojo")) replacements.set(DOJO_DRAFT_KEY, drafts.dojo === null ? null : JSON.stringify(drafts.dojo));
  }
  const original = new Map([...replacements.keys()].map((key) => [key, localStorage.getItem(key)]));
  const written = [];
  try {
    for (const [key, value] of replacements) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      written.push(key);
    }
  } catch (error) {
    let rollbackFailed = false;
    for (const key of written.reverse()) {
      try {
        const value = original.get(key);
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch { rollbackFailed = true; }
    }
    if (rollbackFailed) { markPlaybookOutputStale(); markSyncDataChanged(); }
    throw new Error(rollbackFailed ? "存储失败且无法完全恢复原数据，请立即检查本地记录。" : "存储失败，已恢复原有数据。请检查浏览器存储空间。");
  }
  if ([STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY].some((key) => original.get(key) !== replacements.get(key))) markPlaybookOutputStale();
  if ([STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY, APPLE_SYNC_META_KEY].some((key) => original.get(key) !== replacements.get(key))) markSyncDataChanged();
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
  const next = JSON.stringify({
    token: settings.token || "",
    gistId: settings.gistId || "",
    auto: Boolean(settings.auto)
  });
  localStorage.setItem(SYNC_SETTINGS_KEY, next);
  syncSettingsSnapshot = next;
}

function ensureSyncSettingsCurrent() {
  try {
    if (localStorage.getItem(SYNC_SETTINGS_KEY) === syncSettingsSnapshot) return true;
    document.getElementById("syncConfigConflict").classList.remove("hidden");
    renderSyncStatus("同步配置已在另一标签页更改；请先载入最新配置。");
  } catch { renderSyncStatus("无法读取同步配置，操作未进行；当前输入仍保留。"); }
  return false;
}

function syncTargetIsCurrent(settings) {
  const current = loadSyncSettings();
  return Boolean(current.token && current.gistId && current.token === settings.token && current.gistId === settings.gistId);
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
  const snapshot = localStorage.getItem(SYNC_SETTINGS_KEY);
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
  syncSettingsSnapshot = snapshot;
}

function renderSyncStatus(overrideMessage) {
  if (!el.syncOutput) {
    return;
  }

  if (overrideMessage) {
    setModuleOutput(el.syncOutput, overrideMessage, "尚未配置云同步");
    const activity = document.getElementById("syncActivity");
    activity.textContent = overrideMessage.split("\n")[0];
    activity.classList.remove("hidden");
    return;
  }

  const settings = loadSyncSettings();
  if (!settings.gistId || !settings.token) {
    setModuleOutput(el.syncOutput, "", "尚未配置云同步");
    document.getElementById("syncActivity").classList.add("hidden");
    return;
  }
  const activity = document.getElementById("syncActivity");
  activity.textContent = "云同步已配置；本次打开页面后尚未确认同步结果。";
  activity.classList.remove("hidden");

  const lines = [
    "云同步已配置",
    `Gist ID：${settings.gistId}`,
    `自动同步：${settings.auto ? "开启" : "关闭"}`,
    "建议：两端都点一次“同步现在（先拉后推）”后再开始日常使用。"
  ];
  setModuleOutput(el.syncOutput, lines.join("\n"), "尚未配置云同步");
}

function markSyncDataChanged() {
  const settings = loadSyncSettings();
  if (settings.token && settings.gistId) renderSyncStatus("本机数据已更改；尚未确认与云端同步。");
}

function onSyncSaveSettings() {
  if (!ensureSyncSettingsCurrent()) return;
  const settings = getSyncSettingsFromForm();
  try {
    saveSyncSettings(settings);
  } catch {
    renderSyncStatus("同步配置未能保存在当前浏览器。请检查存储空间或权限，表单内容仍在；解决后可重新保存。");
    return;
  }
  const lines = [
    "同步配置已保存",
    `Gist ID：${settings.gistId || "(未填)"}`,
    `自动同步：${settings.auto ? "开启" : "关闭"}`
  ];
  renderSyncStatus(lines.join("\n"));
}

function clearLocalSyncSettings() {
  if (!ensureSyncSettingsCurrent()) return;
  if (!confirm("将清除此浏览器保存的 Token、Gist ID 和自动同步设置，不会删除云仓或本地记录。已经开始的网络请求可能仍会完成。是否继续？")) return;
  if (!ensureSyncSettingsCurrent()) return;
  try {
    localStorage.removeItem(SYNC_SETTINGS_KEY);
    syncSettingsSnapshot = null;
    el.syncToken.value = "";
    el.syncGistId.value = "";
    el.syncAuto.checked = false;
    renderSyncStatus("已清除本机同步配置；云仓和本地记录仍保留。");
  } catch {
    renderSyncStatus("未能清除同步配置；请检查浏览器存储权限。");
  }
}

async function onSyncInitCloud() {
  const button = document.getElementById("syncInit");
  if (button.disabled) return;
  if (!ensureSyncSettingsCurrent()) return;
  const settings = getSyncSettingsFromForm();
  if (!settings.token) {
    alert("先填写 GitHub Token。");
    return;
  }
  if (settings.gistId && !confirm(`当前已填写云仓 ${settings.gistId}。初始化会创建新的云仓并在本机改用新 ID；原云仓仍会保留。是否继续？`)) return;
  if (!ensureSyncSettingsCurrent()) return;

  let initialStored;
  try { initialStored = localStorage.getItem(SYNC_SETTINGS_KEY); }
  catch { renderSyncStatus("初始化未开始：无法读取本机同步配置。"); return; }
  const initialForm = JSON.stringify([el.syncToken.value, el.syncGistId.value, el.syncAuto.checked]);

  button.disabled = true;
  renderSyncStatus("正在创建云仓，请稍候，不要重复操作。");
  try {
    const payload = buildBackupPayload();
    const gistId = await createCloudGist(settings.token, payload);
    let currentStored;
    try { currentStored = localStorage.getItem(SYNC_SETTINGS_KEY); }
    catch {
      renderSyncStatus(`云仓已创建，但无法读取本机配置，未切换设置。\n新 Gist ID：${gistId}\n请先记下此 ID，再检查存储权限。`);
      return;
    }
    if (currentStored !== initialStored || JSON.stringify([el.syncToken.value, el.syncGistId.value, el.syncAuto.checked]) !== initialForm) {
      renderSyncStatus(`云仓已创建，但等待期间同步配置发生变化，因此未切换本机设置。\n新 Gist ID：${gistId}\n请先记下 ID，再决定是否使用此云仓。`);
      return;
    }
    const next = { ...settings, gistId };
    el.syncGistId.value = gistId;
    try {
      saveSyncSettings(next);
    } catch {
      renderSyncStatus(`云仓已创建，但配置未能保存在当前浏览器。\nGist ID：${gistId}\n请先记下此 ID，再检查浏览器存储空间或权限，解决后点击“保存同步配置”。`);
      return;
    }
    hydrateSyncSettingsForm();
    renderSyncStatus(`初始化完成：已创建云仓\nGist ID：${gistId}\n现在可点“同步现在（先拉后推）”。`);
  } catch (error) {
    renderSyncStatus(`初始化失败：${String(error?.message || error)}`);
  } finally {
    button.disabled = false;
  }
}

async function onSyncNow() {
  if (!ensureSyncSettingsCurrent()) return;
  const settings = getSyncSettingsFromForm();
  if (!settings.token || !settings.gistId) {
    alert("先填写 Token 和 Gist ID，或点“初始化云仓”。");
    return;
  }
  try {
    saveSyncSettings(settings);
  } catch {
    renderSyncStatus("同步未开始：配置未能保存在当前浏览器。请检查存储空间或权限后重试；表单内容仍在。");
    return;
  }
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
  // Queue within the tab and, where supported, serialize other tabs on this site.
  const reason = options.reason || "同步";
  renderSyncStatus(`${reason}：正在等待同步…`);
  const run = syncQueue.catch(() => {}).then(async () => {
    if (!navigator.locks?.request) {
      renderSyncStatus(`${reason}：正在同步…`);
      return performSync(settings, options);
    }
    try {
      const scopePath = new URL("./", window.location.href).pathname;
      renderSyncStatus(`${reason}：正在等待同步；如果另一个标签页正在同步，会依次处理。`);
      return await navigator.locks.request(`lifeos-sync:${scopePath}`, () => {
        renderSyncStatus(`${reason}：正在同步…`);
        return performSync(settings, options);
      });
    } catch (error) {
      showSyncNotice(true);
      renderSyncStatus(`同步未开始：无法协调其他标签页，请稍后重试。${String(error?.message || error)}`);
    }
  });
  syncQueue = run;
  return run;
}

function showSyncNotice(failed) {
  const notice = document.getElementById("syncNotice");
  notice.classList.toggle("hidden", !failed);
  if (failed) document.getElementById("syncNoticeText").textContent = "本地记录仍可使用，请联网后重试同步。";
  try {
    if (failed) localStorage.setItem(SYNC_FAILURE_KEY, "1");
    else localStorage.removeItem(SYNC_FAILURE_KEY);
  } catch { /* the visible notice still works for this session */ }
}

async function performSync(settings, options = {}) {
  const reason = options.reason || "同步";
  const showStatus = options.showStatus !== false;

  try {
    if (!syncTargetIsCurrent(settings)) {
      renderSyncStatus("同步设置已更改；旧云仓的同步未开始，请使用当前设置重新同步。");
      return;
    }
    const cloud = await fetchCloudPayload(settings);
    if (!syncTargetIsCurrent(settings)) {
      renderSyncStatus("同步设置已更改；旧云仓的数据未合并或上传，请使用当前设置重新同步。");
      return;
    }
    // Read local data after the network request so edits made while fetching survive.
    const local = buildBackupPayload();
    const merged = mergeLocalAndCloud(local, cloud, { allowDailyConflictChoice: showStatus });
    if (!syncTargetIsCurrent(settings)) {
      renderSyncStatus("同步设置已更改；本次未合并或上传，请使用当前设置重新同步。");
      return;
    }
    if (JSON.stringify(buildBackupPayload().data) !== JSON.stringify(local.data)) throw new Error("同步期间本机数据发生变化，本次未合并或上传；请重新同步。");
    applyMergedPayload(merged);
    await pushCloudPayload(settings, merged);
    if (!syncTargetIsCurrent(settings)) {
      renderSyncStatus("同步设置已更改；旧云仓的上传已完成，但当前云仓尚未确认同步，请使用当前设置重新同步。");
      return;
    }
    if (JSON.stringify(buildBackupPayload().data) !== JSON.stringify(merged.data)) {
      showSyncNotice(true);
      document.getElementById("syncNoticeText").textContent = "同步期间本地数据又发生变化，新内容尚未包含在本次上传中。请再次同步。";
      renderSyncStatus(`${reason}已上传开始时的数据，但同步期间又有本地更改。请再次同步。`);
      return;
    }
    showSyncNotice(false);

    {
      const data = merged.data || {};
      const lines = [
        `${reason}完成（${new Date().toLocaleTimeString()}，本机时间）`,
        `DL：${ensureArray(data.dailyLogs).length} 条`,
        `WR：${ensureArray(data.weeklyReviews).length} 条`,
        `Patch：${ensureArray(data.systemPatches).length} 条`
      ];
      if (hasDuplicateWeeklyKeys(data.weeklyReviews)) lines.push("同周期多份周复盘已保留；如两端分别修改过，请手动核对各份内容。");
      renderSyncStatus(lines.join("\n"));
    }
  } catch (error) {
    if (!syncTargetIsCurrent(settings)) {
      renderSyncStatus("同步设置已更改；旧云仓的同步未确认完成，请使用当前设置重新同步。");
      return;
    }
    showSyncNotice(true);
    if (showStatus) {
      renderSyncStatus(`${reason}失败：${String(error?.message || error)}`);
    } else {
      console.warn("auto sync failed", error);
      renderSyncStatus(`${reason}失败：${String(error?.message || error)}\n本地记录仍可使用，请检查后手动重试。`);
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
  const file = files[SYNC_FILENAME];
  if (!file) {
    throw new Error(`云仓中没有 ${SYNC_FILENAME}，请检查 Gist ID。`);
  }

  let content = String(file.content || "");
  if (file.truncated && file.raw_url) {
    const { response: rawRes, text } = await fetchTextWithTimeout(file.raw_url, { headers: { Accept: "application/json,text/plain;q=0.9,*/*;q=0.8" } });
    if (!rawRes.ok) throw new Error(`读取云端文件失败（${rawRes.status}）。`);
    content = text;
  } else if (file.truncated) {
    throw new Error("云端文件不完整且没有下载地址。");
  }

  const parsed = JSON.parse(content);
  validateBackup(parsed);
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

  const { response: res, text } = await fetchTextWithTimeout(url, {
    ...options,
    headers
  });
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

async function fetchTextWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { response, text };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("请求超时，云端可能已收到操作；请联网后重新同步并核对。");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function mergeLocalAndCloud(localPayload, cloudPayload, options = {}) {
  const local = (localPayload && localPayload.data) ? localPayload.data : {};
  const cloud = (cloudPayload && cloudPayload.data) ? cloudPayload.data : cloudPayload;

  const mergedDaily = mergeDailyRecords(
    ensureArray(local.dailyLogs),
    ensureArray(cloud?.dailyLogs),
    options
  ).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const mergedWeekly = mergeWeeklyPreservingDuplicates(
    ensureArray(local.weeklyReviews),
    ensureArray(cloud?.weeklyReviews)
  ).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  const mergedPatches = mergeAppendOnlyRecords(
    ensureArray(local.systemPatches),
    ensureArray(cloud?.systemPatches)
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

function weeklySyncKey(item) {
  return String(item?.weekRange || item?.createdAt || JSON.stringify(item));
}

function stableRecordJson(value) {
  return JSON.stringify(value, (_key, item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    return Object.fromEntries(Object.keys(item).sort().map((key) => [key, item[key]]));
  });
}

function recordSavedTime(record) {
  const value = record?.createdAt;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return NaN;
  return Date.parse(value);
}

function mergeDailyRecords(localList, cloudList, options = {}) {
  const merged = new Map();
  const conflicts = new Map();
  for (const records of [localList, cloudList]) {
    const seen = new Set();
    for (const record of records) {
      const key = record?.date;
      if (typeof key !== "string" || !key || seen.has(key)) throw new Error("每日记录日期缺失或重复；同步未更改数据，请先导出备份并检查记录。");
      seen.add(key);
      const existing = merged.get(key);
      if (!existing) { merged.set(key, record); continue; }
      if (stableRecordJson(existing) === stableRecordJson(record)) continue;
      const oldTime = recordSavedTime(existing);
      const newTime = recordSavedTime(record);
      if (!Number.isFinite(oldTime) || !Number.isFinite(newTime) || oldTime === newTime) conflicts.set(key, {local: existing, cloud: record});
      else if (newTime > oldTime) merged.set(key, record);
    }
  }
  if (conflicts.size) {
    const dates = [...conflicts.keys()].slice(0, 3).join("、");
    const message = `每日记录 ${dates}${conflicts.size > 3 ? "等" : ""} 在两端内容不同，但保存时间缺失、无效或相同。同步未更改数据；请先在各设备导出备份，再在要保留版本的设备上手动同步并核对选择。`;
    if (!options.allowDailyConflictChoice) throw new Error(message);
    for (const [date, pair] of conflicts) {
      const describe = (record) => `行为：${shortenIntentText(record.behavior, 100) || "（空）"}\n结果：${shortenIntentText(record.result, 100) || "（空）"}`;
      if (!confirm(`${date} 的两端记录内容不同，无法按时间判断新旧。以下仅显示部分摘要；意图、指标和输出等其他内容也会被覆盖。建议先在各设备导出 JSON 备份，核对完整记录。\n\n本机：\n${describe(pair.local)}\n\n云端：\n${describe(pair.cloud)}\n\n确定：用本机这条覆盖云端同日记录。\n取消：停止同步，两端记录不变。`)) throw new Error(message);
    }
  }
  return [...merged.values()];
}

function mergeAppendOnlyRecords(localList, cloudList) {
  const merged = localList.slice();
  const localCounts = new Map();
  const cloudCounts = new Map();
  for (const record of localList) {
    const signature = JSON.stringify(record);
    localCounts.set(signature, (localCounts.get(signature) || 0) + 1);
  }
  for (const record of cloudList) {
    const signature = JSON.stringify(record);
    const count = (cloudCounts.get(signature) || 0) + 1;
    cloudCounts.set(signature, count);
    if (count > (localCounts.get(signature) || 0)) merged.push(record);
  }
  return merged;
}

function hasDuplicateWeeklyKeys(records) {
  const seen = new Set();
  return ensureArray(records).some((record) => {
    const key = weeklySyncKey(record);
    if (seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

function mergeWeeklyPreservingDuplicates(localList, cloudList) {
  const groups = new Map();
  for (const [side, records] of [["local", localList], ["cloud", cloudList]]) {
    for (const record of records) {
      const key = weeklySyncKey(record);
      if (!groups.has(key)) groups.set(key, {local: [], cloud: []});
      groups.get(key)[side].push(record);
    }
  }
  const merged = [];
  for (const group of groups.values()) {
    if (group.local.length <= 1 && group.cloud.length <= 1) {
      const local = group.local[0];
      const cloud = group.cloud[0];
      if (!local || !cloud) merged.push(local || cloud);
      else if (stableRecordJson(local) === stableRecordJson(cloud)) merged.push(local);
      else {
        const localTime = recordSavedTime(local);
        const cloudTime = recordSavedTime(cloud);
        if (Number.isFinite(localTime) && Number.isFinite(cloudTime) && localTime !== cloudTime) merged.push(cloudTime > localTime ? cloud : local);
        else merged.push(local, cloud);
      }
      continue;
    }
    // For ambiguous duplicate keys, preserve the greatest observed number of
    // each exact record. A changed copy remains alongside the original.
    merged.push(...mergeAppendOnlyRecords(group.local, group.cloud));
  }
  return merged;
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
  const data = validateBackup(payload);
  replaceBackupData(data);

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
    'cd "$HOME/Documents/ChatGPT/LifeOS"',
    "python3 scripts/macos_usage_bridge.py --open"
  ].join(" && ");
  await copyWithFeedback(cmd, el.copyMacBridgeCmd, "复制 Mac 自动采集命令");
}

function mayReplaceField(input, nextValue, label, replaceable = []) {
  const current = input.value.trim();
  if (!current || current === nextValue.trim() || replaceable.includes(current)) return true;
  return confirm(`${label}已有内容，继续会替换它。是否继续？`);
}

function onIntentDefault() {
  if (!el.intent) {
    return;
  }
  if (!mayReplaceField(el.intent, "", "明日意图")) return;
  el.intent.value = "";
  flashButton(el.intentDefault, "已切默认B");
  renderIntentAssist();
  renderEngineSignal();
}

function onIntentCarry() {
  if (!el.intent || !el.date) {
    return;
  }

  const previousEntry = getPreviousEntryForSelectedDate(loadEntries());

  if (!previousEntry) {
    alert("昨天没有记录，无法沿用。可直接点“不用写（默认B）”。");
    return;
  }

  const carryText = buildCarryIntent(previousEntry);
  if (!mayReplaceField(el.intent, carryText, "明日意图")) return;
  el.intent.value = carryText;
  flashButton(el.intentCarry, "已沿用");
  renderIntentAssist();
  renderEngineSignal();
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

  if (el.intent.value.trim() && !confirm("语音识别结果会替换现有明日意图。是否继续？")) return;

  const rec = new SpeechRecognition();
  rec.lang = "zh-CN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  const initialIntent = el.intent.value;
  const initialDate = el.date?.value;
  const voiceStatus = document.getElementById("intentVoiceStatus");
  voiceStatus.textContent = "正在听…";
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
    if (done) return;
    const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
    if (text) {
      if (el.intent.value !== initialIntent || el.date?.value !== initialDate) {
        voiceStatus.textContent = "识别期间意图或日期已更改，已保留当前内容；可重新进行语音输入。";
        return;
      }
      el.intent.value = text;
      el.intent.dispatchEvent(new Event("input", { bubbles: true }));
      renderIntentAssist();
      renderEngineSignal();
      voiceStatus.textContent = "已填入语音识别结果，请核对。";
    }
  };

  rec.onerror = () => {
    if (done) return;
    voiceStatus.textContent = "语音识别失败，请再试一次。";
    alert("语音识别失败，请再试一次。");
    restore();
  };

  rec.onend = () => {
    restore();
  };

  safetyTimer = setTimeout(() => {
    voiceStatus.textContent = "语音输入超时，请重试。";
    restore();
    try { rec.abort(); } catch { /* already stopped */ }
  }, 10000);

  try { rec.start(); }
  catch {
    voiceStatus.textContent = "无法启动语音输入，请检查浏览器和麦克风权限。";
    restore();
  }
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
  renderIntentAssist();
  renderEngineSignal();
}

function onIntentApplySuggestion() {
  if (!el.intent) {
    return;
  }

  const suggestion = buildIntentSuggestion(getFormData());
  if (!suggestion) {
    el.intent.value = "";
    flashButton(el.intentApplySuggestion, "留空即可");
    renderIntentAssist();
    renderEngineSignal();
    return;
  }

  el.intent.value = suggestion;
  flashButton(el.intentApplySuggestion, "已填入");
  renderIntentAssist();
  renderEngineSignal();
}

function onBehaviorFromYesterdayB() {
  if (!el.behavior) {
    return;
  }

  const previousEntry = getPreviousEntryForSelectedDate(loadEntries());
  if (!previousEntry) {
    alert("昨天没有记录，无法一键带入。");
    return;
  }

  const firstStep = getPrimaryBStep(previousEntry);
  const value = firstStep
    ? `执行昨日B：${firstStep}`
    : `继续昨天这块：${shortenIntentText(previousEntry.behavior || previousEntry.result || "最小动作", 28)}`;
  if (!mayReplaceField(el.behavior, value, "行为")) return;
  el.behavior.value = value;
  flashButton(el.behaviorFromYesterdayB, "已填行为");
  renderIntentAssist();
  renderEngineSignal();
}

function onResultDoneMinimal() {
  if (!el.result) {
    return;
  }

  const value = shouldUseRecoveryLanguage(getFormData())
    ? "完成恢复版最小动作，无加码"
    : "完成最小动作，推进了一小块";
  const presets = ["完成恢复版最小动作，无加码", "完成最小动作，推进了一小块", "只完成启动动作，但没有断更"];
  if (!mayReplaceField(el.result, value, "结果", presets)) return;
  el.result.value = value;
  flashButton(el.resultDoneMinimal, "已填结果");
  renderIntentAssist();
  renderEngineSignal();
}

function onResultStartedMinimal() {
  if (!el.result) {
    return;
  }

  const value = "只完成启动动作，但没有断更";
  const presets = ["完成恢复版最小动作，无加码", "完成最小动作，推进了一小块", value];
  if (!mayReplaceField(el.result, value, "结果", presets)) return;
  el.result.value = value;
  flashButton(el.resultStartedMinimal, "已填结果");
  renderIntentAssist();
  renderEngineSignal();
}

function buildIntentSuggestion(entry) {
  if (!entry) {
    return "";
  }

  if (entry.intent) {
    return entry.intent;
  }

  const signals = deriveExecutionSignals(entry);

  if (signals.sleepRed || entry.ruin === 1) {
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

  if (signals.attentionLeak) {
    return "先关干扰，再用10分钟单线程推进唯一动作";
  }

  if (signals.focus === "training") {
    return "先用10分钟训练启动，把身体拉起来";
  }

  if (entry.result) {
    return `把今天结果再推进一小步：${shortenIntentText(entry.result, 28)}`;
  }

  if (entry.behavior) {
    return `继续昨天这块：${shortenIntentText(entry.behavior, 28)}`;
  }

  return "";
}

function renderQuickFillCard() {
  if (!el.quickFillTitle || !el.quickFillText) {
    return;
  }

  const previousEntry = getPreviousEntryForSelectedDate(loadEntries());
  if (!previousEntry) {
    el.quickFillTitle.textContent = "今天最低阻力填法";
    el.quickFillText.textContent = "昨天还没有记录。今天只写最关键的行为和结果；如果很忙，直接走 Zero-Day 也可以。";
    if (el.behaviorFromYesterdayB) {
      el.behaviorFromYesterdayB.disabled = true;
    }
    return;
  }

  if (el.behaviorFromYesterdayB) {
    el.behaviorFromYesterdayB.disabled = false;
  }

  const firstStep = getPrimaryBStep(previousEntry);
  const summary = firstStep
    ? `如果你今天只是照着昨天的 B 往前推，先点“行为=昨天B”，再点“结果=完成最小动作”。昨日第一步是：${shortenIntentText(firstStep, 42)}`
    : "昨天有记录但没有可直接复用的 B 步骤；你可以继续沿用昨天那块内容，不必重想。";

  el.quickFillTitle.textContent = `今天最低阻力填法（参考 ${previousEntry.date}）`;
  el.quickFillText.textContent = summary;
}

function renderIntentAssist() {
  if (!el.intentAssistTitle || !el.intentAssistText) {
    return;
  }

  const entry = getFormData();
  if (entry.intent) {
    el.intentAssistTitle.textContent = "当前建议：你已经写够了";
    el.intentAssistText.textContent = `已写意图：${entry.intent}。不用再优化，系统会按这句继续生成 B。`;
    return;
  }

  const suggestion = buildIntentSuggestion(entry);

  if (!suggestion) {
    el.intentAssistTitle.textContent = "当前建议：可以直接留空";
    el.intentAssistText.textContent = "你现在不需要想“明天怎么写”。直接留空，系统会默认给 Output 优先的 B。";
    return;
  }

  el.intentAssistTitle.textContent = "当前建议：系统已经帮你写好一句";
  el.intentAssistText.textContent = suggestion;
}

function renderEngineSignal() {
  if (!el.engineSignalTitle || !el.engineSignalText) {
    return;
  }

  const signals = deriveExecutionSignals(getFormData());

  if (signals.sleepRed) {
    el.engineSignalTitle.textContent = "当前模式：睡眠红灯预警";
    el.engineSignalText.textContent = `睡眠低于 6.5h。即使你不手动勾 RUIN，系统也会把明日动作按 5 分钟保守版理解；建议直接按 S 防线处理。`;
    return;
  }

  if (signals.failureStreak >= 2) {
    el.engineSignalTitle.textContent = "当前模式：连续失败修复";
    el.engineSignalText.textContent = `最近连续 ${signals.failureStreak} 次 B=0。现在最重要的不是写更大计划，而是把启动动作缩到 2-5 分钟，并执行 WOOP-lite。`;
    return;
  }

  if (signals.focus === "input-control") {
    const formData = getFormData();
    const topApp = formData.topAppName ? `，先避开 ${formData.topAppName}` : "";
    el.engineSignalTitle.textContent = "当前默认B方向：Input control";
    el.engineSignalText.textContent = `设备数据更像注意力泄漏。留空时系统会先给“关干扰 + 单线程启动”的锚点动作${topApp}。`;
    return;
  }

  if (signals.focus === "training") {
    el.engineSignalTitle.textContent = "当前默认B方向：Training";
    el.engineSignalText.textContent = "今天更适合先把身体拉起来。留空时系统会优先给一个 10 分钟训练启动动作。";
    return;
  }

  if (signals.focus === "intent") {
    el.engineSignalTitle.textContent = "当前默认B方向：沿用你写的方向";
    el.engineSignalText.textContent = "你已经给了明确方向。系统会把 B 锁到这条主线，不再额外分散。";
    return;
  }

  el.engineSignalTitle.textContent = "当前默认B方向：Output";
  el.engineSignalText.textContent = `如果你留空，系统会按 ${signals.anchor} 的节奏，给你一个围绕同一块内容的锚点式输出动作。`;
}

function renderSleepRuinAssist() {
  if (!el.ruinAssist || !el.ruinAssistText) {
    return;
  }

  const sleepHours = toNumber(el.sleepHours?.value);
  if (sleepHours === null || sleepHours >= 6.5) {
    el.ruinAssist.classList.add("hidden");
    return;
  }

  el.ruinAssist.classList.remove("hidden");
  el.ruinAssistText.textContent = `检测到睡眠 ${sleepHours}h，已低于 6.5h 阈值。按规则建议切到 RUIN=1（S），并把明日 B 自动理解为 <=5 分钟。`;
}

function applySleepRuinRule(shouldFlashButton = false) {
  const sleepHours = toNumber(el.sleepHours?.value);
  if (sleepHours === null || sleepHours >= 6.5) {
    return false;
  }

  const ruinOne = document.querySelector("input[name='ruin'][value='1']");
  const sleepCode = document.querySelector("input[name='ruinCodes'][value='S']");
  if (ruinOne) {
    ruinOne.checked = true;
  }
  if (sleepCode) {
    sleepCode.checked = true;
  }
  toggleRuinCodes();
  renderSleepRuinAssist();
  renderQuickFillCard();
  renderEngineSignal();

  if (shouldFlashButton && el.applySleepRuin) {
    flashButton(el.applySleepRuin, "已切红灯");
  }

  return true;
}

function renderWoopLite(output) {
  if (!el.woopLiteCard || !el.woopLiteText) {
    return;
  }

  const woop = output?.woop || null;
  if (!woop) {
    el.woopLiteCard.classList.add("hidden");
    el.woopLiteText.textContent = "连续 2 天 B=0 时，这里会自动给出“障碍 -> if-then 计划”。";
    return;
  }

  el.woopLiteCard.classList.remove("hidden");
  el.woopLiteText.textContent = [
    `W：${woop.wish}`,
    `O：${woop.obstacle}`,
    `P：${woop.plan}`
  ].join("\n");
}

function getPreviousEntryForSelectedDate(entries) {
  const selectedDate = el.date?.value || localDateISO(new Date());
  const previousDate = shiftDateISO(selectedDate, -1);
  return entries.find((item) => item.date === previousDate) || null;
}

function getPrimaryBStep(entry) {
  if (!entry || !entry.output || !Array.isArray(entry.output.b)) {
    return "";
  }
  return String(entry.output.b[0] || "").trim();
}

function shouldUseRecoveryLanguage(entry) {
  if (!entry) {
    return false;
  }
  if (entry.ruin === 1) {
    return true;
  }
  const sleepHours = toNumber(entry.sleepHours);
  return sleepHours !== null && sleepHours < 6.5;
}

function mergePendingBridgeIntoDraft() {
  const params = new URLSearchParams(window.location.search);
  const date = getFirstDateParam(params, ["date", "logDate"]);
  const status = document.getElementById("pendingBridgeStatus");
  const parsedDate = new Date(`${date}T00:00:00`);
  if (!date || !Number.isFinite(parsedDate.getTime()) || localDateISO(parsedDate) !== date || date !== el.date.value) {
    status.textContent = "设备数据日期与草稿不同或无法确认。请先保存草稿，再继续处理设备数据。";
    return;
  }
  const fields = [
    [el.sleepHours, ["sleepHours", "sleep", "sleep_h"]],
    [el.trainingMinutes, ["trainingMinutes", "exerciseMinutes", "workoutMinutes"]],
    [el.deepWorkMinutes, ["deepWorkMinutes", "studyMinutes", "focusMinutes", "learningMinutes"]],
    [el.outputWords, ["outputWords", "words", "writingWords"]],
    [el.appUsageMinutes, ["appUsageMinutes", "softwareUsageMinutes", "usageMinutes", "screenMinutes"]],
    [el.phoneUsageMinutes, ["phoneUsageMinutes", "mobileUsageMinutes", "iosUsageMinutes"]],
    [el.macUsageMinutes, ["macUsageMinutes", "desktopUsageMinutes"]],
    [el.steps, ["steps", "stepCount"]],
    [el.activeCalories, ["activeCalories", "calories", "moveCalories"]],
    [el.distanceKm, ["distanceKm", "workoutDistanceKm", "distance"]]
  ];
  let filled = 0;
  let kept = 0;
  const conflicts = [];
  let firstConflictField = "";
  for (const [input, keys] of fields) {
    const value = getFirstNumericParam(params, keys);
    if (value === null || value < 0 || !input) continue;
    if (input.value !== "") {
      kept += 1;
      if (Number(input.value) !== value) {
        conflicts.push(`${input.closest("label")?.firstChild?.textContent.trim() || keys[0]}：表单 ${input.value}；设备 ${value}`);
        firstConflictField ||= input.id;
      }
    }
    else if (setNumericInputValue(input, value)) filled += 1;
  }
  const topApp = String(params.get("topAppName") || params.get("topApp") || "").trim();
  const topMinutes = getFirstNumericParam(params, ["topAppMinutes", "topAppUsageMinutes"]);
  const sameApp = !el.topAppName.value || (topApp && topApp === el.topAppName.value);
  if (topApp && el.topAppName) {
    if (el.topAppName.value !== "") {
      kept += 1;
      if (el.topAppName.value !== topApp) { conflicts.push(`头号应用：表单 ${el.topAppName.value}；设备 ${topApp}`); firstConflictField ||= "topAppName"; }
    }
    else if (!el.topAppMinutes.value) { el.topAppName.value = topApp; filled += 1; }
    else { kept += 1; conflicts.push(`设备头号应用 ${topApp} 未填入：表单已有头号应用分钟，请一并核对。`); firstConflictField ||= "topAppName"; }
  }
  if (topMinutes !== null && topMinutes >= 0 && el.topAppMinutes) {
    if (el.topAppMinutes.value !== "" || !sameApp || (!topApp && el.topAppName.value)) {
      kept += 1;
      if (!sameApp || (!topApp && el.topAppName.value) || Number(el.topAppMinutes.value) !== topMinutes) { conflicts.push(`头号应用分钟：表单 ${el.topAppMinutes.value || "（空）"}；设备 ${topMinutes}。请核对应用名称是否一致。`); firstConflictField ||= "topAppMinutes"; }
    }
    else { el.topAppMinutes.value = String(topMinutes); filled += 1; }
  }
  if (!filled && !kept) {
    status.textContent = "链接中没有可合并的有效设备数据，原草稿未改变。";
    return;
  }
  renderSleepRuinAssist();
  renderIntentAssist();
  renderEngineSignal();
  if (!saveDailyDraft()) {
    status.textContent = "合并后的草稿保存失败，请保留此页面并检查浏览器存储；设备链接仍在。";
    return;
  }
  document.getElementById("draftStatus").textContent = `设备数据已合并：填入 ${filled} 项，保留已填 ${kept} 项。请核对后保存记录。`;
  if (conflicts.length) {
    const preview = document.getElementById("bridgeConflicts");
    preview.textContent = `以下数值不同，表单暂时保留原值。你可以参考设备值手动修改表单：\n${conflicts.join("\n")}`;
    preview.classList.remove("hidden");
    document.getElementById("mergePendingBridge").classList.add("hidden");
    document.getElementById("applyPendingBridge").classList.add("hidden");
    document.getElementById("finishBridgeReview").classList.remove("hidden");
    document.getElementById("finishBridgeReviewAtMetrics").classList.remove("hidden");
    const reviewButton = document.getElementById("reviewBridgeFields");
    reviewButton.dataset.firstField = firstConflictField;
    reviewButton.classList.remove("hidden");
    status.textContent = "核对完成后点击“已核对”，再保存记录。设备链接在此之前会保留。";
    return;
  }
  finishBridgeReview();
}

function finishBridgeReview() {
  const date = getFirstDateParam(new URLSearchParams(window.location.search), ["date", "logDate"]);
  if (!date || date !== el.date.value) {
    document.getElementById("pendingBridgeStatus").textContent = "表单日期已改变；请切回设备数据日期后再完成核对。";
    return;
  }
  if (!saveDailyDraft()) {
    document.getElementById("pendingBridgeStatus").textContent = "草稿保存失败，请保留页面并检查浏览器存储；设备链接仍在。";
    return;
  }
  if (window.history?.replaceState) window.history.replaceState({}, "", window.location.pathname + window.location.hash);
  document.getElementById("pendingBridge").classList.add("hidden");
  document.getElementById("finishBridgeReviewAtMetrics").classList.add("hidden");
  document.getElementById("draftStatus").textContent = "设备数据已核对并保存为草稿，请确认后保存记录。";
}

function applyAppleAutofillFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params || params.toString().length === 0) {
    return;
  }

  if ((params.has("date") || params.has("logDate")) && !getFirstDateParam(params, ["date", "logDate"])) {
    document.getElementById("draftStatus").textContent = "设备数据的日期无效，尚未回填；请检查设备链接。";
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

  if (params.get("autoRuin") === "1") {
    applySleepRuinRule(false);
  }

  const meta = {
    source: payload.source || "external",
    syncedAt: new Date().toISOString(),
    date: payload.date || el.date?.value || "",
    autoRuin: params.get("autoRuin") === "1",
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

  renderSleepRuinAssist();
  renderIntentAssist();
  if (!saveDailyDraft()) {
    document.getElementById("draftStatus").textContent = "设备数据已填入但草稿保存失败，请保留页面并检查浏览器存储；设备链接仍在。";
    return;
  }
  let metadataSaved = false;
  try {
    readAppleSyncMetaStrict();
    localStorage.setItem(APPLE_SYNC_META_KEY, JSON.stringify(meta));
    markSyncDataChanged();
    metadataSaved = true;
  } catch { /* The draft is already saved; preserve any unreadable metadata. */ }
  if (metadataSaved) renderAppleSyncStatus(meta);
  else setModuleOutput(el.appleSyncStatus, "设备同步信息未更新；表单数据已保存为草稿，请检查浏览器存储空间、权限和页面提示。", "尚未接收 Apple 自动填充数据");
  document.getElementById("draftStatus").textContent = metadataSaved ? "设备数据已填入并保存为草稿，请核对后保存记录。" : "设备数据已保存为草稿，但设备同步信息未能保存；请检查存储空间、权限和页面提示。";

  if (window.history?.replaceState) {
    window.history.replaceState({}, "", window.location.pathname + window.location.hash);
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
  if (hasMetricValue(metrics.sleepHours) && Number(metrics.sleepHours) < 6.5) {
    rows.push("规则提示：睡眠低于 6.5h，建议按 RUIN=S 处理。");
  }
  if (
    (
      Number(metrics.appUsageMinutes) >= 240 ||
      Number(metrics.phoneUsageMinutes) >= 180 ||
      Number(metrics.topAppMinutes) >= 90
    ) &&
    hasMetricValue(metrics.deepWorkMinutes) && hasMetricValue(metrics.outputWords) &&
    Number(metrics.deepWorkMinutes) < 15 &&
    Number(metrics.outputWords) < 100
  ) {
    rows.push("规则提示：今天更像注意力泄漏；留空时系统会优先给输入控制型 B。");
  }
  if (
    [metrics.trainingMinutes, metrics.steps, metrics.activeCalories].every(hasMetricValue) &&
    Number(metrics.trainingMinutes) < 10 &&
    Number(metrics.steps) < 5000 &&
    Number(metrics.activeCalories) < 220
  ) {
    rows.push("规则提示：身体启动偏弱；留空时系统可能优先给短训练型 B。");
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

  if (meta.autoRuin === true) applySleepRuinRule(false);
  renderSleepRuinAssist();
  renderIntentAssist();
  renderEngineSignal();
}

function loadAppleSyncMeta() {
  try {
    return readAppleSyncMetaStrict();
  } catch {
    return null;
  }
}

function readAppleSyncMetaStrict() {
  try {
    const raw = localStorage.getItem(APPLE_SYNC_META_KEY);
    const parsed = raw === null ? null : JSON.parse(raw);
    if (parsed !== null && (typeof parsed !== "object" || Array.isArray(parsed))) throw new Error("invalid metadata");
    unreadableCollections.delete(APPLE_SYNC_META_KEY);
    renderStorageIssue();
    return parsed;
  } catch {
    unreadableCollections.add(APPLE_SYNC_META_KEY);
    renderStorageIssue();
    throw new Error("设备同步信息无法读取。原始数据未更改，请先下载原始数据供恢复。");
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
    const parsed = new Date(`${value}T00:00:00`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(parsed.getTime()) && localDateISO(parsed) === value) {
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
    bExecuted: ["0", "1"].includes(fd.get("bExecuted")) ? Number(fd.get("bExecuted")) : null,
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

function deriveExecutionSignals(entry, entries = loadEntries()) {
  const date = entry?.date || localDateISO(new Date());
  const previousEntry = entries.find((item) => item.date === shiftDateISO(date, -1)) || null;
  const merged = upsertEntryByDate(entries, {
    ...entry,
    date,
    createdAt: entry?.createdAt || new Date().toISOString()
  });

  const sleepHours = toNumber(entry.sleepHours);
  const trainingMinutes = toNumber(entry.trainingMinutes) || 0;
  const deepWorkMinutes = toNumber(entry.deepWorkMinutes) || 0;
  const outputWords = toNumber(entry.outputWords) || 0;
  const appUsageMinutes = toNumber(entry.appUsageMinutes) || 0;
  const phoneUsageMinutes = toNumber(entry.phoneUsageMinutes) || 0;
  const macUsageMinutes = toNumber(entry.macUsageMinutes) || 0;
  const topAppMinutes = toNumber(entry.topAppMinutes) || 0;
  const steps = toNumber(entry.steps) || 0;
  const activeCalories = toNumber(entry.activeCalories) || 0;

  const sleepRed = sleepHours !== null && sleepHours < 6.5;
  const outputKnown = hasMetricValue(entry.deepWorkMinutes) && hasMetricValue(entry.outputWords);
  const movementKnown = [entry.trainingMinutes, entry.steps, entry.activeCalories].every(hasMetricValue);
  const attentionLeak = (
    appUsageMinutes >= 240 ||
    phoneUsageMinutes >= 180 ||
    macUsageMinutes >= 240 ||
    topAppMinutes >= 90
  ) && outputKnown && deepWorkMinutes < 15 && outputWords < 100;

  const movementLow = movementKnown && trainingMinutes < 10 && steps < 5000 && activeCalories < 220;
  const failureStreak = countLatestFailureStreak(merged, date);
  const effectiveRed = entry.ruin === 1 || sleepRed;

  let focus = "output";
  let reason = "当前没有强异常信号，默认继续可见输出最稳。";

  if (entry.intent) {
    focus = "intent";
    reason = "你已经给了明确方向，系统直接沿这条主线生成 B。";
  } else if (sleepRed) {
    focus = "recovery";
    reason = `睡眠 ${sleepHours}h 低于 6.5h，系统自动切保守版。`;
  } else if (attentionLeak) {
    focus = "input-control";
    reason = "今天更像注意力泄漏，不是没时间；先关干扰再推进。";
  } else if (movementLow && outputKnown && deepWorkMinutes < 15 && outputWords < 100) {
    focus = "training";
    reason = "身体启动信号偏弱，先用短训练把系统拉起来更稳。";
  } else if (previousEntry?.result || previousEntry?.behavior) {
    focus = "output";
    reason = "继续昨天同一块，切换更少，成功率更高。";
  }

  let duration = effectiveRed ? 5 : 15;
  if (!effectiveRed && focus === "training") {
    duration = 10;
  }
  if (!effectiveRed && focus === "input-control") {
    duration = 10;
  }
  if (failureStreak >= 2) {
    duration = Math.min(duration, 5);
  }

  return {
    previousEntry,
    failureStreak,
    sleepRed,
    attentionLeak,
    movementLow,
    effectiveRed,
    focus,
    reason,
    duration,
    anchor: pickAnchor(focus, { effectiveRed, attentionLeak, movementLow }),
    target: resolvePrimaryTarget(entry, previousEntry)
  };
}

function countLatestFailureStreak(entries, date) {
  const byDate = new Map(entries.filter((item) => item?.date).map((item) => [item.date, item]));
  let streak = 0;
  let cursor = date;
  while (byDate.has(cursor)) {
    const value = byDate.get(cursor).bExecuted;
    if (value !== 0 && value !== "0") break;
    streak += 1;
    cursor = shiftDateISO(cursor, -1);
  }
  return streak;
}

function pickAnchor(focus, flags) {
  if (flags?.effectiveRed) {
    return "明天起床后";
  }
  if (focus === "training") {
    return "明天换好鞋后";
  }
  if (focus === "input-control") {
    return "明天坐到桌前后";
  }
  return "明天洗漱后";
}

function resolvePrimaryTarget(entry, previousEntry) {
  const explicit = String(entry.intent || "").trim();
  if (explicit) {
    return explicit;
  }

  const result = String(entry.result || "").trim();
  if (result) {
    return shortenIntentText(result, 32);
  }

  const previousResult = String(previousEntry?.result || "").trim();
  if (previousResult) {
    return shortenIntentText(previousResult, 32);
  }

  const previousBehavior = String(previousEntry?.behavior || "").trim();
  if (previousBehavior) {
    return shortenIntentText(previousBehavior, 32);
  }

  const previousB = getPrimaryBStep(previousEntry);
  if (previousB) {
    return shortenIntentText(previousB, 32);
  }

  return "标题+3要点";
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
    bObserved: toNumber(fd.get("wrBObserved")),
    ruinDays: toInt(fd.get("wrRuinDays"), 0),
    codeS: toInt(fd.get("wrCodeS"), 0),
    codeT: toInt(fd.get("wrCodeT"), 0),
    codeP: toInt(fd.get("wrCodeP"), 0),
    sleepPass: parseScoreState(fd.get("wrSleepPass")),
    trainingPass: parseScoreState(fd.get("wrTrainingPass")),
    outputPass: parseScoreState(fd.get("wrOutputPass"))
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
  const signals = deriveExecutionSignals(entry);
  const mode = buildMode(entry, signals);
  const b = buildAction(entry, signals);
  const riskLine = buildRisk(entry, signals);
  const tailBet = buildTailBet(entry, signals);
  const woop = buildWoopLite(entry, signals);

  const lines = [
    "A) 模式判断",
    `${mode}`,
    "",
    `B) 明日最小行动（<=${signals.duration}min）`,
    ...b.map((step, i) => `${i + 1}. ${step}`),
    "",
    "C) 风险点 + 1条防线",
    `风险点：${riskLine.risk}`,
    `防线：${riskLine.defense}`,
    "",
    "D) tail bet（可选）",
    `${tailBet}`
  ];

  if (woop) {
    lines.push(
      "",
      "WOOP-lite（连续失败自动触发）",
      `W：${woop.wish}`,
      `O：${woop.obstacle}`,
      `P：${woop.plan}`
    );
  }

  const outputText = lines.join("\n");

  return {
    signals,
    mode,
    b,
    risk: riskLine,
    tailBet,
    woop,
    text: outputText
  };
}

function buildMode(entry, signals) {
  if (entry.ruin === 1) {
    const codeText = entry.ruinCodes.length ? `（${entry.ruinCodes.join(",")}）` : "";
    return `红灯模式${codeText}：先防崩，再谈推进。明天把动作挂在“${signals.anchor}”这个锚点上，不加码。`;
  }

  if (signals.sleepRed) {
    return `睡眠预警模式：虽然你没手动勾红灯，但睡眠已低于阈值。明天把动作挂在“${signals.anchor}”这个锚点上，只做 5 分钟保守版。`;
  }

  if (signals.failureStreak >= 2) {
    return "连续失败模式：现在先修启动阻力，不做补偿性加码。系统会附带 WOOP-lite。";
  }

  if (signals.attentionLeak) {
    return "注意力泄漏模式：问题不是没时间，而是设备占走了启动带宽。明天先关干扰，再做唯一动作。";
  }

  if (entry.bExecuted === 1) {
    return "稳态推进模式：闭环在工作，继续低摩擦重复同一块输出。";
  }

  if (entry.bExecuted == null) return "建立基线：昨日没有可参考的 B，先从一个最小行动开始。";

  return "重启模式：昨天中断不追责，今天先用一个最小动作恢复节奏。";
}

function buildAction(entry, signals) {
  if (signals.effectiveRed) {
    const selectedCodes = normalizeRuinCodes(entry.ruinCodes);
    const mainCode = selectedCodes[0] || (signals.sleepRed ? "S" : "");

    if (mainCode && ruinCodeConfig[mainCode]) {
      const steps = [
        `锚点：${signals.anchor}，不要想整套计划，只开始第一步。`,
        ...ruinCodeConfig[mainCode].bSteps.slice(0, 2)
      ];
      const extraLines = selectedCodes
        .slice(1)
        .map((code) => buildSupplementRuinStep(code))
        .filter(Boolean);
      return [...steps, ...extraLines, "做到 5 分钟就算完成，今天不追求更多。"];
    }

    return [
      `锚点：${signals.anchor}，先开始 2 分钟版本。`,
      `只推进“${signals.target}”的一小块。`,
      "做到 5 分钟就停，做完后马上记录一句结果。"
    ];
  }

  if (entry.intent) {
    return [
      `锚点：${signals.anchor}，只打开与“${entry.intent}”直接相关的唯一页面或文件。`,
      "只做一个单线程动作，不切任务。",
      `计时 ${signals.duration} 分钟，只交付一小块可见结果。`
    ];
  }

  if (signals.focus === "input-control") {
    const topApp = entry.topAppName ? `，先避开 ${entry.topAppName}` : "";
    return [
      `锚点：${signals.anchor}，手机放远并打开勿扰 ${signals.duration} 分钟${topApp}。`,
      `只保留一个窗口，开始“${signals.target}”的第一步。`,
      `做到 ${signals.duration} 分钟或完成标题+3要点就算完成。`
    ];
  }

  if (signals.focus === "training") {
    return [
      `锚点：${signals.anchor}，先穿鞋并离开桌面。`,
      `只做 ${signals.duration} 分钟快走 / 爬坡 / 拉伸启动，不想完整训练。`,
      "做完立刻记结果；不追加更大训练也算完成。"
    ];
  }

  return [
    `锚点：${signals.anchor}，只打开唯一文件或页面。`,
    `围绕“${signals.target}”推进一小块，默认完成标题+3要点。`,
    `计时 ${signals.duration} 分钟，到点就停，并留一句结果给明天。`
  ];
}

function buildRisk(entry, signals) {
  if (entry.ruin === 1) {
    return buildRuinRiskAndDefense(entry.ruinCodes);
  }

  if (signals.sleepRed) {
    return {
      risk: "睡眠已经低于阈值，明天最容易因为脑子钝而继续拖启动。",
      defense: "按 S 防线执行：手机不进卧室，明天只认 5 分钟保守版为完成。"
    };
  }

  if (signals.failureStreak >= 2) {
    return {
      risk: "连续失败后，最常见的问题是想靠“明天多做点”补回来，结果第三天彻底断更。",
      defense: "先跑 WOOP-lite：只识别一个障碍，并把 B 缩到 2-5 分钟。"
    };
  }

  if (signals.attentionLeak) {
    return {
      risk: "设备使用已经吃掉了启动带宽，明天一碰手机/软件就会继续分心。",
      defense: "先跑输入控制：把头号干扰移开，只允许一个窗口和一个动作。"
    };
  }

  if (entry.bExecuted === 0) {
    return {
      risk: "若继续不执行 B，容易触发连续失败并断更。",
      defense: `固定锚点：${signals.anchor}立刻开始 B 的第一步（先做 2 分钟）。`
    };
  }

  if (entry.bExecuted == null) {
    return { risk: "还没有可参考的 B 执行情况。", defense: "先选一个容易开始的小动作，完成后再观察。" };
  }

  return {
    risk: "状态好时容易加码，明天反而掉线。",
    defense: "明天只做同强度最小行动，不增加新任务。"
  };
}

function buildTailBet(entry, signals) {
  if (signals.effectiveRed) {
    return "完成 B 后再补 2 分钟，记录“防线是否生效 + 明天保持哪条规则”。";
  }

  if (signals.focus === "training") {
    return "做完后可选补 2 分钟拉伸，并记下明天继续的同一时段。";
  }

  if (signals.focus === "input-control") {
    return "做完后可选顺手把头号干扰 App 再多关 1 个时段，给明天留更干净的入口。";
  }

  if (entry.intent) {
    return "完成 B 后可选加 5 分钟，把下一步材料提前打开并写一行提示。";
  }

  return "完成 B 后可选加 5 分钟，把 Output 从“标题+3要点”扩成一个短段落。";
}

function buildWoopLite(entry, signals) {
  if (signals.failureStreak < 2) {
    return null;
  }

  const wish = signals.effectiveRed
    ? "明天至少保住一个不断更的闭环"
    : `明天按 ${signals.anchor} 启动唯一动作`;

  if (signals.sleepRed) {
    return {
      wish,
      obstacle: "睡眠不足时，大脑会把任何任务都看得过大，起床后容易继续拖。",
      plan: `如果 到了“${signals.anchor}”这个锚点我还想拖，那么我只做 2 分钟版本，然后立刻停表记录。`
    };
  }

  if (signals.attentionLeak) {
    const blocker = entry.topAppName ? entry.topAppName : "手机/头号干扰软件";
    return {
      wish,
      obstacle: `${blocker} 会在启动前把注意力直接带走，让我以为自己“还没准备好”。`,
      plan: `如果 我伸手去点 ${blocker}，那么我先把它放远/关掉，到了“${signals.anchor}”只打开唯一文件 2 分钟。`
    };
  }

  return {
    wish,
    obstacle: "一想到要完整做完，就会把启动动作想得太大，于是连续两天都不开始。",
    plan: `如果 我脑子里出现“今天得多做点补回来”，那么我到了“${signals.anchor}”只做第一步，并在 5 分钟内结束。`
  };
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
    bObserved: data.bObserved == null ? null : clamp(data.bObserved, 0, 7),
    ruinDays: clamp(data.ruinDays, 0, 7),
    codeCount: {
      S: clamp(data.codeS, 0, 7),
      T: clamp(data.codeT, 0, 7),
      P: clamp(data.codeP, 0, 7)
    },
    sleepPass: data.sleepPass,
    trainingPass: data.trainingPass,
    outputPass: data.outputPass
  };

  const mechanism = inferMechanism(score.bObserved ?? 0, score.b, score.ruinDays, score.codeCount, score.outputPass);
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
    `DL完成 ${score.dl}/7 | B执行 ${score.b}/7（可判断 ${score.bObserved ?? "未知"} 天） | 红灯天数 ${score.ruinDays}/7（主码：S${score.codeCount.S} T${score.codeCount.T} P${score.codeCount.P}）`,
    `Sleep底线 ${formatScoreState(score.sleepPass)} | Training ${formatScoreState(score.trainingPass)} | Output ${formatScoreState(score.outputPass)}`,
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

  const wrInMonth = wrEntries.filter((item) => {
    const period = parseWeeklyPeriod(String(item.weekRange || ""));
    return period ? period.end.slice(0, 7) === month : inMonth(item.createdAt, month);
  });
  const dailyInMonth = dailyEntries.filter((item) => String(item.date || "").startsWith(month));
  const patchInMonth = patchEntries.filter((item) => {
    const start = String(item.startDate || "");
    const date = new Date(`${start}T00:00:00`);
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(start) && !Number.isNaN(date.getTime()) && localDateISO(date) === start;
    return valid ? start.slice(0, 7) === month : inMonth(item.createdAt, month);
  });

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
    "归类：周复盘按周期结束月，Patch 按开始月；日期无法识别时按保存月。",
    "",
    "1) Top 10 高频记录动作（按出现次数）",
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

function renderAll(entries, outputObj, outputDate) {
  document.getElementById("outputExternalNotice").classList.add("hidden");
  const output = outputObj === undefined ? entries[0]?.output : outputObj;
  const shownDate = outputDate || (outputObj === undefined ? entries[0]?.date : "");
  latestOutputDate = shownDate || "";
  document.getElementById("outputDate").textContent = shownDate ? (output?.text ? `依据 ${shownDate} 的记录生成` : `${shownDate} 的记录暂无已保存输出`) : "";
  renderExecutionFocus(output);
  renderRedDefense(entries.find((entry) => entry.date === shownDate), output);
  renderWoopLite(output);

  if (output?.text) {
    el.output.textContent = output.text;
    el.output.classList.remove("empty");
    latestOutputText = output.text;
  } else {
    el.output.textContent = "提交 DL-30 后显示 A/B/C/D";
    el.output.classList.add("empty");
    latestOutputText = "";
  }

  let draftPresent = dailyDraftSaveFailed;
  try { draftPresent ||= localStorage.getItem(DRAFT_KEY) !== null; } catch { draftPresent = true; }
  document.getElementById("outputPending").classList.toggle("hidden", !(draftPresent && latestOutputText));

  el.scoreboard.textContent = buildScoreboard(entries);
  renderTodayAction(entries);
  renderPatchReminder(entries);
  renderHistory(entries);
  renderDailyRecordAvailability();
  renderQuickFillCard();
  renderIntentAssist();
  renderEngineSignal();
  renderSleepRuinAssist();
}

function renderTodayAction(entries) {
  const section = document.getElementById("todayAction");
  const today = localDateISO(new Date());
  const yesterday = shiftDateISO(today, -1);
  const entry = entries.find((item) => item.date === yesterday);
  const todayEntry = entries.find((item) => item.date === today);
  const steps = Array.isArray(entry?.output?.b) ? entry.output.b.filter((step) => typeof step === "string" && step.trim()) : [];
  section.classList.toggle("hidden", steps.length === 0);
  document.getElementById("todayActionSource").textContent = steps.length ? `来自 ${yesterday} 的记录` : "";
  document.getElementById("todayActionSteps").textContent = steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const red = getSavedRedDefense(entry, entry?.output);
  document.getElementById("todayRedDefense").classList.toggle("hidden", !red.isRed || !steps.length);
  document.getElementById("todayRedDefenseText").textContent = red.text || "这条红灯记录没有可识别的防线，请查看昨日完整输出。";
  const legacyOutput = document.getElementById("todayLegacyOutput");
  legacyOutput.classList.toggle("hidden", !red.isRed || !!red.text || !entry?.output?.text);
  document.getElementById("todayLegacyOutputText").textContent = entry?.output?.text || "";
  document.getElementById("todayRecordState").textContent = todayEntry ? `今天已有记录，昨日 B：${todayEntry.bExecuted === 1 ? "已执行" : todayEntry.bExecuted === 0 ? "未执行" : "无可参考"}。如需调整，请载入今日记录。` : "";
  document.getElementById("markTodayActionDone").classList.toggle("hidden", !!todayEntry);
  document.getElementById("useTodayAction").classList.toggle("hidden", !!todayEntry);
  document.getElementById("editTodayRecord").classList.toggle("hidden", !todayEntry);
}

function useTodayAction(markDone = false) {
  const today = localDateISO(new Date());
  const hint = document.getElementById("todayActionHint");
  if (el.date.value !== today) {
    hint.textContent = "表单日期不是今天，请先核对日期和已有草稿，再使用此快捷填写。";
    el.date.focus({ preventScroll: true });
    el.form.scrollIntoView({ block: "start", behavior: "auto" });
    return;
  }
  const entries = loadEntries();
  if (entries.some((item) => item.date === today)) {
    renderTodayAction(entries);
    hint.textContent = "今天已有记录，请先载入今日记录再修改。";
    return;
  }
  const yesterday = entries.find((item) => item.date === shiftDateISO(today, -1));
  const steps = Array.isArray(yesterday?.output?.b) ? yesterday.output.b : [];
  const step = steps.find((item) => typeof item === "string" && item.trim() && !item.trim().startsWith("锚点：")) || getPrimaryBStep(yesterday);
  if (!step) {
    hint.textContent = "没有找到昨天生成的行动，请刷新后重试。";
    return;
  }
  const behavior = `执行今日B：${step}`;
  if (el.behavior.value.trim() && el.behavior.value.trim() !== behavior && !confirm("行为栏已有内容，是否用今天的行动替换？")) return;
  el.behavior.value = behavior;
  el.behavior.dispatchEvent(new Event("input", { bubbles: true }));
  if (markDone) {
    const executed = el.form.querySelector("input[name='bExecuted'][value='1']");
    executed.checked = true;
    executed.dispatchEvent(new Event("change", { bubbles: true }));
  }
  hint.textContent = markDone ? "已填入行为并选择 B 已执行；请按实际情况填写结果，再保存记录。" : "已填入行为，请按实际情况修改，并继续填写结果。";
  (markDone ? el.result : el.behavior).focus({ preventScroll: true });
  el.form.scrollIntoView({ block: "start", behavior: "auto" });
}

function renderPatchReminder(entries) {
  const reminder = document.getElementById("patchReminder");
  const message = document.getElementById("patchReminderText");
  if (!reminder || !message) return;
  const today = localDateISO(new Date());
  const byDate = new Map(entries.filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date || "") && entry.date <= today)
    .map((entry) => [entry.date, entry]));
  const dates = [...byDate.keys()].sort().reverse();
  const reasons = [];
  if (dates.length && dates[0] < shiftDateISO(today, -1)) {
    reasons.push(`最近一次记录是 ${dates[0]}，昨天和今天都没有记录`);
  }
  // Only consecutive dated records count; missing days are not failures.
  const latest = dates[0];
  if (latest && latest >= shiftDateISO(today, -1) && [0, 1, 2].every((offset) => {
    const entry = byDate.get(shiftDateISO(latest, -offset));
    return entry && Number(entry.bExecuted) === 0 && entry.bExecuted !== null && entry.bExecuted !== "";
  })) reasons.push("最近连续 3 条每日记录的 B 均未执行");
  const redDays = getRecentEntries([...byDate.values()], 7).filter((entry) => Number(entry.ruin) === 1).length;
  if (redDays >= 2) reasons.push(`近 7 天有 ${redDays} 天标记红灯`);
  reminder.classList.toggle("hidden", reasons.length === 0);
  message.textContent = reasons.length ? `${reasons.join("；")}。可以花 5–10 分钟只调整一处；这是提示，不是诊断。` : "";
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

function getSavedRedDefense(entry, output) {
  const sleep = toNumber(entry?.sleepHours);
  const isRed = Number(entry?.ruin) === 1 || (sleep !== null && sleep < 6.5) || output?.signals?.effectiveRed === true;
  if (!isRed || !output) return { isRed: false, text: "" };
  const structured = typeof output.risk?.defense === "string" ? output.risk.defense.trim() : "";
  const legacy = typeof output.text === "string" ? output.text.match(/(?:^|\n)防线[：:]\s*([^\n]+)/)?.[1]?.trim() : "";
  return { isRed: true, text: structured || legacy || "" };
}

function renderRedDefense(entry, output) {
  const red = getSavedRedDefense(entry, output);
  document.getElementById("redDefense").classList.toggle("hidden", !red.isRed);
  document.getElementById("redDefenseText").textContent = red.text || "这条红灯记录没有可识别的防线，请展开完整 A/B/C/D 查看。";
}

function renderWorkflowPanels() {
  const wrEntries = loadCollection(WR_STORAGE_KEY);
  const patchEntries = loadCollection(PATCH_STORAGE_KEY);
  renderWeeklyAvailability();
  renderPatchAvailability();

  if (wrEntries[0]?.outputText) {
    latestWrOutputText = wrEntries[0].outputText;
    setModuleOutput(el.wrOutput, latestWrOutputText, "提交 WR-10 后显示周总结与下周执行稿");
  } else {
    latestWrOutputText = "";
    setModuleOutput(el.wrOutput, "", "提交 WR-10 后显示周总结与下周执行稿");
  }

  if (patchEntries[0]?.outputText) {
    latestPatchOutputText = patchEntries[0].outputText;
    setModuleOutput(el.patchOutput, latestPatchOutputText, "提交 System Patch 后显示新规则（<=3条）");
  } else {
    latestPatchOutputText = "";
    setModuleOutput(el.patchOutput, "", "提交 System Patch 后显示新规则（<=3条）");
  }
  document.getElementById("wrOutputPending").classList.toggle("hidden", !latestWrOutputText || buildWrOutput(getWrData()) === latestWrOutputText);
  document.getElementById("patchOutputPending").classList.toggle("hidden", !latestPatchOutputText || buildPatchOutput(getPatchData()) === latestPatchOutputText);
}

function markWorkflowOutputStale(key) {
  if (key === WR_DRAFT_KEY && latestWrOutputText) document.getElementById("wrOutputPending").classList.remove("hidden");
  if (key === PATCH_DRAFT_KEY && latestPatchOutputText) document.getElementById("patchOutputPending").classList.remove("hidden");
}

function renderYesterdayBContext() {
  if (!el.yesterdayBTitle || !el.yesterdayBText || !el.date) {
    return;
  }

  const selectedDate = el.date.value || localDateISO(new Date());
  const previousDate = shiftDateISO(selectedDate, -1);
  const previousEntry = getPreviousEntryForSelectedDate(loadEntries());

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

function parseScoreState(value) {
  return value === "1" ? 1 : value === "0" ? 0 : null;
}

function formatScoreState(value) {
  return value === 1 ? "达成" : value === 0 ? "未达成" : "数据不足";
}

function buildScoreboard(entries) {
  const snap = getScoreSnapshot(entries);

  return [
    `DL完成 ${snap.dl}/7 | B执行 ${snap.b}/7（可判断 ${snap.bObserved} 天） | 红灯天数 ${snap.ruinDays}/7（主码：S${snap.codeCount.S} T${snap.codeCount.T} P${snap.codeCount.P}）`,
    `Sleep底线 ${formatScoreState(snap.sleepPass)} | Training ${formatScoreState(snap.trainingPass)} | Output ${formatScoreState(snap.outputPass)}`,
    `机制一句话：本周主要被 ${snap.mechanism} 驱动`,
    `下周唯一改动：只改 ${snap.nextChange}`
  ].join("\n");
}

function getScoreSnapshot(entries, period = null) {
  const recent = period ? entries.filter((item) => item.date >= period.start && item.date <= period.end) : getRecentEntries(entries, 7);
  const dl = recent.length;
  const b = recent.filter((item) => item.bExecuted === 1).length;
  const bFailed = recent.filter((item) => item.bExecuted === 0).length;
  const bObserved = b + bFailed;
  const ruinDays = recent.filter((item) => item.ruin === 1).length;

  const codeCount = { S: 0, T: 0, P: 0 };
  for (const item of recent) {
    for (const code of item.ruinCodes || []) {
      if (codeCount[code] !== undefined) {
        codeCount[code] += 1;
      }
    }
  }

  const sleepGoodDays = recent.filter((item) => hasMetricValue(item.sleepHours) && Number(item.sleepHours) >= 7).length;
  const sleepComplete = recent.length === 7 && recent.every((item) => hasMetricValue(item.sleepHours));
  const sleepPass = sleepGoodDays >= 5 ? 1 : sleepComplete ? 0 : null;

  const trainingTotal = sumBy(recent, "trainingMinutes");
  const trainingComplete = recent.length === 7 && recent.every((item) => hasMetricValue(item.trainingMinutes));
  const trainingPass = trainingTotal >= 150 ? 1 : trainingComplete ? 0 : null;

  const deepWorkTotal = sumBy(recent, "deepWorkMinutes");
  const outputWordTotal = sumBy(recent, "outputWords");
  const outputComplete = recent.length === 7 && recent.every((item) => hasMetricValue(item.deepWorkMinutes) && hasMetricValue(item.outputWords));
  const outputPass = deepWorkTotal >= 300 || outputWordTotal >= 800 ? 1 : outputComplete ? 0 : null;

  const mechanism = inferMechanism(bObserved, b, ruinDays, codeCount, outputPass);
  const nextChange = inferNextChange(bObserved, b, codeCount);

  return {
    hasData: dl > 0,
    dl,
    b,
    bFailed,
    bObserved,
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

  if (dl === 0) return "数据不足";

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
  if (dl === 0) return "先记录一天，再观察趋势";
  if (dl > 0 && b < dl) {
    return "洗漱后立刻执行 B 的第一步";
  }
  return "维持当前最小行动，不加码";
}

function renderHistory(entries) {
  const count = document.getElementById("historyCount");
  const more = document.getElementById("historyMore");
  const less = document.getElementById("historyLess");
  const query = document.getElementById("historySearch").value.trim().toLocaleLowerCase();
  const terms = query ? query.split(/\s+/) : [];
  const sorted = entries.filter((entry) => {
    const searchable = [entry.date, entry.behavior, entry.result, entry.intent, entry.topAppName,
      ...(Array.isArray(entry.output?.b) ? entry.output.b : [])]
      .map((value) => String(value ?? "").toLocaleLowerCase()).join("\n");
    return terms.every((term) => searchable.includes(term));
  })
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  more.classList.toggle("hidden", sorted.length <= historyLimit);
  less.classList.toggle("hidden", historyLimit <= 12 || sorted.length <= 12);
  count.textContent = sorted.length ? `显示 ${Math.min(historyLimit, sorted.length)} / ${sorted.length} 条` : "";
  if (sorted.length === 0) {
    el.history.textContent = entries.length === 0 ? "暂无记录" : "没有找到匹配的记录。";
    count.textContent = entries.length && query ? "匹配 0 条" : "";
    return;
  }

  const frag = document.createDocumentFragment();
  const list = sorted.slice(0, historyLimit);

  for (const item of list) {
    const node = el.historyItemTpl.content.firstElementChild.cloneNode(true);
    const ruinCodes = item.ruinCodes?.length ? item.ruinCodes.join(",") : "-";

    node.querySelector(".history-meta").textContent = `${item.date} | B=${formatBExecuted(item.bExecuted)} | RUIN=${item.ruin} | 码=${ruinCodes}`;
    const details = [`行为：${item.behavior || ""}`, `结果：${item.result || ""}`];
    if (item.intent) details.push(`明日意图：${item.intent}`);
    if (query && Array.isArray(item.output?.b) && item.output.b.length) details.push(`B 行动：${item.output.b.join("；")}`);
    if (query && item.topAppName) details.push(`头号应用：${item.topAppName}`);
    node.querySelector(".history-text").textContent = details.join(" | ");
    const button = node.querySelector(".history-load");
    button.setAttribute("aria-label", `载入并编辑 ${item.date} 的记录`);
    button.addEventListener("click", () => loadDailyRecord(item.date, true));
    frag.appendChild(node);
  }

  el.history.innerHTML = "";
  el.history.appendChild(frag);
}

function formatBExecuted(value) {
  return value === 0 || value === 1 ? String(value) : "无可参考";
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
    `昨日B执行：${formatBExecuted(entry.bExecuted)}`,
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
    return readCollectionStrict(key);
  } catch (error) {
    console.error("Failed to load collection", key, error);
    return [];
  }
}

function readCollectionStrict(key) {
  const names = { [STORAGE_KEY]: "每日记录", [WR_STORAGE_KEY]: "周复盘", [PATCH_STORAGE_KEY]: "Patch", [APPLE_SYNC_META_KEY]: "设备同步信息" };
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || Array.isArray(item))) throw new Error("invalid collection");
    unreadableCollections.delete(key);
    renderStorageIssue();
    return parsed;
  } catch {
    unreadableCollections.add(key);
    renderStorageIssue();
    throw new Error(`${names[key] || "本地记录"}无法读取。原始数据未更改，请先下载原始数据供恢复。`);
  }
}

function renderStorageIssue() {
  const section = document.getElementById("storageIssue");
  if (!section) return;
  const names = { [STORAGE_KEY]: "每日记录", [WR_STORAGE_KEY]: "周复盘", [PATCH_STORAGE_KEY]: "Patch", [APPLE_SYNC_META_KEY]: "设备同步信息" };
  section.classList.toggle("hidden", unreadableCollections.size === 0);
  document.getElementById("storageIssueText").textContent = unreadableCollections.size ? `${[...unreadableCollections].map((key) => names[key] || "本地记录").join("、")}无法读取。为避免覆盖，相关保存、常规导出和同步已暂停；请先下载原始数据，再考虑从可靠备份恢复。` : "";
}

function assertCollectionsReadable() {
  for (const key of [STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY]) readCollectionStrict(key);
  readAppleSyncMetaStrict();
}

function exportRawRecovery() {
  try {
    const keys = [STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY, APPLE_SYNC_META_KEY, DRAFT_KEY, WR_DRAFT_KEY, PATCH_DRAFT_KEY, DOJO_DRAFT_KEY];
    const raw = Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]));
    const filename = `lifeos-raw-recovery-${localDateISO(new Date())}.json`;
    downloadFile(filename, JSON.stringify({ type: "lifeos-raw-recovery-v1", raw }, null, 2), "application/json;charset=utf-8");
    document.getElementById("rawRecoveryStatus").textContent = `已请求下载 ${filename}；它用于保留原始数据，不能直接作为常规备份导入。`;
  } catch {
    document.getElementById("rawRecoveryStatus").textContent = "无法读取或下载原始数据，请保留当前浏览器数据并检查存储权限。";
  }
}

function saveCollection(key, entries) {
  readCollectionStrict(key);
  const next = JSON.stringify(entries);
  const previous = localStorage.getItem(key);
  localStorage.setItem(key, next);
  if (previous !== next) markSyncDataChanged();
  if ([STORAGE_KEY, WR_STORAGE_KEY, PATCH_STORAGE_KEY].includes(key)) markPlaybookOutputStale();
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
      note: "数据默认保存在当前浏览器；启用 Gist 同步后按设置上传。"
    },
    data: {
      dailyLogs: readCollectionStrict(STORAGE_KEY),
      weeklyReviews: readCollectionStrict(WR_STORAGE_KEY),
      systemPatches: readCollectionStrict(PATCH_STORAGE_KEY),
      appleSyncMeta: readAppleSyncMetaStrict()
    }
  };
}

function buildCsvExport() {
  const fields = [
    ["行为", "behavior"], ["结果", "result"], ["昨日B执行", "bExecuted"],
    ["红灯", "ruin"], ["红灯码", "ruinCodes"], ["明日意图", "intent"],
    ["睡眠小时", "sleepHours"], ["训练分钟", "trainingMinutes"], ["深度工作分钟", "deepWorkMinutes"],
    ["输出字数", "outputWords"], ["步数", "steps"], ["本周有效动作", "bestAction"],
    ["本周失控", "worstLeak"], ["下周优先事项", "priority"], ["实验行动", "expAction"],
    ["唯一改动", "oneChange"], ["系统卡点", "bottleneck"], ["最常断点", "breakPoint"], ["减摩擦改动", "fix"]
  ];
  const rows = [["recordType", "primaryKey", "payloadJson", "createdAt", ...fields.map(([label]) => label)]];
  const add = (type, key, entry) => rows.push([
    type, key || "", JSON.stringify(entry), entry.createdAt || "",
    ...fields.map(([, name]) => Array.isArray(entry[name]) ? entry[name].join(" / ") : entry[name] ?? "")
  ]);
  readCollectionStrict(STORAGE_KEY).forEach((entry) => add("dailyLog", entry.date, entry));
  readCollectionStrict(WR_STORAGE_KEY).forEach((entry) => add("weeklyReview", entry.weekRange, entry));
  readCollectionStrict(PATCH_STORAGE_KEY).forEach((entry) => add("systemPatch", entry.startDate, entry));

  return rows.map((row) => row.map(toCsvCell).join(",")).join("\n");
}

function buildMarkdownExport() {
  const daily = readCollectionStrict(STORAGE_KEY);
  const wr = readCollectionStrict(WR_STORAGE_KEY);
  const patches = readCollectionStrict(PATCH_STORAGE_KEY);

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
      lines.push(`- ${entry.date} | B=${formatBExecuted(entry.bExecuted)} | RUIN=${entry.ruin} | 码=${(entry.ruinCodes || []).join(",") || "-"}`);
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
  let text = String(value ?? "");
  if (typeof value === "string" && (/^[\t\r]/.test(text) || /^\s*[=+\-@]/.test(text))) text = `'${text}`;
  if (text.includes(",") || text.includes("\"") || text.includes("\n") || text.includes("\r")) {
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
    const dialog = document.getElementById("copyFallback");
    const field = document.getElementById("copyFallbackText");
    field.value = text;
    if (!dialog.open) dialog.showModal();
    field.focus();
    field.select();
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
