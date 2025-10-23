const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
  tg.MainButton.hide();
  tg.setBackgroundColor?.("#130229");
  tg.setHeaderColor?.("#0d0221");
}

const influencer = {
  name: "Luna Nova",
  vibeWord: "cosmic creator",
};

if (tg?.initDataUnsafe?.user?.first_name) {
  const userName = tg.initDataUnsafe.user.first_name;
  const titleEl = document.getElementById("title");
  if (titleEl) {
    titleEl.textContent = `${userName}, find your Luna Nova vibe`;
  }
}

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

renderQuestion();
