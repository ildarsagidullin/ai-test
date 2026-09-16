/**
 * Бэкенд опроса для Google Apps Script.
 * 1. Создайте новый проект на script.google.com.
 * 2. Вставьте этот файл вместо стандартного кода.
 * 3. Запустите setupSurveyBackend один раз и разрешите доступ.
 * 4. Разверните проект как веб-приложение: выполнять от вашего имени,
 *    доступ — всем пользователям.
 */

const SURVEY_FIELDS = [
  ["submittedAt", "Дата и время"],
  ["submissionId", "ID отправки"],
  ["age", "Возраст"],
  ["frequency", "Частота использования"],
  ["employment", "Занятость"],
  ["income", "Доход"],
  ["tools", "Инструменты"],
  ["uses", "Задачи для ИИ"],
  ["experience", "Практический опыт"],
  ["paidSubscription", "Платная подписка"],
  ["goal", "Главная цель"],
  ["dynamicQuestion", "Персонализированный вопрос"],
  ["goalAction", "Что уже пробовал"],
  ["weeklyTime", "Время в неделю"],
  ["barriers", "Барьеры"],
  ["name", "Имя"],
  ["telegram", "Telegram"],
  ["consent", "Согласие"],
  ["score", "Общий балл"],
  ["scoreFrequency", "Баллы: частота"],
  ["scoreTools", "Баллы: инструменты"],
  ["scoreUses", "Баллы: задачи"],
  ["scoreExperience", "Баллы: опыт"],
  ["level", "Уровень"],
  ["recommendation", "Рекомендация"]
];

function setupSurveyBackend() {
  const properties = PropertiesService.getScriptProperties();
  const existingFormId = properties.getProperty("SURVEY_FORM_ID");
  if (existingFormId) {
    const existingForm = FormApp.openById(existingFormId);
    const existingSheetId = properties.getProperty("SURVEY_SHEET_ID");
    console.log("Форма уже создана: " + existingForm.getEditUrl());
    console.log("Таблица: https://docs.google.com/spreadsheets/d/" + existingSheetId + "/edit");
    return;
  }

  const spreadsheet = SpreadsheetApp.create("Ответы — тест уровня владения ИИ");
  const form = FormApp.create("Тест уровня владения ИИ");
  form.setDescription("Служебная форма для приёма ответов с сайта. Не удаляйте и не переименовывайте поля.");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  SURVEY_FIELDS.forEach(function(field) {
    form.addParagraphTextItem().setTitle(field[0] + " — " + field[1]).setRequired(false);
  });

  properties.setProperty("SURVEY_FORM_ID", form.getId());
  properties.setProperty("SURVEY_SHEET_ID", spreadsheet.getId());
  console.log("Форма: " + form.getEditUrl());
  console.log("Таблица: " + spreadsheet.getUrl());
}

function doPost(event) {
  try {
    const data = JSON.parse(event.postData.contents || "{}");
    validateSubmission_(data);

    const formId = PropertiesService.getScriptProperties().getProperty("SURVEY_FORM_ID");
    if (!formId) throw new Error("Сначала запустите setupSurveyBackend");

    const form = FormApp.openById(formId);
    const itemByKey = {};
    form.getItems(FormApp.ItemType.PARAGRAPH_TEXT).forEach(function(item) {
      const key = item.getTitle().split(" — ")[0];
      itemByKey[key] = item.asParagraphTextItem();
    });

    let response = form.createResponse();
    SURVEY_FIELDS.forEach(function(field) {
      const key = field[0];
      if (itemByKey[key]) {
        response = response.withItemResponse(itemByKey[key].createResponse(String(data[key] || "")));
      }
    });
    response.submit();
    return jsonResponse_({ ok: true, submissionId: data.submissionId });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: String(error.message || error) });
  }
}

function validateSubmission_(data) {
  const required = ["submissionId", "name", "telegram", "consent", "level", "score"];
  required.forEach(function(key) {
    if (!String(data[key] || "").trim()) throw new Error("Пропущено поле: " + key);
  });
  if (!/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(data.telegram)) throw new Error("Некорректный Telegram");
  if (data.consent !== "Да") throw new Error("Нет согласия на связь");
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

