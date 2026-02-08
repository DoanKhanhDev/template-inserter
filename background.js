// Storage and context menu constants
const STORAGE_KEY = "templates";
const MENU_ROOT_ID = "templates_root";
const MENU_ITEM_PREFIX = "tpl_";
const EDITABLE_CONTEXT = "editable";
const CONTENT_SCRIPT = "content.js";
const ACTION_INSERT = "insertTemplate";
const ACTION_RELOAD = "reloadMenus";

let cachedTemplates = [];
let defaultTemplateIds = [];

/**
 * Loads default templates from HTTP server.
 * @returns {Promise<Array>} Array of default template objects
 */
async function loadDefaultTemplates() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['template_json_url'], async (result) => {
      const url = result.template_json_url || '';
      if (!url) {
        resolve([]);
        return;
      }

      try {
        const response = await fetch(url);
        const templates = await response.json();
        resolve(templates);
      } catch (error) {
        console.error('Failed to load default templates:', error);
        resolve([]);
      }
    });
  });
}

/**
 * Merges default templates with custom templates (with deduplication).
 * @param {Array} customTemplates - Custom templates from storage
 * @param {Array} defaultTemplates - Default templates from JSON
 * @returns {Array} Merged templates with defaults first, deduplicated
 */
function mergeTemplates(customTemplates, defaultTemplates) {
  // Deduplicate default templates first (in case there are duplicates in JSON)
  const defaultMap = new Map();
  defaultTemplates.forEach(t => {
    if (t.id && !defaultMap.has(t.id)) {
      defaultMap.set(t.id, t);
    }
  });

  const merged = Array.from(defaultMap.values());
  const seenIds = new Set(defaultMap.keys());

  // Add custom templates that are not in defaults
  customTemplates.forEach(template => {
    if (template.id && !seenIds.has(template.id)) {
      merged.push(template);
      seenIds.add(template.id);
    }
  });

  return merged;
}

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

    const label = defaultTemplateIds.includes(template.id)
      ? `${template.name} (default)`
      : template.name;

    chrome.contextMenus.create({
      id: `${MENU_ITEM_PREFIX}${index}`,
      parentId: MENU_ROOT_ID,
      title: label,
      contexts: [EDITABLE_CONTEXT]
    });
  });
}

/**
 * Retrieves templates from storage and rebuilds the context menu.
 */
async function loadTemplates() {
  chrome.storage.sync.get([STORAGE_KEY], async (result) => {
    const customTemplates = result[STORAGE_KEY] || [];
    const defaultTemplates = await loadDefaultTemplates();

    // Dynamically extract default template IDs from loaded templates
    defaultTemplateIds = defaultTemplates.map(t => t.id);
    const allTemplates = mergeTemplates(customTemplates, defaultTemplates);

    cachedTemplates = allTemplates;
    buildMenu(allTemplates);
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
 * Retrieves a template by index from merged templates.
 * @param {number} index - The template index
 * @returns {Promise<Object|null>} The template object or null if not found
 */
function getTemplateByIndex(index) {
  return new Promise((resolve) => {
    if (cachedTemplates && cachedTemplates[index]) {
      resolve(cachedTemplates[index]);
      return;
    }

    chrome.storage.sync.get([STORAGE_KEY], async (result) => {
      const customTemplates = result[STORAGE_KEY] || [];
      const defaultTemplates = await loadDefaultTemplates();
      const allTemplates = mergeTemplates(customTemplates, defaultTemplates);

      cachedTemplates = allTemplates;
      const template = allTemplates[index];

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
