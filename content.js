/**
 * Inserts text into a textarea or input element at the current cursor position.
 * @param {HTMLElement} element - The textarea or input element
 * @param {string} text - The text to insert
 */
function insertIntoTextInput(element, text) {
  const { selectionStart: start, selectionEnd: end } = element;

  element.value =
    element.value.substring(0, start) +
    text +
    element.value.substring(end);

  const newCursorPosition = start + text.length;
  element.selectionStart = element.selectionEnd = newCursorPosition;

  dispatchInputEvent(element);
}

/**
 * Inserts text into a contenteditable element with proper line break handling.
 * @param {string} text - The text to insert
 */
function insertIntoContentEditable(text) {
  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const fragment = createDocumentFragment(text);
  range.insertNode(fragment);

  // Move cursor to end of inserted content
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Creates a document fragment with text and line breaks.
 * @param {string} text - The text content with newline separators
 * @returns {DocumentFragment} A fragment containing the formatted text
 */
function createDocumentFragment(text) {
  const fragment = document.createDocumentFragment();
  const lines = text.split("\n");

  lines.forEach((line, index) => {
    fragment.appendChild(document.createTextNode(line));

    if (index < lines.length - 1) {
      fragment.appendChild(document.createElement("br"));
    }
  });

  return fragment;
}

/**
 * Dispatches an input event on an element to trigger change listeners.
 * @param {HTMLElement} element - The element to dispatch the event on
 */
function dispatchInputEvent(element) {
  element.dispatchEvent(new Event("input", { bubbles: true }));
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
 * Checks if an element is a textarea or input field.
 * @param {HTMLElement} element - The element to check
 * @returns {boolean} True if the element is a text input
 */
function isTextInput(element) {
  return element.tagName === "TEXTAREA" || element.tagName === "INPUT";
}

// Listen for template insertion messages from the popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "insertTemplate") {
    insertTemplate(msg.text);
  }
});
