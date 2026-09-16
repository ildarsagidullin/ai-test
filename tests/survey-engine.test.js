import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateScore,
  getDynamicQuestion,
  getLevel,
  normalizeTelegram,
  toggleMultiple
} from "../survey-engine.js";

test("normalizes supported Telegram formats", () => {
  assert.equal(normalizeTelegram("username"), "@username");
  assert.equal(normalizeTelegram("@user_name"), "@user_name");
  assert.equal(normalizeTelegram("https://t.me/username"), "@username");
  assert.equal(normalizeTelegram("t.me/username/"), "@username");
});

test("rejects invalid Telegram usernames", () => {
  assert.equal(normalizeTelegram("abc"), null);
  assert.equal(normalizeTelegram("12345"), null);
  assert.equal(normalizeTelegram("имяпользователя"), null);
});

test("exclusive multiple option replaces other choices", () => {
  assert.deepEqual(toggleMultiple(["ChatGPT", "Claude"], "none", "none"), ["none"]);
  assert.deepEqual(toggleMultiple(["none"], "ChatGPT", "none"), ["ChatGPT"]);
});

test("calculates lower and upper score boundaries", () => {
  const minimum = calculateScore({ frequency: "none", tools: ["none"], uses: ["unused"], experience: ["nothing"] });
  assert.equal(minimum.total, 0);

  const maximum = calculateScore({
    frequency: "often",
    tools: ["ChatGPT", "Claude", "Gemini", "Perplexity"],
    uses: ["automation"],
    experience: ["api"]
  });
  assert.equal(maximum.total, 14);
});

test("maps all score thresholds to levels", () => {
  assert.equal(getLevel(0).name, "Новичок");
  assert.equal(getLevel(2).name, "Новичок");
  assert.equal(getLevel(3).name, "Пользователь");
  assert.equal(getLevel(6).name, "Пользователь");
  assert.equal(getLevel(7).name, "Практик");
  assert.equal(getLevel(10).name, "Практик");
  assert.equal(getLevel(11).name, "Создатель");
  assert.equal(getLevel(14).name, "Создатель");
});

test("returns the goal-specific dynamic question", () => {
  assert.match(getDynamicQuestion({ goal: "earn" }), /увеличить свой заработок/);
  assert.match(getDynamicQuestion({ goal: "business" }), /процессы в своём бизнесе/);
  assert.match(getDynamicQuestion({ goal: "freelance" }), /перейти на фриланс/);
});

