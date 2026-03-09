const STORAGE_KEY = "lifeos_v13_entries";
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

let latestOutputText = "";

const el = {
  form: document.getElementById("dlForm"),
  date: document.getElementById("date"),
  ruinCodesWrap: document.getElementById("ruinCodesWrap"),
  output: document.getElementById("output"),
  scoreboard: document.getElementById("scoreboard"),
  history: document.getElementById("history"),
  copyDl: document.getElementById("copyDl"),
  copyOutput: document.getElementById("copyOutput"),
  quickZeroDay: document.getElementById("quickZeroDay"),
  historyItemTpl: document.getElementById("historyItemTpl")
};

init();

function init() {
  el.date.value = localDateISO(new Date());
  bindEvents();
  renderAll(loadEntries());
}

function bindEvents() {
  el.form.addEventListener("submit", onSubmit);
  el.quickZeroDay.addEventListener("click", onZeroDay);
  el.copyDl.addEventListener("click", () => {
    copyWithFeedback(buildDlText(getFormData()), el.copyDl, "复制 DL-30");
  });
  el.copyOutput.addEventListener("click", () => {
    if (!latestOutputText) {
      alert("先提交一次 DL-30，才有可复制的 A/B/C/D 输出。");
      return;
    }
    copyWithFeedback(latestOutputText, el.copyOutput, "复制 A/B/C/D");
  });

  const ruinRadios = document.querySelectorAll("input[name='ruin']");
  ruinRadios.forEach((radio) => radio.addEventListener("change", toggleRuinCodes));
  toggleRuinCodes();
}

function onSubmit(event) {
  event.preventDefault();
  const entry = getFormData();

  if (entry.ruin === 1 && entry.ruinCodes.length === 0) {
    alert("RUIN=1 时，请至少勾选一个 RUIN 码（S/T/P）。");
    return;
  }

  const entries = loadEntries();
  const output = buildLifeOSOutput(entry, entries);
  entry.output = output;
  entry.createdAt = new Date().toISOString();

  const nextEntries = upsertEntry(entries, entry);
  saveEntries(nextEntries);
  renderAll(nextEntries, output);
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
  const output = buildLifeOSOutput(entry, entries);
  entry.output = output;
  entry.createdAt = new Date().toISOString();

  const nextEntries = upsertEntry(entries, entry);
  saveEntries(nextEntries);
  renderAll(nextEntries, output);
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

function buildLifeOSOutput(entry) {
  const mode = buildMode(entry);
  const b = buildAction(entry);
  const riskLine = buildRisk(entry);
  const tailBet = buildTailBet(entry);

  const lines = [
    `A) 模式判断`,
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
    const mainCode = pickMainCode(entry.ruinCodes);
    if (mainCode && ruinCodeConfig[mainCode]) {
      return ruinCodeConfig[mainCode].bSteps;
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
    const mainCode = pickMainCode(entry.ruinCodes);
    if (mainCode && ruinCodeConfig[mainCode]) {
      return {
        risk: ruinCodeConfig[mainCode].risk,
        defense: ruinCodeConfig[mainCode].defense
      };
    }

    return {
      risk: "红灯信号未码化会导致防线执行不稳定。",
      defense: "先按 P 防线执行：关键任务切成 <=5 分钟启动动作。"
    };
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

function pickMainCode(codes) {
  for (const code of CODE_ORDER) {
    if (codes.includes(code)) {
      return code;
    }
  }
  return null;
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

function buildScoreboard(entries) {
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

  return [
    `DL完成 ${dl}/7 | B执行 ${b}/7 | 红灯天数 ${ruinDays}/7（主码：S${codeCount.S} T${codeCount.T} P${codeCount.P}）`,
    `Sleep底线 ${sleepPass}/1 | Training ${trainingPass}/1 | Output ${outputPass}/1`,
    `机制一句话：本周主要被 ${mechanism} 驱动`,
    `下周唯一改动：只改 ${nextChange}`
  ].join("\n");
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

function upsertEntry(entries, entry) {
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

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load entries", error);
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function toNumber(value) {
  if (value === null || value === "") {
    return null;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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
