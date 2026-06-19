/**
 * AI Study Assistant — script.js
 * ─────────────────────────────────────────────────────────
 * Stack : Vanilla ES6 + jQuery 3
 * AI    : Google Gemini 1.5 Flash API
 * Store : localStorage (history + theme preference)
 * ─────────────────────────────────────────────────────────
 *
 * HOW TO USE YOUR OWN API KEY
 *  1. Go to https://aistudio.google.com/app/apikey
 *  2. Create a free API key.
 *  3. Replace the placeholder string below with your key.
 *
 * ⚠️  Never commit a real API key to a public repository.
 */

'use strict';

/* ============================================================
   CONFIGURATION
   ============================================================ */

const CONFIG = {
  // ← Your Gemini API key (loaded dynamically from localStorage)
  get GEMINI_API_KEY() {
    return localStorage.getItem('studyai_api_key') || '';
  },

  // Gemini REST endpoint (no SDK needed — plain fetch)
  GEMINI_ENDPOINT : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',

  // Local Storage keys
  LS_HISTORY : 'studyai_history',
  LS_THEME   : 'studyai_theme',

  // Maximum history items to keep
  MAX_HISTORY : 20,
};


/* ============================================================
   STATE
   ============================================================ */

let appState = {
  currentTopic  : '',   // last searched topic
  isLoading     : false,  // prevent duplicate requests
};


/* ============================================================
   DOM READY — jQuery entry point
   ============================================================ */

$(document).ready(function () {

  // ── Init ───────────────────────────────────────────────
  initTheme();
  renderHistory();

  // ── Event Bindings ─────────────────────────────────────

  /** Generate button click */
  $('#generateBtn').on('click', handleGenerate);

  /** Allow Enter key inside input */
  $('#topicInput').on('keydown', function (e) {
    if (e.key === 'Enter') handleGenerate();
  });

  /** Theme toggle */
  $('#themeToggle').on('click', toggleTheme);

  /** Clear history */
  $('#clearHistoryBtn').on('click', clearHistory);

  /** Animate input focus */
  $('#topicInput').on('focus', function () {
    $(this).closest('.input-card').addClass('focused');
  }).on('blur', function () {
    $(this).closest('.input-card').removeClass('focused');
  });

  /** API Key Modal event hooks */
  $('#apiKeyModal').on('show.bs.modal', function () {
    $('#apiKeyInput').val(CONFIG.GEMINI_API_KEY);
    $('#apiKeyModalAlert').addClass('d-none').text('');
  });

  /** Save API Key button click */
  $('#saveApiKeyBtn').on('click', function () {
    const key = $('#apiKeyInput').val().trim();
    if (!key) {
      $('#apiKeyModalAlert').removeClass('d-none').text('Please enter a valid API key.');
      return;
    }
    localStorage.setItem('studyai_api_key', key);
    
    const modalEl = document.getElementById('apiKeyModal');
    const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.hide();

    // Re-trigger generate if there is input
    const topic = $('#topicInput').val().trim();
    if (topic && !appState.isLoading) {
      handleGenerate();
    }
  });

});


/* ============================================================
   THEME — Dark / Light Mode
   ============================================================ */

/**
 * initTheme — reads saved preference from localStorage and applies it.
 */
function initTheme () {
  const saved = localStorage.getItem(CONFIG.LS_THEME) || 'light';
  applyTheme(saved);
}

/**
 * toggleTheme — flips between light and dark, saves preference.
 */
function toggleTheme () {
  const current = $('html').attr('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem(CONFIG.LS_THEME, next);
}

/**
 * applyTheme — sets data-theme attribute and updates the icon.
 * @param {string} theme  'light' | 'dark'
 */
function applyTheme (theme) {
  $('html').attr('data-theme', theme);

  if (theme === 'dark') {
    $('#themeIcon').removeClass('bi-sun-fill').addClass('bi-moon-stars-fill');
  } else {
    $('#themeIcon').removeClass('bi-moon-stars-fill').addClass('bi-sun-fill');
  }
}


/* ============================================================
   FORM HANDLING & GENERATE FLOW
   ============================================================ */

/**
 * handleGenerate — validates input, fires API call, renders results.
 */
async function handleGenerate () {
  const topic = $('#topicInput').val().trim();

  // Validate empty input
  if (!topic) {
    showAlert('Please enter a topic before generating.', 'warning');
    $('#topicInput').trigger('focus');
    return;
  }

  // Check if API key is configured
  if (!CONFIG.GEMINI_API_KEY) {
    showApiKeyModal(true);
    return;
  }

  // Prevent double-submit while loading
  if (appState.isLoading) return;

  clearAlert();
  appState.currentTopic = topic;

  setLoadingState(true);
  hideResults();

  try {
    const content = await fetchStudyContent(topic);
    renderResults(topic, content);
    addToHistory(topic);
  } catch (err) {
    console.error('Gemini API error:', err);
    showAlert(`API error: ${err.message || 'Something went wrong. Check your API key and network.'}`, 'danger');
  } finally {
    setLoadingState(false);
  }
}


/* ============================================================
   GEMINI API INTEGRATION
   ============================================================ */

/**
 * fetchStudyContent — sends a structured prompt to Gemini and returns
 *                     an object with five study content sections.
 *
 * @param  {string} topic
 * @returns {Promise<Object>}  { detailedNotes, shortSummary, quizQuestions, keyPoints, studyTips }
 */
async function fetchStudyContent (topic) {

  // ── Build the prompt ──────────────────────────────────
  // IMPORTANT: Keep values SHORT to avoid hitting token limits.
  // detailedNotes max ~400 words, answers max 1 sentence each.
  const prompt = `You are an expert educational assistant. A student wants to study: "${topic}".

Respond with ONLY a single valid JSON object — no markdown fences, no extra text before or after.
Keep ALL string values concise to avoid truncation:
- detailedNotes: 3-4 short paragraphs using \\n between them, ## for headings. MAX 300 words.
- shortSummary: 2-3 sentences. MAX 60 words.
- quizQuestions: exactly 5 items, answers max 1-2 sentences each.
- keyPoints: exactly 6 items, each max 12 words.
- studyTips: exactly 4 items, each max 15 words.

{"detailedNotes":"...","shortSummary":"...","quizQuestions":[{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."},{"question":"...","answer":"..."}],"keyPoints":["...","...","...","...","...","..."],"studyTips":["...","...","...","..."]}`;

  // ── HTTP request ──────────────────────────────────────
  const url      = `${CONFIG.GEMINI_ENDPOINT}?key=${CONFIG.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method  : 'POST',
    headers : { 'Content-Type': 'application/json' },
    body    : JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature    : 0.7,
        maxOutputTokens: 8192,   // FIX: raised from 2048 — prevents mid-JSON truncation
        responseMimeType: 'application/json',  // ask Gemini to return JSON directly
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const msg = errData?.error?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();

  // ── Extract text from Gemini response ─────────────────
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini.');

  // ── Parse JSON robustly ───────────────────────────────
  const parsed = safeParseJSON(rawText);
  return parsed;
}

/**
 * safeParseJSON — strips markdown fences, then attempts to parse.
 * If the response was truncated, attempts to repair the JSON before
 * throwing a user-friendly error.
 * @param  {string} raw  Raw text from Gemini
 * @returns {Object}
 */
function safeParseJSON (raw) {
  // 1. Strip ```json … ``` or ``` … ``` fences
  let text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  // 2. Try direct parse first
  try {
    return JSON.parse(text);
  } catch (firstErr) {
    // 3. Attempt to repair a truncated JSON string
    //    Strategy: find the last complete top-level key we can salvage,
    //    close any open arrays/objects, then re-parse.
    try {
      const repaired = repairTruncatedJSON(text);
      console.warn('JSON was truncated — repaired successfully.');
      return JSON.parse(repaired);
    } catch (repairErr) {
      // 4. Last resort: extract whatever fields exist with regex
      console.warn('JSON repair failed, using regex extraction.');
      return extractFieldsWithRegex(text);
    }
  }
}

/**
 * repairTruncatedJSON — closes any open strings, arrays, and objects
 *                       so JSON.parse can succeed on a truncated response.
 * @param  {string} text
 * @returns {string}
 */
function repairTruncatedJSON (text) {
  // Track nesting with a simple stack
  const stack  = [];
  let inString = false;
  let escaped  = false;
  let repaired = text;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }

    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }

  // If we ended mid-string, close the string first
  if (inString) repaired += '"';

  // Trim trailing comma before we close
  repaired = repaired.replace(/,\s*$/, '');

  // Close all open structures in reverse order
  while (stack.length) repaired += stack.pop();

  return repaired;
}

/**
 * extractFieldsWithRegex — last-resort extraction when even repair fails.
 *                           Returns a valid object with whatever could be found.
 * @param  {string} text
 * @returns {Object}
 */
function extractFieldsWithRegex (text) {
  const get = (key) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'));
    return m ? m[1].replace(/\\n/g, '\n') : '';
  };

  const getArray = (key) => {
    const m = text.match(new RegExp(`"${key}"\\s*:\\s*(\\[.*?\\])`, 's'));
    if (!m) return [];
    try { return JSON.parse(m[1]); } catch { return []; }
  };

  return {
    detailedNotes  : get('detailedNotes')  || 'Content was too long to display fully. Please try again.',
    shortSummary   : get('shortSummary')   || 'Summary unavailable.',
    quizQuestions  : getArray('quizQuestions'),
    keyPoints      : getArray('keyPoints'),
    studyTips      : getArray('studyTips'),
  };
}


/* ============================================================
   RENDER RESULTS
   ============================================================ */

/**
 * renderResults — populates all result cards with AI content.
 * @param {string} topic
 * @param {Object} content
 */
function renderResults (topic, content) {

  // Update results header
  $('#resultTopicName').text(topic);

  // Detailed Notes — convert ## headings + newlines to HTML
  $('#detailedNotes').html(formatNotes(content.detailedNotes || ''));

  // Short Summary
  $('#shortSummary').html(`<p>${escapeHtml(content.shortSummary || '')}</p>`);

  // Key Points — bulleted list
  const kpHtml = (content.keyPoints || [])
    .map(pt => `<li>${escapeHtml(pt)}</li>`)
    .join('');
  $('#keyPoints').html(`<ul>${kpHtml}</ul>`);

  // Quiz Questions — collapsible answer reveal
  const quizHtml = (content.quizQuestions || [])
    .map((q, i) => `
      <div class="quiz-item">
        <div class="quiz-q"><span style="color:var(--quiz-accent);font-weight:700;">Q${i + 1}.</span> ${escapeHtml(q.question)}</div>
        <button class="quiz-answer-toggle" data-index="${i}" onclick="toggleAnswer(this)">
          <i class="bi bi-eye me-1"></i>Show Answer
        </button>
        <div class="quiz-a" id="quizAnswer_${i}" style="display:none;">${escapeHtml(q.answer)}</div>
      </div>
    `)
    .join('');
  $('#quizQuestions').html(quizHtml);

  // Study Tips
  const tipsHtml = (content.studyTips || [])
    .map(tip => `
      <div style="display:flex;gap:10px;margin-bottom:12px;align-items:flex-start;">
        <span style="color:var(--tips-accent);font-size:16px;flex-shrink:0;margin-top:2px;">
          <i class="bi bi-check2-circle"></i>
        </span>
        <span>${escapeHtml(tip)}</span>
      </div>
    `)
    .join('');
  $('#studyTips').html(tipsHtml);

  // Show results section with jQuery fade
  $('#placeholderSection').fadeOut(200, function () {
    $('#resultsSection').removeClass('d-none').hide().fadeIn(350);
  });

  // Smooth scroll to results
  $('html, body').animate({
    scrollTop: $('#resultsSection').offset().top - 90
  }, 500);
}

/**
 * toggleAnswer — reveal/hide a quiz answer inline.
 * Called via onclick attribute on the button.
 * @param {HTMLElement} btn
 */
function toggleAnswer (btn) {
  const $btn    = $(btn);
  const index   = $btn.data('index');
  const $answer = $(`#quizAnswer_${index}`);

  if ($answer.is(':visible')) {
    $answer.slideUp(200);
    $btn.html('<i class="bi bi-eye me-1"></i>Show Answer');
  } else {
    $answer.slideDown(200);
    $btn.html('<i class="bi bi-eye-slash me-1"></i>Hide Answer');
  }
}

/**
 * formatNotes — convert raw text with ## headings to HTML paragraphs/headings.
 * @param  {string} text
 * @returns {string} HTML string
 */
function formatNotes (text) {
  return text
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '';
      if (line.startsWith('## ')) return `<h3>${escapeHtml(line.slice(3))}</h3>`;
      if (line.startsWith('# '))  return `<h2>${escapeHtml(line.slice(2))}</h2>`;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return `<li>${escapeHtml(line.slice(2))}</li>`;
      }
      return `<p>${escapeHtml(line)}</p>`;
    })
    .join('');
}

/**
 * escapeHtml — prevent XSS when inserting API text into DOM.
 * @param  {string} str
 * @returns {string}
 */
function escapeHtml (str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

/**
 * hideResults — hide results, show placeholder.
 */
function hideResults () {
  $('#resultsSection').addClass('d-none');
  $('#placeholderSection').show();
}


/* ============================================================
   LOADING STATE
   ============================================================ */

/**
 * setLoadingState — toggle spinner / button text, disable input.
 * @param {boolean} isLoading
 */
function setLoadingState (isLoading) {
  appState.isLoading = isLoading;

  if (isLoading) {
    $('#btnText').addClass('d-none');
    $('#btnSpinner').removeClass('d-none');
    $('#generateBtn').prop('disabled', true);
    $('#topicInput').prop('disabled', true);
  } else {
    $('#btnText').removeClass('d-none');
    $('#btnSpinner').addClass('d-none');
    $('#generateBtn').prop('disabled', false);
    $('#topicInput').prop('disabled', false);
  }
}


/* ============================================================
   ALERT MESSAGES
   ============================================================ */

/**
 * showAlert — render a dismissible Bootstrap alert.
 * @param {string} message  HTML or text content
 * @param {string} type     'danger' | 'warning' | 'success'
 */
function showAlert (message, type = 'danger') {
  const html = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <i class="bi ${type === 'danger' ? 'bi-exclamation-circle' : type === 'warning' ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  $('#alertContainer').html(html);

  // Auto-dismiss after 7 seconds
  setTimeout(() => {
    $('#alertContainer .alert').alert('close');
  }, 7000);
}

/**
 * clearAlert — remove any visible alert.
 */
function clearAlert () {
  $('#alertContainer').empty();
}


/* ============================================================
   SEARCH HISTORY (Local Storage)
   ============================================================ */

/**
 * getHistory — read history array from localStorage.
 * @returns {string[]}
 */
function getHistory () {
  try {
    return JSON.parse(localStorage.getItem(CONFIG.LS_HISTORY)) || [];
  } catch {
    return [];
  }
}

/**
 * saveHistory — persist history array to localStorage.
 * @param {string[]} history
 */
function saveHistory (history) {
  localStorage.setItem(CONFIG.LS_HISTORY, JSON.stringify(history));
}

/**
 * addToHistory — prepend topic to history (deduplication + max cap).
 * @param {string} topic
 */
function addToHistory (topic) {
  let history = getHistory();

  // Remove duplicate if it exists (case-insensitive)
  history = history.filter(t => t.toLowerCase() !== topic.toLowerCase());

  // Prepend
  history.unshift(topic);

  // Cap at MAX_HISTORY
  if (history.length > CONFIG.MAX_HISTORY) {
    history = history.slice(0, CONFIG.MAX_HISTORY);
  }

  saveHistory(history);
  renderHistory();
}

/**
 * clearHistory — wipe localStorage history and re-render sidebar.
 */
function clearHistory () {
  if (!getHistory().length) return;

  // Brief pulse animation on the sidebar before clearing
  $('.sidebar-card').addClass('clearing');
  setTimeout(() => {
    localStorage.removeItem(CONFIG.LS_HISTORY);
    renderHistory();
    $('.sidebar-card').removeClass('clearing');
  }, 250);
}

/**
 * renderHistory — build history list items from localStorage.
 */
function renderHistory () {
  const history   = getHistory();
  const $list     = $('#historyList');
  const $empty    = $('#historyEmpty');

  $list.find('.history-item').remove(); // Clear existing items

  if (!history.length) {
    $empty.show();
    return;
  }

  $empty.hide();

  $.each(history, function (i, topic) {
    const isActive = topic.toLowerCase() === appState.currentTopic.toLowerCase();
    const $item    = $(`
      <div class="history-item ${isActive ? 'active' : ''}" title="${escapeHtml(topic)}">
        <i class="bi bi-clock"></i>
        <span>${escapeHtml(topic)}</span>
      </div>
    `);

    // Clicking a history item reloads that topic
    $item.on('click', function () {
      $('#topicInput').val(topic);
      handleGenerate();
    });

    $list.append($item);
  });
}

/**
 * refreshHistoryActiveState — update which history item is highlighted
 *                             without full re-render.
 */
function refreshHistoryActiveState () {
  $('#historyList .history-item').each(function () {
    const topic = $(this).find('span').text();
    if (topic.toLowerCase() === appState.currentTopic.toLowerCase()) {
      $(this).addClass('active');
    } else {
      $(this).removeClass('active');
    }
  });
}

/**
 * showApiKeyModal — open the API key configuration modal programmatically.
 * @param {boolean} showWarning  If true, displays a message to prompt key entry.
 */
function showApiKeyModal (showWarning = false) {
  if (showWarning) {
    $('#apiKeyModalAlert').removeClass('d-none').text('Please enter your Gemini API key to proceed.');
  } else {
    $('#apiKeyModalAlert').addClass('d-none').text('');
  }
  const modalEl = document.getElementById('apiKeyModal');
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
}
