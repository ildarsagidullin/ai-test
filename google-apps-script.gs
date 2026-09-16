/**
 * Р‘СЌРєРµРЅРґ РѕРїСЂРѕСЃР° РґР»СЏ Google Apps Script.
 * 1. РЎРѕР·РґР°Р№С‚Рµ РЅРѕРІС‹Р№ РїСЂРѕРµРєС‚ РЅР° script.google.com.
 * 2. Р’СЃС‚Р°РІСЊС‚Рµ СЌС‚РѕС‚ С„Р°Р№Р» РІРјРµСЃС‚Рѕ СЃС‚Р°РЅРґР°СЂС‚РЅРѕРіРѕ РєРѕРґР°.
 * 3. Р—Р°РїСѓСЃС‚РёС‚Рµ setupSurveyBackend РѕРґРёРЅ СЂР°Р· Рё СЂР°Р·СЂРµС€РёС‚Рµ РґРѕСЃС‚СѓРї.
 * 4. Р Р°Р·РІРµСЂРЅРёС‚Рµ РїСЂРѕРµРєС‚ РєР°Рє РІРµР±-РїСЂРёР»РѕР¶РµРЅРёРµ: РІС‹РїРѕР»РЅСЏС‚СЊ РѕС‚ РІР°С€РµРіРѕ РёРјРµРЅРё,
 *    РґРѕСЃС‚СѓРї вЂ” РІСЃРµРј РїРѕР»СЊР·РѕРІР°С‚РµР»СЏРј.
 */

const SURVEY_FIELDS = [
  ["submittedAt", "Р”Р°С‚Р° Рё РІСЂРµРјСЏ"],
  ["submissionId", "ID РѕС‚РїСЂР°РІРєРё"],
  ["age", "Р’РѕР·СЂР°СЃС‚"],
  ["frequency", "Р§Р°СЃС‚РѕС‚Р° РёСЃРїРѕР»СЊР·РѕРІР°РЅРёСЏ"],
  ["employment", "Р—Р°РЅСЏС‚РѕСЃС‚СЊ"],
  ["income", "Р”РѕС…РѕРґ"],
  ["tools", "РРЅСЃС‚СЂСѓРјРµРЅС‚С‹"],
  ["uses", "Р—Р°РґР°С‡Рё РґР»СЏ РР"],
  ["experience", "РџСЂР°РєС‚РёС‡РµСЃРєРёР№ РѕРїС‹С‚"],
  ["paidSubscription", "РџР»Р°С‚РЅР°СЏ РїРѕРґРїРёСЃРєР°"],
  ["goal", "Р“Р»Р°РІРЅР°СЏ С†РµР»СЊ"],
  ["dynamicQuestion", "РџРµСЂСЃРѕРЅР°Р»РёР·РёСЂРѕРІР°РЅРЅС‹Р№ РІРѕРїСЂРѕСЃ"],
  ["goalAction", "Р§С‚Рѕ СѓР¶Рµ РїСЂРѕР±РѕРІР°Р»"],
  ["weeklyTime", "Р’СЂРµРјСЏ РІ РЅРµРґРµР»СЋ"],
  ["barriers", "Р‘Р°СЂСЊРµСЂС‹"],
  ["name", "РРјСЏ"],
  ["telegram", "Telegram"],
  ["consent", "РЎРѕРіР»Р°СЃРёРµ"],
  ["score", "РћР±С‰РёР№ Р±Р°Р»Р»"],
  ["scoreFrequency", "Р‘Р°Р»Р»С‹: С‡Р°СЃС‚РѕС‚Р°"],
  ["scoreTools", "Р‘Р°Р»Р»С‹: РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹"],
  ["scoreUses", "Р‘Р°Р»Р»С‹: Р·Р°РґР°С‡Рё"],
  ["scoreExperience", "Р‘Р°Р»Р»С‹: РѕРїС‹С‚"],
  ["level", "РЈСЂРѕРІРµРЅСЊ"],
  ["recommendation", "Р РµРєРѕРјРµРЅРґР°С†РёСЏ"]
];

function setupSurveyBackend() {
  const properties = PropertiesService.getScriptProperties();
  const existingFormId = properties.getProperty("SURVEY_FORM_ID");
  if (existingFormId) {
    const existingForm = FormApp.openById(existingFormId);
    const existingSheetId = properties.getProperty("SURVEY_SHEET_ID");
    console.log("Р¤РѕСЂРјР° СѓР¶Рµ СЃРѕР·РґР°РЅР°: " + existingForm.getEditUrl());
    console.log("РўР°Р±Р»РёС†Р°: https://docs.google.com/spreadsheets/d/" + existingSheetId + "/edit");
    return;
  }

  const spreadsheet = SpreadsheetApp.create("РћС‚РІРµС‚С‹ вЂ” С‚РµСЃС‚ СѓСЂРѕРІРЅСЏ РІР»Р°РґРµРЅРёСЏ РР");
  const form = FormApp.create("РўРµСЃС‚ СѓСЂРѕРІРЅСЏ РІР»Р°РґРµРЅРёСЏ РР");
  form.setDescription("РЎР»СѓР¶РµР±РЅР°СЏ С„РѕСЂРјР° РґР»СЏ РїСЂРёС‘РјР° РѕС‚РІРµС‚РѕРІ СЃ СЃР°Р№С‚Р°. РќРµ СѓРґР°Р»СЏР№С‚Рµ Рё РЅРµ РїРµСЂРµРёРјРµРЅРѕРІС‹РІР°Р№С‚Рµ РїРѕР»СЏ.");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, spreadsheet.getId());

  SURVEY_FIELDS.forEach(function(field) {
    form.addParagraphTextItem().setTitle(field[0] + " вЂ” " + field[1]).setRequired(false);
  });

  properties.setProperty("SURVEY_FORM_ID", form.getId());
  properties.setProperty("SURVEY_SHEET_ID", spreadsheet.getId());
  console.log("Р¤РѕСЂРјР°: " + form.getEditUrl());
  console.log("РўР°Р±Р»РёС†Р°: " + spreadsheet.getUrl());
}

function doPost(event) {
  try {
    const data = JSON.parse(event.postData.contents || "{}");
    validateSubmission_(data);

    const formId = PropertiesService.getScriptProperties().getProperty("SURVEY_FORM_ID");
    if (!formId) throw new Error("РЎРЅР°С‡Р°Р»Р° Р·Р°РїСѓСЃС‚РёС‚Рµ setupSurveyBackend");

    const form = FormApp.openById(formId);
    const itemByKey = {};
    form.getItems(FormApp.ItemType.PARAGRAPH_TEXT).forEach(function(item) {
      const key = item.getTitle().split(" вЂ” ")[0];
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
    if (!String(data[key] || "").trim()) throw new Error("РџСЂРѕРїСѓС‰РµРЅРѕ РїРѕР»Рµ: " + key);
  });
  if (!/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(data.telegram)) throw new Error("РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ Telegram");
  if (data.consent !== "Р”Р°") throw new Error("РќРµС‚ СЃРѕРіР»Р°СЃРёСЏ РЅР° СЃРІСЏР·СЊ");
}

function jsonResponse_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

