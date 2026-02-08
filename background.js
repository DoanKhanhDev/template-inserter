// Storage and context menu constants
const STORAGE_KEY = "templates";
const MENU_ROOT_ID = "templates_root";
const MENU_ITEM_PREFIX = "tpl_";
const EDITABLE_CONTEXT = "editable";
const CONTENT_SCRIPT = "content.js";
const ACTION_INSERT = "insertTemplate";
const ACTION_RELOAD = "reloadMenus";

/**
 * Builds the context menu with template entries.
 * @param {Array} templates - Array of template objects with name and content
 */
function buildMenu(templates) {
  chrome.contextMenus.removeAll();

  // Create root menu item
  chrome.contextMenus.create({
    id: MENU_ROOT_ID,
    title: "Insert Template",
    contexts: [EDITABLE_CONTEXT]
  });

  // Create menu items for each valid template
  templates.forEach((template, index) => {
    if (!template.name || !template.content) {
      console.warn(`Invalid template at index ${index}: missing name or content`);
      return;
    }

    chrome.contextMenus.create({
      id: `${MENU_ITEM_PREFIX}${index}`,
      parentId: MENU_ROOT_ID,
      title: template.name,
      contexts: [EDITABLE_CONTEXT]
    });
  });
}

/**
 * Retrieves templates from storage and rebuilds the context menu.
 */
function loadTemplates() {
  chrome.storage.sync.get([STORAGE_KEY], (result) => {
    const templates = result[STORAGE_KEY] || [];
    buildMenu(templates);
  });
}

/**
 * Injects the content script into a tab.
 * @param {number} tabId - The tab ID to inject the script into
 * @returns {Promise<void>}
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT]
    });
  } catch (error) {
    console.warn(`Failed to inject content script into tab ${tabId}:`, error);
  }
}

/**
 * Retrieves a template by index from storage.
 * @param {number} index - The template index
 * @returns {Promise<Object|null>} The template object or null if not found
 */
function getTemplateByIndex(index) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      const templates = result[STORAGE_KEY] || [];
      const template = templates[index];

      if (!template) {
        console.error(`Template at index ${index} not found`);
        resolve(null);
        return;
      }

      resolve(template);
    });
  });
}

/**
 * Sends the template content to the active tab for insertion.
 * @param {number} tabId - The tab ID to send the message to
 * @param {string} content - The template content to insert
 */
function sendTemplateToTab(tabId, content) {
  chrome.tabs.sendMessage(tabId, {
    action: ACTION_INSERT,
    text: content
  });
}

/**
 * Handles context menu clicks and inserts the selected template.
 * @param {Object} menuInfo - The context menu click information
 * @param {Object} tab - The tab where the click occurred
 */
async function handleContextMenuClick(menuInfo, tab) {
  if (!menuInfo.menuItemId.startsWith(MENU_ITEM_PREFIX)) {
    return;
  }

  const index = parseInt(menuInfo.menuItemId.split("_")[1]);
  const template = await getTemplateByIndex(index);

  if (!template) {
    return;
  }

  await injectContentScript(tab.id);
  sendTemplateToTab(tab.id, template.content);
}

// Initialize menu on extension startup
chrome.runtime.onInstalled.addListener(loadTemplates);
chrome.runtime.onStartup.addListener(loadTemplates);

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Listen for reload messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === ACTION_RELOAD) {
    loadTemplates();
  }
});
