// UI strings + prompt templates for the 3 supported languages. Loaded before
// core/storage.js everywhere, since storage.js's defaults reference this file.

const SUPPORTED_LANGUAGES = ['ru', 'en', 'de'];
const DEFAULT_UI_LANGUAGE = 'ru';

const PROMPT_TEMPLATES = {
  ru: `Ты анализируешь комментарии под YouTube-видео.
Видео: "{{videoTitle}}"
Ссылка: {{videoUrl}}

Выдели среди комментариев:
- содержательные комментарии по теме видео;
- личный опыт и личные истории авторов;
- тематические наблюдения и мнения по существу.

Отбрось при анализе:
- короткие и бессодержательные реплики;
- generic-похвалу без содержания ("круто", "супер видео" и т.п.);
- оффтоп, не относящийся к теме видео.

В ответе верни:
1. Общий summary обсуждения в комментариях.
2. Лучшие комментарии (переведи на русский, если нужно) и краткий summary под каждым из комментариев.

Ниже {{count}} комментариев:`,

  en: `You are analyzing comments under a YouTube video.
Video: "{{videoTitle}}"
Link: {{videoUrl}}

Highlight among the comments:
- substantive comments related to the video's topic;
- personal experience and personal stories from the authors;
- thematic observations and opinions of substance.

Discard from the analysis:
- short and uninformative remarks;
- generic praise with no content ("great video", "awesome", etc.);
- off-topic remarks unrelated to the video.

In your answer return:
1. An overall summary of the discussion in the comments.
2. The best comments (translate to English if needed) with a short summary under each one.

Below are {{count}} comments:`,

  de: `Du analysierst Kommentare unter einem YouTube-Video.
Video: "{{videoTitle}}"
Link: {{videoUrl}}

Hebe unter den Kommentaren hervor:
- inhaltsreiche Kommentare zum Thema des Videos;
- persönliche Erfahrungen und persönliche Geschichten der Autoren;
- thematische Beobachtungen und inhaltliche Meinungen.

Verwirf bei der Analyse:
- kurze und nichtssagende Bemerkungen;
- generisches Lob ohne Inhalt ("tolles Video", "super" usw.);
- Off-Topic-Kommentare, die nichts mit dem Video zu tun haben.

Gib in deiner Antwort zurück:
1. Eine Gesamtzusammenfassung der Diskussion in den Kommentaren.
2. Die besten Kommentare (bei Bedarf ins Deutsche übersetzen) mit einer kurzen Zusammenfassung zu jedem.

Es folgen {{count}} Kommentare:`,
};

function getDefaultPromptTemplate(lang) {
  return PROMPT_TEMPLATES[lang] || PROMPT_TEMPLATES[DEFAULT_UI_LANGUAGE];
}

function isKnownDefaultPromptTemplate(text) {
  return Object.values(PROMPT_TEMPLATES).includes(text);
}

const UI_STRINGS = {
  ru: {
    optionsTitle: 'Copy for LLM — настройки',
    labelMinChars: 'Min length (символов)',
    labelMinWords: 'Min words',
    labelMaxComments: 'Max comments',
    labelMaxTotalChars: 'Max total characters',
    labelIncludeReplies: 'Include replies',
    labelCustomUrl: 'Custom URL (для кнопки "Open Custom")',
    labelPromptTemplate: 'Prompt для LLM',
    hintPromptTemplate:
      'Плейсхолдеры: {{videoTitle}}, {{videoUrl}}, {{count}}. Список комментариев [1] ... [2] ... добавляется автоматически после этого текста.',
    labelLanguage: 'Язык интерфейса и prompt',
    buttonResetPrompt: 'Восстановить prompt по умолчанию',
    buttonSave: 'Сохранить',
    savedLabel: 'Сохранено ✓',
    popupTitle: 'Copy for LLM',
    buttonCopy: 'Copy',
    buttonOpenPrefix: 'Open',
    placeholderCustomUrl: 'Custom URL',
    linkMoreSettings: 'Больше настроек',
    statusCollecting: 'Собираю комментарии…',
    statusCollectingProgress: (raw, filtered) => `Собрано ${raw} (подходит ${filtered})…`,
    statusNoComments: 'Подходящих комментариев не найдено',
    statusCopyFailed: 'Не удалось скопировать в буфер обмена',
    statusDone: (count) => `Готово: ${count} комментариев скопировано. Выберите LLM →`,
    statusDonePopup: (count) => `Готово: ${count} комментариев скопировано. Откройте LLM ниже.`,
    statusErrorGeneric: 'Ошибка сбора комментариев',
    statusFirstCopy: 'Сначала нажмите Copy',
    statusSetCustomUrl: 'Задайте Custom URL в настройках расширения',
    statusSetCustomUrlPopup: 'Укажите Custom URL',
    statusOpenYouTube: 'Откройте страницу видео на YouTube',
    statusCopyRunFailed: 'Не удалось запустить сбор. Обновите страницу YouTube и попробуйте снова.',
    statusOpening: 'Открываю…',
    statusLastError: (time, message) => `Последняя ошибка (${time}): ${message}`,
  },
  en: {
    optionsTitle: 'Copy for LLM — Settings',
    labelMinChars: 'Min length (characters)',
    labelMinWords: 'Min words',
    labelMaxComments: 'Max comments',
    labelMaxTotalChars: 'Max total characters',
    labelIncludeReplies: 'Include replies',
    labelCustomUrl: 'Custom URL (for the "Open Custom" button)',
    labelPromptTemplate: 'Prompt for the LLM',
    hintPromptTemplate:
      'Placeholders: {{videoTitle}}, {{videoUrl}}, {{count}}. The comment list [1] ... [2] ... is appended automatically after this text.',
    labelLanguage: 'Interface & prompt language',
    buttonResetPrompt: 'Reset prompt to default',
    buttonSave: 'Save',
    savedLabel: 'Saved ✓',
    popupTitle: 'Copy for LLM',
    buttonCopy: 'Copy',
    buttonOpenPrefix: 'Open',
    placeholderCustomUrl: 'Custom URL',
    linkMoreSettings: 'More settings',
    statusCollecting: 'Collecting comments…',
    statusCollectingProgress: (raw, filtered) => `Collected ${raw} (${filtered} match)…`,
    statusNoComments: 'No matching comments found',
    statusCopyFailed: 'Could not copy to clipboard',
    statusDone: (count) => `Done: ${count} comments copied. Choose an LLM →`,
    statusDonePopup: (count) => `Done: ${count} comments copied. Open an LLM below.`,
    statusErrorGeneric: 'Error collecting comments',
    statusFirstCopy: 'Click Copy first',
    statusSetCustomUrl: 'Set the Custom URL in the extension settings',
    statusSetCustomUrlPopup: 'Enter a Custom URL',
    statusOpenYouTube: 'Open a YouTube video page',
    statusCopyRunFailed: 'Could not start collection. Reload the YouTube page and try again.',
    statusOpening: 'Opening…',
    statusLastError: (time, message) => `Last error (${time}): ${message}`,
  },
  de: {
    optionsTitle: 'Copy for LLM — Einstellungen',
    labelMinChars: 'Min. Länge (Zeichen)',
    labelMinWords: 'Min. Wörter',
    labelMaxComments: 'Max. Kommentare',
    labelMaxTotalChars: 'Max. Gesamtzeichen',
    labelIncludeReplies: 'Antworten einbeziehen',
    labelCustomUrl: 'Custom URL (für den Button "Open Custom")',
    labelPromptTemplate: 'Prompt für die LLM',
    hintPromptTemplate:
      'Platzhalter: {{videoTitle}}, {{videoUrl}}, {{count}}. Die Kommentarliste [1] ... [2] ... wird automatisch danach angehängt.',
    labelLanguage: 'Sprache der Oberfläche & des Prompts',
    buttonResetPrompt: 'Prompt zurücksetzen',
    buttonSave: 'Speichern',
    savedLabel: 'Gespeichert ✓',
    popupTitle: 'Copy for LLM',
    buttonCopy: 'Copy',
    buttonOpenPrefix: 'Open',
    placeholderCustomUrl: 'Custom URL',
    linkMoreSettings: 'Weitere Einstellungen',
    statusCollecting: 'Kommentare werden gesammelt…',
    statusCollectingProgress: (raw, filtered) => `${raw} gesammelt (${filtered} passend)…`,
    statusNoComments: 'Keine passenden Kommentare gefunden',
    statusCopyFailed: 'Kopieren in die Zwischenablage fehlgeschlagen',
    statusDone: (count) => `Fertig: ${count} Kommentare kopiert. LLM auswählen →`,
    statusDonePopup: (count) => `Fertig: ${count} Kommentare kopiert. Öffne unten eine LLM.`,
    statusErrorGeneric: 'Fehler beim Sammeln der Kommentare',
    statusFirstCopy: 'Zuerst auf Copy klicken',
    statusSetCustomUrl: 'Custom URL in den Erweiterungseinstellungen festlegen',
    statusSetCustomUrlPopup: 'Custom URL eingeben',
    statusOpenYouTube: 'Öffne eine YouTube-Video-Seite',
    statusCopyRunFailed: 'Sammeln konnte nicht gestartet werden. YouTube-Seite neu laden und erneut versuchen.',
    statusOpening: 'Öffne…',
    statusLastError: (time, message) => `Letzter Fehler (${time}): ${message}`,
  },
};

function t(lang, key, ...args) {
  const dict = UI_STRINGS[lang] || UI_STRINGS[DEFAULT_UI_LANGUAGE];
  const entry = key in dict ? dict[key] : UI_STRINGS[DEFAULT_UI_LANGUAGE][key];
  return typeof entry === 'function' ? entry(...args) : entry;
}
