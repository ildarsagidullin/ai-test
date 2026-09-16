import { levelDefinitions, surveyQuestions } from "./survey-config.js";

export function optionValue(option) {
  return typeof option === "string" ? option : option.value ?? option.label;
}

export function optionLabel(option) {
  return typeof option === "string" ? option : option.label;
}

export function getQuestion(id) {
  return surveyQuestions.find((question) => question.id === id);
}

export function getOption(question, value) {
  return question?.options?.find((option) => optionValue(option) === value);
}

export function getAnswerLabels(question, answer) {
  if (answer == null || answer === "") return [];
  if (question.type === "textarea") return [String(answer)];
  const values = Array.isArray(answer) ? answer : [answer];
  return values.map((value) => optionLabel(getOption(question, value) ?? value));
}

export function isAnswered(question, answer) {
  if (question.type === "multiple") return Array.isArray(answer) && answer.length > 0;
  return typeof answer === "string" && answer.trim().length > 0;
}

export function toggleMultiple(current, value, exclusiveValue) {
  const selected = new Set(Array.isArray(current) ? current : []);
  if (value === exclusiveValue) return selected.has(value) ? [] : [value];
  selected.delete(exclusiveValue);
  selected.has(value) ? selected.delete(value) : selected.add(value);
  return [...selected];
}

export function normalizeTelegram(raw) {
  let value = String(raw ?? "").trim();
  value = value.replace(/^https?:\/\//i, "").replace(/^t\.me\//i, "").replace(/^@/, "");
  value = value.replace(/\/$/, "");
  if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value)) return null;
  return `@${value}`;
}

export function calculateScore(answers) {
  const frequencyQuestion = getQuestion("frequency");
  const frequencyOption = getOption(frequencyQuestion, answers.frequency);
  const frequency = Number(frequencyOption?.score ?? 0);

  const tools = answers.tools?.includes("none") ? 0 : Math.min(3, Math.ceil((answers.tools?.length ?? 0) / 1.5));

  const useQuestion = getQuestion("uses");
  const uses = Math.max(0, ...(answers.uses ?? []).map((value) => Number(getOption(useQuestion, value)?.depth ?? 0)));

  const experienceQuestion = getQuestion("experience");
  const experience = Math.max(0, ...(answers.experience ?? []).map((value) => Number(getOption(experienceQuestion, value)?.depth ?? 0)));

  return { total: frequency + tools + uses + experience, parts: { frequency, tools, uses, experience } };
}

export function getLevel(score) {
  return levelDefinitions.find((level) => score >= level.min && score <= level.max) ?? levelDefinitions[0];
}

export function getDynamicQuestion(answers) {
  const goalQuestion = getQuestion("goal");
  return getOption(goalQuestion, answers.goal)?.prompt ?? "Что ты уже пробовал делать с помощью ИИ?";
}

export function getRecommendation(answers, level) {
  const goalQuestion = getQuestion("goal");
  const goalAction = getOption(goalQuestion, answers.goal)?.action ?? "Выбери один конкретный следующий шаг и выполни его на этой неделе.";
  return `${level.next} ${goalAction}`;
}

export function createSubmissionPayload(answers, contact, submissionId) {
  const scoring = calculateScore(answers);
  const level = getLevel(scoring.total);
  const recommendation = getRecommendation(answers, level);
  const payload = {
    submittedAt: new Date().toISOString(),
    submissionId,
    dynamicQuestion: getDynamicQuestion(answers),
    name: contact.name.trim(),
    telegram: normalizeTelegram(contact.telegram),
    consent: contact.consent ? "Да" : "Нет",
    score: String(scoring.total),
    scoreFrequency: String(scoring.parts.frequency),
    scoreTools: String(scoring.parts.tools),
    scoreUses: String(scoring.parts.uses),
    scoreExperience: String(scoring.parts.experience),
    level: level.name,
    recommendation
  };

  for (const question of surveyQuestions) {
    payload[question.id] = getAnswerLabels(question, answers[question.id]).join(" | ");
  }

  return { payload, scoring, level, recommendation };
}

