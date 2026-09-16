import { submissionEndpoint, surveyQuestions } from "./survey-config.js?v=4";
import {
  calculateScore,
  createSubmissionPayload,
  getDynamicQuestion,
  getLevel,
  getOption,
  getRecommendation,
  isAnswered,
  normalizeTelegram,
  optionLabel,
  optionValue,
  toggleMultiple
} from "./survey-engine.js?v=4";

const DRAFT_KEY = "ai-survey-draft-v1";
const COMPLETE_KEY = "ai-survey-complete-v1";
const app = document.querySelector("#app");

const initialState = {
  screen: "intro",
  index: 0,
  answers: {},
  contact: { name: "", telegram: "", consent: false },
  error: "",
  submitting: false
};

let state = loadDraft();

function loadDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(DRAFT_KEY));
    return saved ? { ...initialState, ...saved, error: "", submitting: false } : structuredClone(initialState);
  } catch {
    return structuredClone(initialState);
  }
}

function saveDraft() {
  const { error: _error, submitting: _submitting, ...persisted } = state;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(persisted));
}

function completedResult() {
  try { return JSON.parse(localStorage.getItem(COMPLETE_KEY)); } catch { return null; }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function button(label, className, onClick, disabled = false) {
  const node = el("button", `btn ${className}`, label);
  node.type = "button";
  node.disabled = disabled;
  node.addEventListener("click", onClick);
  return node;
}

function progress(current, total) {
  const wrap = el("div", "progress-wrap");
  const meta = el("div", "progress-meta");
  meta.append(el("span", "", `Вопрос ${current} из ${total}`), el("span", "", `${Math.round((current / total) * 100)}%`));
  const track = el("div", "progress-track");
  const bar = el("div", "progress-bar");
  bar.style.width = `${(current / total) * 100}%`;
  track.append(bar);
  wrap.append(meta, track);
  return wrap;
}

function render() {
  app.replaceChildren();
  const complete = completedResult();
  if (complete) {
    const justSubmitted = sessionStorage.getItem("ai-survey-just-submitted") === "1";
    sessionStorage.removeItem("ai-survey-just-submitted");
    return renderResult(complete, !justSubmitted);
  }
  if (state.screen === "intro") return renderIntro();
  if (state.screen === "contact") return renderContact();
  renderQuestion();
}

function renderIntro() {
  const eyebrow = el("div", "eyebrow", "Персональный результат");
  const title = el("h1", "", "Какой у тебя уровень владения ИИ?");
  const lead = el("p", "lead", "Короткий тест покажет твой реальный уровень — не тот, который ты себе представляешь, а тот, что видно по практике. В конце ты получишь конкретный следующий шаг для развития.");
  const meta = el("div", "start-meta");
  meta.append(el("span", "pill", "2–3 минуты"), el("span", "pill", "12 вопросов"), el("span", "pill", "Результат сразу"));
  const start = button("Начать тест →", "btn-primary btn-large", () => {
    state.screen = "question";
    state.index = 0;
    saveDraft();
    render();
  });
  app.append(eyebrow, title, lead, meta, start);
}

function renderQuestion() {
  const question = surveyQuestions[state.index];
  const titleText = question.dynamicFrom ? getDynamicQuestion(state.answers) : question.title;
  app.append(progress(state.index + 1, surveyQuestions.length + 1));

  const heading = el("h2", "", titleText);
  heading.tabIndex = -1;
  app.append(heading);
  if (question.hint) app.append(el("p", "hint", question.hint));

  if (question.type === "textarea") {
    const textarea = el("textarea", "textarea-field");
    textarea.placeholder = question.placeholder ?? "";
    textarea.maxLength = 1200;
    textarea.value = state.answers[question.id] ?? "";
    textarea.addEventListener("input", () => {
      state.answers[question.id] = textarea.value;
      state.error = "";
      saveDraft();
    });
    app.append(textarea);
  } else {
    app.append(renderOptions(question));
  }

  const error = el("div", "error-message", state.error);
  error.setAttribute("role", "alert");
  app.append(error, renderQuestionActions(question));
  requestAnimationFrame(() => heading.focus({ preventScroll: true }));
}

function renderOptions(question) {
  const options = el("div", "options");
  options.setAttribute("role", question.type === "single" ? "radiogroup" : "group");
  const current = state.answers[question.id];

  for (const option of question.options) {
    const value = optionValue(option);
    const label = el("label", "option");
    const input = el("input");
    input.type = question.type === "single" ? "radio" : "checkbox";
    input.name = question.id;
    input.value = value;
    input.checked = question.type === "single" ? current === value : (current ?? []).includes(value);
    input.addEventListener("change", () => {
      if (question.type === "single") state.answers[question.id] = value;
      else state.answers[question.id] = toggleMultiple(state.answers[question.id], value, question.exclusive);
      state.error = "";
      saveDraft();
      if (question.type === "multiple") render();
    });
    label.append(input, el("span", "option-text", optionLabel(option)));
    options.append(label);
  }
  return options;
}

function renderQuestionActions(question) {
  const actions = el("div", "actions");
  actions.append(button("← Назад", "btn-secondary", goBack));
  actions.append(button("Далее →", "btn-primary", () => {
    if (!isAnswered(question, state.answers[question.id])) {
      state.error = question.type === "textarea" ? "Напиши хотя бы короткий ответ." : "Выбери хотя бы один вариант.";
      return render();
    }
    state.error = "";
    if (state.index < surveyQuestions.length - 1) state.index += 1;
    else state.screen = "contact";
    saveDraft();
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }));
  return actions;
}

function goBack() {
  state.error = "";
  if (state.screen === "contact") {
    state.screen = "question";
    state.index = surveyQuestions.length - 1;
  } else if (state.index === 0) {
    state.screen = "intro";
  } else {
    state.index -= 1;
  }
  saveDraft();
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function contactField(labelText, name, placeholder, autocomplete) {
  const group = el("div", "field-group");
  const label = el("label", "field-label", labelText);
  label.htmlFor = name;
  const input = el("input", "text-field");
  input.id = name;
  input.name = name;
  input.placeholder = placeholder;
  input.autocomplete = autocomplete;
  input.maxLength = 80;
  input.value = state.contact[name];
  input.addEventListener("input", () => {
    state.contact[name] = input.value;
    state.error = "";
    saveDraft();
  });
  group.append(label, input);
  return group;
}

function renderContact() {
  app.append(progress(surveyQuestions.length + 1, surveyQuestions.length + 1));
  const heading = el("h2", "", "Куда отправить бонус и результаты?");
  const lead = el("p", "lead", "Оставь имя и Telegram. Я изучу ответы и смогу связаться с тобой лично.");
  app.append(heading, lead);
  app.append(contactField("Как тебя зовут?", "name", "Например, Ильдар", "name"));
  app.append(contactField("Твой Telegram", "telegram", "@username или t.me/username", "username"));

  const consent = el("label", "consent");
  const checkbox = el("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.contact.consent;
  checkbox.addEventListener("change", () => {
    state.contact.consent = checkbox.checked;
    state.error = "";
    saveDraft();
  });
  consent.append(checkbox, el("span", "", "Я согласен на обработку моих ответов и на связь со мной в Telegram по поводу результатов исследования и бонусов."));
  app.append(consent);

  const error = el("div", "error-message", state.error);
  error.setAttribute("role", "alert");
  const actions = el("div", "actions");
  actions.append(button("← Назад", "btn-secondary", goBack));
  actions.append(button(state.submitting ? "Отправляем…" : "Получить результат →", "btn-primary", submitSurvey, state.submitting));
  app.append(error, actions);
  requestAnimationFrame(() => heading.focus({ preventScroll: true }));
}

function validateContact() {
  if (state.contact.name.trim().length < 2) return "Укажи имя — хотя бы два символа.";
  if (!normalizeTelegram(state.contact.telegram)) return "Проверь Telegram: нужен username из 5–32 латинских букв, цифр или знаков подчёркивания.";
  if (!state.contact.consent) return "Нужно подтвердить согласие, чтобы мы могли связаться с тобой.";
  return "";
}

function createSubmissionId() {
  return globalThis.crypto?.randomUUID?.() ?? `survey-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function submitSurvey() {
  const validationError = validateContact();
  if (validationError) {
    state.error = validationError;
    return render();
  }

  const submissionId = createSubmissionId();
  const result = createSubmissionPayload(state.answers, state.contact, submissionId);
  const demoMode = new URLSearchParams(location.search).get("demo") === "1";

  if (!submissionEndpoint && !demoMode) {
    state.error = "Сбор ответов ещё настраивается. Попробуй пройти тест немного позже.";
    return render();
  }

  state.submitting = true;
  state.error = "";
  render();

  try {
    if (!demoMode) {
      await fetch(submissionEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(result.payload)
      });
    }
    const stored = { score: result.scoring.total, level: result.level, recommendation: result.recommendation, submittedAt: result.payload.submittedAt };
    localStorage.setItem(COMPLETE_KEY, JSON.stringify(stored));
    sessionStorage.setItem("ai-survey-just-submitted", "1");
    localStorage.removeItem(DRAFT_KEY);
    state.submitting = false;
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    state.submitting = false;
    state.error = "Не удалось отправить ответы. Проверь интернет — всё заполненное сохранено, можно попробовать ещё раз.";
    saveDraft();
    render();
  }
}

function renderResult(stored, alreadyCompleted = false) {
  const level = typeof stored.level === "object" ? stored.level : getLevel(Number(stored.score));
  app.append(el("div", "eyebrow", alreadyCompleted ? "Тест уже пройден" : "Твой результат"));
  app.append(el("h1", "result-title", level.name));
  app.append(el("p", "lead", level.summary));

  const score = el("div", "result-score");
  score.append(el("div", "score-number", `${stored.score}/14`));
  const scoreCopy = el("div", "score-copy");
  scoreCopy.append(el("strong", "", "Результат основан на практике"), el("p", "", "Мы учли частоту использования, набор инструментов, реальные задачи и твой опыт создания решений."));
  score.append(scoreCopy);

  const recommendation = el("div", "recommendation");
  recommendation.append(el("h3", "", "Что подтянуть в первую очередь"), el("p", "", stored.recommendation));
  app.append(score, recommendation, el("p", "thank-you", "Спасибо за ответы! Я изучу их и свяжусь с тобой в Telegram, чтобы передать бонус."));
}

render();

