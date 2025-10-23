const tg = window.Telegram?.WebApp;

const influencer = {
  name: "Luna Nova",
  vibeWord: "cosmic creator",
};

const telegramDescriptionEl = document.getElementById("telegram-description");
const telegramSummaryEl = document.getElementById("telegram-summary");
const initDataTextEl = document.getElementById("init-data-text");
const initDataUnsafeEl = document.getElementById("init-data-unsafe");
const hintEl = document.getElementById("main-button-hint");
const fallbackStartButton = document.getElementById("start-fallback");
const titleEl = document.getElementById("title");
const salebotStatusEl = document.getElementById("salebot-status");
const salebotStatusMessageEl = document.getElementById("salebot-status-message");
const salebotStatusDetailsEl = document.getElementById("salebot-status-details");
const salebotPayloadEl = document.getElementById("salebot-payload");
const copySalebotPayloadButton = document.getElementById("copy-salebot-payload");

const questions = [
  {
    prompt: "What fuels your content energy right now?",
    options: [
      { label: "Planning the next viral idea with lo-fi beats.", score: 3 },
      { label: "Posting spontaneously whenever the muse strikes!", score: 2 },
      { label: "Still lurking, still learning — but soon 👀", score: 1 },
    ],
  },
  {
    prompt: "Pick your go-to aesthetic filter:",
    options: [
      { label: "Neon galaxies & dreamy gradients", score: 3 },
      { label: "Sun-soaked vintage grain", score: 2 },
      { label: "Crisp documentary minimalism", score: 1 },
    ],
  },
  {
    prompt: "How do you interact with your community?",
    options: [
      { label: "Daily lives + polls — I’m always vibing with them", score: 3 },
      { label: "Weekly drops and thoughtful replies", score: 2 },
      { label: "Quality over quantity, I show up when it matters", score: 1 },
    ],
  },
];

const questionEl = document.getElementById("question");
const optionsEl = document.getElementById("options");
const nextButton = document.getElementById("next-btn");
const quizSection = document.getElementById("quiz");
const resultSection = document.getElementById("result");
const resultText = document.getElementById("result-text");
const restartButton = document.getElementById("restart-btn");

let currentQuestion = 0;
let currentSelection = null;
let accumulatedScore = 0;
const maxScore = Math.max(...questions.flatMap((q) => q.options.map((o) => o.score)));

let quizStarted = false;
let initMessageSent = false;
let salebotNotified = false;
let salebotRequestInFlight = false;

function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function describeError(error) {
  if (!error) {
    return "Неизвестная ошибка";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return JSON.stringify(error);
}

function limitDetail(detail, limit = 420) {
  if (!detail) {
    return "";
  }

  const normalized = String(detail);
  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 1)}…`;
}

function updateSalebotStatus(state, message, detail) {
  if (salebotStatusEl) {
    salebotStatusEl.dataset.state = state;
  }

  if (salebotStatusMessageEl && message) {
    salebotStatusMessageEl.textContent = message;
  }

  if (!salebotStatusDetailsEl) {
    return;
  }

  if (detail) {
    salebotStatusDetailsEl.textContent = detail;
    salebotStatusDetailsEl.classList.remove("hidden");
  } else {
    salebotStatusDetailsEl.textContent = "";
    salebotStatusDetailsEl.classList.add("hidden");
  }
}

function updateSalebotPayload(payload) {
  if (!salebotPayloadEl) {
    return;
  }

  const hasPayload = Boolean(payload && payload.trim());
  const value = hasPayload ? payload : "—";
  salebotPayloadEl.textContent = value;

  if (copySalebotPayloadButton) {
    copySalebotPayloadButton.disabled = !hasPayload;
  }
}

function parseUserFromInitDataString() {
  if (!tg?.initData) {
    return null;
  }

  try {
    const params = new URLSearchParams(tg.initData);
    const userParam = params.get("user");
    if (!userParam) {
      return null;
    }

    return JSON.parse(userParam);
  } catch (error) {
    console.error("Unable to parse user from initData", error);
    return null;
  }
}

function getTelegramUser() {
  const unsafeUser = tg?.initDataUnsafe?.user;
  if (unsafeUser?.id) {
    return unsafeUser;
  }

  const parsedUser = parseUserFromInitDataString();
  if (parsedUser?.id) {
    return parsedUser;
  }

  return null;
}

function getTelegramUserId() {
  return getTelegramUser()?.id ?? null;
}

async function attemptSalebotNoCors(bodyString) {
  try {
    await fetch(SALEBOT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: bodyString,
    });

    return true;
  } catch (noCorsError) {
    console.error("Fallback Salebot request (no-cors) failed", noCorsError);
    return false;
  }
}

const BOT_TOKEN = "8245334941:AAGmGZBGtFDC7ik1nvvPl7L_izKn2NvrloA";
const TARGET_CHAT_ID = "5685844627";
const BOT_ENDPOINT = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
const SALEBOT_ENDPOINT =
  "https://chatter.salebot.pro/api/c21b4a58a0116a1b4402666bdaaa54af/tg_callback";
const MAX_SALEBOT_ATTEMPTS = 6;
const SALEBOT_RETRY_DELAY_MS = 600;

const handleMainButtonClick = () => startQuiz();

function configureTelegramUi() {
  if (!tg) {
    if (fallbackStartButton) {
      fallbackStartButton.classList.remove("hidden");
      fallbackStartButton.addEventListener("click", startQuiz);
    }
    if (hintEl) {
      hintEl.textContent = "Start the quiz with the button below when testing outside Telegram.";
    }
    return;
  }

  tg.ready();
  tg.expand?.();
  tg.setBackgroundColor?.("#130229");
  tg.setHeaderColor?.("#0d0221");
  tg.MainButton.setText?.("Start Quiz ✨");
  tg.MainButton.show();
  tg.MainButton.enable?.();
  tg.MainButton.onClick(handleMainButtonClick);

  if (fallbackStartButton) {
    fallbackStartButton.remove();
  }
}

function populateTelegramData() {
  if (!telegramDescriptionEl || !telegramSummaryEl || !initDataTextEl || !initDataUnsafeEl) {
    return;
  }

  if (!tg) {
    telegramDescriptionEl.textContent =
      "Telegram WebApp context not detected. Real user data appears when launched inside Telegram.";
    initDataTextEl.textContent = "—";
    initDataUnsafeEl.textContent = JSON.stringify({}, null, 2);
    return;
  }

  const {
    initData = "",
    initDataUnsafe = {},
    colorScheme,
    version,
    platform,
    themeParams,
  } = tg;
  const safeUser = getTelegramUser() ?? {};
  const { chat, start_param, auth_date, hash } = initDataUnsafe;
  const nameParts = [safeUser.first_name, safeUser.last_name].filter(Boolean);
  const displayName = nameParts.join(" ") || safeUser.username || "there";

  if (titleEl) {
    titleEl.textContent = `${displayName}, find your Luna Nova vibe`;
  }

  telegramDescriptionEl.textContent =
    `Mini app launched for ${displayName}${safeUser.id ? ` (ID: ${safeUser.id})` : ""}.`;

  telegramSummaryEl.innerHTML = "";
  const summaryEntries = [
    ["User ID", safeUser.id],
    ["Username", safeUser.username ? `@${safeUser.username}` : null],
    ["Language", safeUser.language_code || tg.languageCode],
    ["Platform", platform],
    ["Version", version],
    ["Color scheme", colorScheme],
    ["Theme params", themeParams ? JSON.stringify(themeParams) : null],
    ["Chat type", chat?.type],
    ["Chat ID", chat?.id],
    ["Start param", start_param],
    ["Auth date", auth_date ? new Date(auth_date * 1000).toISOString() : null],
    ["Init data hash", hash],
  ];

  summaryEntries
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .forEach(([label, value]) => {
      const item = document.createElement("div");
      item.className = "info-item";

      const labelEl = document.createElement("span");
      labelEl.className = "info-label";
      labelEl.textContent = label;

      const valueEl = document.createElement("span");
      valueEl.className = "info-value";
      valueEl.textContent = typeof value === "string" ? value : String(value);

      item.append(labelEl, valueEl);
      telegramSummaryEl.appendChild(item);
    });

  initDataTextEl.textContent = initData || "initData string was empty.";
  initDataUnsafeEl.textContent = JSON.stringify(initDataUnsafe, null, 2);
}

function truncateForTelegram(text, limit = 3900) {
  if (text.length <= limit) {
    return text;
  }

  return `${text.slice(0, limit - 3)}...`;
}

async function sendInitDataToBot() {
  if (!tg || initMessageSent) {
    return;
  }

  initMessageSent = true;

  const initDataUnsafeString = JSON.stringify(tg.initDataUnsafe ?? {}, null, 2);
  const initDataString = tg.initData || "";
  const message = truncateForTelegram(
    `Mini app opened\n\ninitData:\n${initDataString}\n\ninitDataUnsafe:\n${initDataUnsafeString}`
  );

  const payload = {
    chat_id: TARGET_CHAT_ID,
    text: message,
  };

  try {
    const response = await fetch(BOT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Failed to notify bot about session", await response.text());
    }
  } catch (error) {
    console.error("Unable to send session data to bot", error);
  }
}

function scheduleSalebotRetry(nextAttempt) {
  setTimeout(() => notifySalebotAboutOpen(nextAttempt), SALEBOT_RETRY_DELAY_MS);
}

async function notifySalebotAboutOpen(attempt = 0) {
  if (!tg || salebotNotified || salebotRequestInFlight) {
    return;
  }

  const attemptNumber = attempt + 1;
  const hasMoreAttempts = attemptNumber < MAX_SALEBOT_ATTEMPTS;
  const delaySeconds = (SALEBOT_RETRY_DELAY_MS / 1000).toFixed(1);

  const userId = getTelegramUserId();
  if (!userId) {
    updateSalebotStatus(
      hasMoreAttempts ? "retrying" : "error",
      "Ожидаем user_id от Telegram…",
      hasMoreAttempts
        ? `Следующая проверка через ${delaySeconds} с (попытка ${attemptNumber + 1} из ${MAX_SALEBOT_ATTEMPTS}).`
        : "Telegram не передал user_id. Убедитесь, что мини-апп открыт из чата бота."
    );

    if (hasMoreAttempts) {
      scheduleSalebotRetry(attempt + 1);
    }
    return;
  }

  const payload = new URLSearchParams({
    user_id: String(userId),
    message: "что открыл мини апп",
    group_id: "jwmqnwjqmw_bot",
  });
  const payloadString = payload.toString();

  updateSalebotPayload(payloadString);
  updateSalebotStatus(
    "pending",
    "Отправляем запрос в Salebot…",
    `Попытка ${attemptNumber} из ${MAX_SALEBOT_ATTEMPTS}`
  );

  salebotRequestInFlight = true;

  try {
    const response = await fetch(SALEBOT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payloadString,
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.error(
        "Failed to notify Salebot about mini app open",
        response.status,
        responseText
      );
      updateSalebotStatus(
        "error",
        `Salebot вернул статус ${response.status}.`,
        limitDetail(responseText)
      );

      const fallbackSent = await attemptSalebotNoCors(payloadString);
      if (fallbackSent) {
        salebotNotified = true;
        console.info("Salebot notified via fallback request.");
        updateSalebotStatus(
          "success",
          "Запрос отправлен через fallback (ответ сервера недоступен).",
          `Основной статус ${response.status} • ${formatTimestamp()}`
        );
        return;
      }

      if (hasMoreAttempts) {
        updateSalebotStatus(
          "retrying",
          "Повторяем попытку отправки в Salebot…",
          `Следующая попытка через ${delaySeconds} с (попытка ${attemptNumber + 1} из ${MAX_SALEBOT_ATTEMPTS}).`
        );
        scheduleSalebotRetry(attempt + 1);
      }
      return;
    }

    salebotNotified = true;
    console.info("Salebot notified about mini app open.");
    updateSalebotStatus(
      "success",
      "Salebot подтвердил получение данных.",
      `HTTP ${response.status} • ${formatTimestamp()}`
    );
  } catch (error) {
    console.error("Unable to contact Salebot callback endpoint", error);

    const fallbackSent = await attemptSalebotNoCors(payloadString);
    if (fallbackSent) {
      salebotNotified = true;
      console.info("Salebot notified via fallback request.");
      updateSalebotStatus(
        "success",
        "Запрос отправлен через fallback (ответ сервера недоступен).",
        `Ошибка основного запроса: ${limitDetail(describeError(error))} • ${formatTimestamp()}`
      );
      return;
    }

    const errorDetail = limitDetail(describeError(error));
    if (hasMoreAttempts) {
      updateSalebotStatus(
        "retrying",
        "Не удалось связаться с Salebot.",
        `Ошибка: ${errorDetail}. Повторяем через ${delaySeconds} с (попытка ${attemptNumber + 1} из ${MAX_SALEBOT_ATTEMPTS}).`
      );
      scheduleSalebotRetry(attempt + 1);
    } else {
      updateSalebotStatus(
        "error",
        "Не удалось связаться с Salebot.",
        `Ошибка: ${errorDetail}. Попробуйте перезапустить мини-апп.`
      );
    }
  } finally {
    salebotRequestInFlight = false;
  }
}

function startQuiz() {
  if (quizStarted) {
    return;
  }

  quizStarted = true;
  currentQuestion = 0;
  accumulatedScore = 0;
  renderQuestion();
  quizSection?.classList.remove("hidden");
  resultSection?.classList.add("hidden");
  hintEl?.classList.add("hidden");
  fallbackStartButton?.classList.add("hidden");

  if (tg) {
    tg.MainButton.hide();
    tg.MainButton.offClick?.(handleMainButtonClick);
  }

  quizSection?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderQuestion() {
  const question = questions[currentQuestion];
  questionEl.textContent = question.prompt;
  optionsEl.innerHTML = "";
  currentSelection = null;
  nextButton.disabled = true;
  nextButton.textContent =
    currentQuestion === questions.length - 1 ? "See my vibe →" : "Next question →";

  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "option";
    button.type = "button";
    button.textContent = option.label;
    button.dataset.score = option.score;
    button.setAttribute("data-index", index.toString());

    button.addEventListener("click", () => selectOption(button));
    optionsEl.appendChild(button);
  });
}

function selectOption(button) {
  const previouslySelected = optionsEl.querySelector(".option.selected");
  if (previouslySelected) {
    previouslySelected.classList.remove("selected");
  }

  button.classList.add("selected");
  currentSelection = Number(button.dataset.score);
  nextButton.disabled = false;
}

function showResult() {
  const vibePercent = Math.round((accumulatedScore / (questions.length * maxScore)) * 100);
  const vibeLevel =
    vibePercent > 85
      ? "Ultra-aligned"
      : vibePercent > 60
      ? "Glow-up ready"
      : "Secretly simmering";

  resultText.innerHTML = `You're <strong>${vibePercent}%</strong> aligned with ${
    influencer.name
  } vibes. ${vibeLevel}!<br /><br />Keep channeling that ${
    influencer.vibeWord
  } magic — Luna is cheering you on with moonbeam emojis. 🌙✨`;

  quizSection.classList.add("hidden");
  resultSection.classList.remove("hidden");

  if (tg) {
    tg.MainButton.hide();
  }
}

nextButton.addEventListener("click", () => {
  if (currentSelection === null) return;

  accumulatedScore += currentSelection;

  if (currentQuestion < questions.length - 1) {
    currentQuestion += 1;
    renderQuestion();
  } else {
    showResult();
  }
});

restartButton.addEventListener("click", () => {
  currentQuestion = 0;
  accumulatedScore = 0;
  renderQuestion();
  quizSection.classList.remove("hidden");
  resultSection.classList.add("hidden");
});

if (copySalebotPayloadButton) {
  copySalebotPayloadButton.addEventListener("click", async () => {
    const payload = salebotPayloadEl?.textContent?.trim();
    if (!payload || payload === "—") {
      return;
    }

    if (!navigator.clipboard?.writeText) {
      console.warn("Clipboard API unavailable in this context.");
      return;
    }

    const originalLabel = copySalebotPayloadButton.textContent;
    try {
      await navigator.clipboard.writeText(payload);
      copySalebotPayloadButton.textContent = "Скопировано!";
      setTimeout(() => {
        copySalebotPayloadButton.textContent = originalLabel;
      }, 1500);
    } catch (error) {
      console.error("Unable to copy Salebot payload", error);
    }
  });
}

updateSalebotPayload("");
configureTelegramUi();
populateTelegramData();
sendInitDataToBot();
notifySalebotAboutOpen();

if (tg?.onEvent) {
  tg.onEvent("webAppReady", () => {
    populateTelegramData();
    sendInitDataToBot();
    notifySalebotAboutOpen();
  });

  tg.onEvent("themeChanged", populateTelegramData);
}
