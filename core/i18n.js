// UI strings + prompt templates for the 3 supported languages. Loaded before
// core/storage.js everywhere, since storage.js's defaults reference this file.

// The supported languages are the keys of UI_STRINGS / PROMPT_TEMPLATES below,
// and the supported content sources are the keys of PROMPT_TEMPLATES — both
// enumerated in the options page's <select>s, so no separate list is kept here.
const DEFAULT_UI_LANGUAGE = 'ru';

// What a Copy run collects. Also the key into PROMPT_TEMPLATES below: each
// source needs its own instructions, since "summarize this talk" and "sift
// these opinions" are different asks.
const DEFAULT_CONTENT_SOURCE = 'comments';

const PROMPT_TEMPLATES = {
  comments: {
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
  },

  transcript: {
    ru: `Ты анализируешь транскрипт (субтитры) YouTube-видео.
Видео: "{{videoTitle}}"
Ссылка: {{videoUrl}}

Транскрипт взят из субтитров и может быть распознан автоматически: возможны отсутствие пунктуации, ошибки в словах и именах, разбиение фраз не по смыслу. Учитывай это и не цитируй дословно явные ошибки распознавания.

В ответе верни:
1. Очень краткое summary: о чём видео и какие в нём основные тезисы.
2. Разбор по смысловым блокам — с таймкодами, если они есть в транскрипте, если нет таймкодов, то кратко изложи содержание в 20 пунктах.
3. Самые главные выводы, факты и цифры.

Ниже транскрипт:`,

    en: `You are analyzing the transcript (captions) of a YouTube video.
Video: "{{videoTitle}}"
Link: {{videoUrl}}

The transcript comes from captions and may be auto-generated: expect missing punctuation, misheard words and names, and phrases split at odd places. Take that into account and don't quote obvious recognition errors verbatim.

In your answer return:
1. A very short summary: what the video is about and its main points.
2. A breakdown by topic — with timestamps, if the transcript has timestamps, otherwise, briefly outline the content in 20 points.
3. The key conclusions, facts and figures.

Below is the transcript:`,

    de: `Du analysierst das Transkript (die Untertitel) eines YouTube-Videos.
Video: "{{videoTitle}}"
Link: {{videoUrl}}

Das Transkript stammt aus den Untertiteln und kann automatisch erzeugt sein: fehlende Satzzeichen, falsch erkannte Wörter und Namen sowie unsinnig getrennte Sätze sind möglich. Berücksichtige das und zitiere offensichtliche Erkennungsfehler nicht wörtlich.

Gib in deiner Antwort zurück:
1. Eine sehr kurze Zusammenfassung: worum es im Video geht und welche Kernaussagen es enthält.
2. Eine Gliederung nach Sinnabschnitten — mit Zeitmarken, sofern das Transkript welche Zeitmarken enthält_ andernfalls den Inhalt in maximal 20 Punkten zusammenfassen.
3. Die wichtigsten Schlussfolgerungen, Fakten und Zahlen.

Es folgt das Transkript:`,
  },

  both: {
    ru: `Ты анализируешь YouTube-видео: его транскрипт (субтитры) и комментарии под ним.
Видео: "{{videoTitle}}"
Ссылка: {{videoUrl}}

Транскрипт взят из субтитров и может быть распознан автоматически: возможны отсутствие пунктуации и ошибки в словах и именах. Учитывай это.
Комментарии отобраны локальным фильтром по длине — это не все комментарии под видео, а {{count}} самых развёрнутых.

В ответе верни:
1. Краткое summary самого видео по транскрипту.
2. Summary обсуждения в комментариях.
3. Где комментарии дополняют, уточняют или опровергают сказанное в видео.
4. Лучшие комментарии с краткой пометкой, почему каждый из них важен.

Ниже транскрипт и комментарии:`,

    en: `You are analyzing a YouTube video: its transcript (captions) and the comments under it.
Video: "{{videoTitle}}"
Link: {{videoUrl}}

The transcript comes from captions and may be auto-generated: expect missing punctuation and misheard words and names. Take that into account.
The comments were picked by a local length filter — not every comment under the video, but the {{count}} most detailed ones.

In your answer return:
1. A short summary of the video itself, based on the transcript.
2. A summary of the discussion in the comments.
3. Where the comments add to, refine, or contradict what the video says.
4. The best comments, each with a short note on why it matters.

Below are the transcript and the comments:`,

    de: `Du analysierst ein YouTube-Video: sein Transkript (die Untertitel) und die Kommentare darunter.
Video: "{{videoTitle}}"
Link: {{videoUrl}}

Das Transkript stammt aus den Untertiteln und kann automatisch erzeugt sein: fehlende Satzzeichen und falsch erkannte Wörter und Namen sind möglich. Berücksichtige das.
Die Kommentare wurden von einem lokalen Längenfilter ausgewählt — nicht alle Kommentare unter dem Video, sondern die {{count}} ausführlichsten.

Gib in deiner Antwort zurück:
1. Eine kurze Zusammenfassung des Videos selbst anhand des Transkripts.
2. Eine Zusammenfassung der Diskussion in den Kommentaren.
3. Wo die Kommentare das Gesagte ergänzen, präzisieren oder widerlegen.
4. Die besten Kommentare mit einer kurzen Notiz, warum sie jeweils wichtig sind.

Es folgen Transkript und Kommentare:`,
  },
};

function getDefaultPromptTemplate(lang, source = DEFAULT_CONTENT_SOURCE) {
  const bySource = PROMPT_TEMPLATES[source] || PROMPT_TEMPLATES[DEFAULT_CONTENT_SOURCE];
  return bySource[lang] || bySource[DEFAULT_UI_LANGUAGE];
}

// True if `text` is any language's default for any source — i.e. the user has
// not customized it, so switching language may safely swap it out.
function isKnownDefaultPromptTemplate(text) {
  return Object.values(PROMPT_TEMPLATES).some((bySource) => Object.values(bySource).includes(text));
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
    labelContentSource: 'Что собирать',
    sourceComments: 'Комментарии',
    sourceTranscript: 'Транскрипт',
    sourceBoth: 'Транскрипт + комментарии',
    labelTimestampInterval: 'Таймкод раз в N секунд (0 — без таймкодов)',
    hintTimestampInterval:
      'Транскрипт группируется в абзацы: новый абзац с таймкодом [мм:сс] начинается не чаще раза в N секунд. Таймкоды позволяют LLM ссылаться на моменты видео, но занимают место в prompt.',
    labelMaxTranscriptChars: 'Max characters транскрипта',
    hintMaxTranscriptChars:
      'Транскрипт часового ролика — это примерно 50 000 символов. Если лимит превышен, транскрипт обрезается по границе абзаца с пометкой в тексте.',
    labelPromptTemplate: 'Prompt для LLM',
    labelPromptComments: 'Prompt для LLM (комментарии)',
    labelPromptTranscript: 'Prompt для LLM (транскрипт)',
    labelPromptBoth: 'Prompt для LLM (транскрипт + комментарии)',
    hintPromptTemplate:
      'Плейсхолдеры: {{videoTitle}}, {{videoUrl}}, {{count}}. Транскрипт и/или список комментариев [1] ... [2] ... добавляются автоматически после этого текста. Показан prompt для выбранного выше режима.',
    labelLanguage: 'Язык интерфейса и prompt',
    buttonResetPrompt: 'Восстановить prompt по умолчанию',
    buttonSave: 'Сохранить',
    savedLabel: 'Сохранено ✓',
    popupTitle: 'Copy for LLM',
    buttonCopy: 'Copy',
    buttonOpenPrefix: 'Open',
    placeholderCustomUrl: 'Custom URL',
    linkMoreSettings: 'Больше настроек',
    sectionTranscript: '=== ТРАНСКРИПТ ===',
    sectionComments: (count) => `=== КОММЕНТАРИИ (${count}) ===`,
    transcriptTruncated: (chars) => `[…транскрипт обрезан по лимиту ${chars} символов…]`,
    statusCollecting: 'Собираю комментарии…',
    statusCollectingTranscript: 'Собираю транскрипт…',
    statusCollectingProgress: (raw, filtered) => `Собрано ${raw} (подходит ${filtered})…`,
    statusNoComments: 'Подходящих комментариев не найдено',
    statusNoTranscript: 'У этого видео нет доступного транскрипта',
    noticeTranscriptUnavailable: 'транскрипт недоступен',
    collectedComments: (count) => `${count} комментариев`,
    collectedTranscript: 'транскрипт',
    collectedBoth: (count) => `транскрипт и ${count} комментариев`,
    statusCopyFailed: 'Не удалось скопировать в буфер обмена',
    statusDone: (what) => `Готово: скопировано — ${what}. Выберите LLM →`,
    statusDonePopup: (what) => `Готово: скопировано — ${what}. Откройте LLM ниже.`,
    statusErrorGeneric: 'Ошибка сбора',
    statusFirstCopy: 'Сначала нажмите Copy',
    statusVideoChanged: 'Это другое видео — нажмите Copy заново',
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
    labelContentSource: 'What to collect',
    sourceComments: 'Comments',
    sourceTranscript: 'Transcript',
    sourceBoth: 'Transcript + comments',
    labelTimestampInterval: 'Timestamp every N seconds (0 — no timestamps)',
    hintTimestampInterval:
      'The transcript is grouped into paragraphs: a new [mm:ss] paragraph starts at most once every N seconds. Timestamps let the LLM point at moments in the video, but take up room in the prompt.',
    labelMaxTranscriptChars: 'Max transcript characters',
    hintMaxTranscriptChars:
      "An hour-long video's transcript runs to roughly 50,000 characters. Past the limit the transcript is cut at a paragraph boundary and marked as cut in the text.",
    labelPromptTemplate: 'Prompt for the LLM',
    labelPromptComments: 'Prompt for the LLM (comments)',
    labelPromptTranscript: 'Prompt for the LLM (transcript)',
    labelPromptBoth: 'Prompt for the LLM (transcript + comments)',
    hintPromptTemplate:
      'Placeholders: {{videoTitle}}, {{videoUrl}}, {{count}}. The transcript and/or the comment list [1] ... [2] ... are appended automatically after this text. Showing the prompt for the mode selected above.',
    labelLanguage: 'Interface & prompt language',
    buttonResetPrompt: 'Reset prompt to default',
    buttonSave: 'Save',
    savedLabel: 'Saved ✓',
    popupTitle: 'Copy for LLM',
    buttonCopy: 'Copy',
    buttonOpenPrefix: 'Open',
    placeholderCustomUrl: 'Custom URL',
    linkMoreSettings: 'More settings',
    sectionTranscript: '=== TRANSCRIPT ===',
    sectionComments: (count) => `=== COMMENTS (${count}) ===`,
    transcriptTruncated: (chars) => `[…transcript cut at the ${chars}-character limit…]`,
    statusCollecting: 'Collecting comments…',
    statusCollectingTranscript: 'Collecting the transcript…',
    statusCollectingProgress: (raw, filtered) => `Collected ${raw} (${filtered} match)…`,
    statusNoComments: 'No matching comments found',
    statusNoTranscript: 'No transcript available for this video',
    noticeTranscriptUnavailable: 'transcript unavailable',
    collectedComments: (count) => `${count} comments`,
    collectedTranscript: 'the transcript',
    collectedBoth: (count) => `the transcript and ${count} comments`,
    statusCopyFailed: 'Could not copy to clipboard',
    statusDone: (what) => `Done: copied ${what}. Choose an LLM →`,
    statusDonePopup: (what) => `Done: copied ${what}. Open an LLM below.`,
    statusErrorGeneric: 'Collection error',
    statusFirstCopy: 'Click Copy first',
    statusVideoChanged: 'This is a different video — click Copy again',
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
    labelContentSource: 'Was gesammelt wird',
    sourceComments: 'Kommentare',
    sourceTranscript: 'Transkript',
    sourceBoth: 'Transkript + Kommentare',
    labelTimestampInterval: 'Zeitmarke alle N Sekunden (0 — keine Zeitmarken)',
    hintTimestampInterval:
      'Das Transkript wird in Absätze gruppiert: ein neuer Absatz mit [mm:ss] beginnt höchstens einmal pro N Sekunden. Zeitmarken erlauben der LLM, auf Stellen im Video zu verweisen, brauchen aber Platz im Prompt.',
    labelMaxTranscriptChars: 'Max. Zeichen des Transkripts',
    hintMaxTranscriptChars:
      'Das Transkript eines einstündigen Videos umfasst etwa 50.000 Zeichen. Über dem Limit wird das Transkript an einer Absatzgrenze gekürzt und im Text als gekürzt markiert.',
    labelPromptTemplate: 'Prompt für die LLM',
    labelPromptComments: 'Prompt für die LLM (Kommentare)',
    labelPromptTranscript: 'Prompt für die LLM (Transkript)',
    labelPromptBoth: 'Prompt für die LLM (Transkript + Kommentare)',
    hintPromptTemplate:
      'Platzhalter: {{videoTitle}}, {{videoUrl}}, {{count}}. Das Transkript und/oder die Kommentarliste [1] ... [2] ... werden automatisch danach angehängt. Gezeigt wird der Prompt für den oben gewählten Modus.',
    labelLanguage: 'Sprache der Oberfläche & des Prompts',
    buttonResetPrompt: 'Prompt zurücksetzen',
    buttonSave: 'Speichern',
    savedLabel: 'Gespeichert ✓',
    popupTitle: 'Copy for LLM',
    buttonCopy: 'Copy',
    buttonOpenPrefix: 'Open',
    placeholderCustomUrl: 'Custom URL',
    linkMoreSettings: 'Weitere Einstellungen',
    sectionTranscript: '=== TRANSKRIPT ===',
    sectionComments: (count) => `=== KOMMENTARE (${count}) ===`,
    transcriptTruncated: (chars) => `[…Transkript beim Limit von ${chars} Zeichen gekürzt…]`,
    statusCollecting: 'Kommentare werden gesammelt…',
    statusCollectingTranscript: 'Transkript wird gesammelt…',
    statusCollectingProgress: (raw, filtered) => `${raw} gesammelt (${filtered} passend)…`,
    statusNoComments: 'Keine passenden Kommentare gefunden',
    statusNoTranscript: 'Für dieses Video ist kein Transkript verfügbar',
    noticeTranscriptUnavailable: 'Transkript nicht verfügbar',
    collectedComments: (count) => `${count} Kommentare`,
    collectedTranscript: 'das Transkript',
    collectedBoth: (count) => `das Transkript und ${count} Kommentare`,
    statusCopyFailed: 'Kopieren in die Zwischenablage fehlgeschlagen',
    statusDone: (what) => `Fertig: ${what} kopiert. LLM auswählen →`,
    statusDonePopup: (what) => `Fertig: ${what} kopiert. Öffne unten eine LLM.`,
    statusErrorGeneric: 'Fehler beim Sammeln',
    statusFirstCopy: 'Zuerst auf Copy klicken',
    statusVideoChanged: 'Anderes Video — erneut auf Copy klicken',
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
