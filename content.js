/**
 * Insert plaintext into a textarea/input at the cursor.
 * The caret is moved after the inserted text.
 * @param {HTMLInputElement|HTMLTextAreaElement} el
 * @param {string} text
 */
function insertIntoTextInput(el, text) {
  const { selectionStart: start = 0, selectionEnd: end = 0 } = el;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  const pos = start + text.length;
  el.selectionStart = el.selectionEnd = pos;
  dispatchInputEvent(el);
}

/**
 * Insert text into a contenteditable at the current selection.
 * Newlines are converted to paragraphs with trailing <br> tags.
 * @param {string} text
 */
function insertIntoContentEditable(text) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);
  range.deleteContents();

  // build HTML and inject via a temporary container
  const temp = document.createElement('div');
  temp.innerHTML = htmlFromText(text);

  // insert each node of temp at the range position
  let node;
  while ((node = temp.firstChild)) {
    range.insertNode(node);
    range.setStartAfter(node);
  }

  // collapse selection to end of inserted content
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

/**
 * Generate HTML string representing `text` with paragraphs per line.
 * Does not use document.createDocumentFragment().
 * @param {string} text
 * @returns {string}
 */
function htmlFromText(text) {
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p><br>`)
    .join('');
}

/**
 * Escape HTML entities in a string to prevent injection.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Fire an input event so any listener/framework notices the value change.
 * @param {HTMLElement} el
 */
function dispatchInputEvent(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Handles template insertion into the active element.
 * @param {string} text - The template text to insert
 */
function insertTemplate(text) {
  const element = document.activeElement;
  if (!element) return;

  if (isTextInput(element)) {
    insertIntoTextInput(element, text);
  } else if (element.isContentEditable) {
    insertIntoContentEditable(text);
  }
}

/**
 * Determine whether an element is a plain text input or textarea.
 * @param {HTMLElement} el
 * @returns {boolean}
 */
const isTextInput = (el) => /^(TEXTAREA|INPUT)$/i.test(el.tagName);

// singleton message listener across injections/frames
if (!window.__template_insert_listener_installed) {
  window.__template_insert_listener_installed = true;
  window.__last_template_insert = { text: null, time: 0 };

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.action !== "insertTemplate") return;
    try {
      const now = Date.now();
      const text = msg.text || "";
      if (
        window.__last_template_insert.text === text &&
        now - window.__last_template_insert.time < 500
      ) {
        console.debug("Duplicate insertTemplate message ignored");
        return;
      }
      window.__last_template_insert = { text, time: now };
      insertTemplate(text);
    } catch (e) {
      console.error("Error handling insertTemplate message", e);
    }
  });
}
