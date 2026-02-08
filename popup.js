// DOM elements and constants
const STORAGE_KEY = "templates";
const ALERT_DURATION = 3000;
const ACTION_RELOAD = "reloadMenus";

const elements = {
  list: document.getElementById("list"),
  idInput: document.getElementById("id"),
  nameInput: document.getElementById("name"),
  contentInput: document.getElementById("content"),
  saveBtn: document.getElementById("save"),
  newBtn: document.getElementById("new"),
  optionsBtn: document.getElementById("options"),
  alertBox: document.querySelector(".alert")
};

let editingIndex = null;
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
        resolve([]); // don't fetch when URL is empty
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
 * Retrieves templates from storage.
 * @returns {Promise<Array>} Array of template objects
 */
function getTemplates() {
  return new Promise((resolve) => {
    chrome.storage.sync.get([STORAGE_KEY], (result) => {
      resolve(result[STORAGE_KEY] || []);
    });
  });
}

/**
 * Saves templates to storage and reloads the context menu.
 * @param {Array} templates - Array of template objects to save
 * @returns {Promise<void>}
 */
function saveTemplates(templates) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: templates }, () => {
      chrome.runtime.sendMessage({ action: ACTION_RELOAD });
      resolve();
    });
  });
}

/**
 * Gets the current form values.
 * @returns {Object} Object with id, name, and content properties
 */
function getFormValues() {
  return {
    id: elements.idInput.value,
    name: elements.nameInput.value,
    content: elements.contentInput.value
  };
}

/**
 * Clears all form inputs.
 */
function clearForm() {
  elements.idInput.value = "";
  elements.nameInput.value = "";
  elements.contentInput.value = "";
  editingIndex = null;
}

/**
 * Loads a template into the form for editing.
 * @param {Object} template - The template object to load
 * @param {number} index - The index of the template in the list
 */
function loadTemplateForEditing(template, index) {
  elements.idInput.value = template.id;
  elements.nameInput.value = template.name;
  elements.contentInput.value = template.content;
  editingIndex = index;
}

/**
 * Creates an edit button for a template.
 * @param {Object} template - The template object
 * @returns {HTMLElement} The edit button element
 */
function createEditButton(template) {
  const btn = document.createElement("button");
  btn.className = "edit-btn";
  btn.textContent = "Edit";

  if (defaultTemplateIds.includes(template.id)) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    btn.title = "Default templates cannot be edited";
  } else {
    btn.onclick = () => {
      const index = Array.from(elements.list.children).findIndex(
        li => li.querySelector(".template-name").textContent.trim() === template.name
      );
      loadTemplateForEditing(template, index);
    };
  }
  return btn;
}

/**
 * Creates a remove button for a template.
 * @param {Object} template - The template object
 * @returns {HTMLElement} The remove button element
 */
function createRemoveButton(template) {
  const btn = document.createElement("button");
  btn.className = "remove-btn";
  btn.textContent = "Remove";

  if (defaultTemplateIds.includes(template.id)) {
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.style.cursor = "not-allowed";
    btn.title = "Default templates cannot be removed";
  } else {
    btn.onclick = async () => {
      const templates = await getTemplates();
      const index = templates.findIndex(t => t.id === template.id);
      if (index !== -1) {
        templates.splice(index, 1);
        await saveTemplates(templates);
        refresh();
      }
    };
  }
  return btn;
}

/**
 * Creates a template list item element.
 * @param {Object} template - The template object
 * @returns {HTMLElement} The list item element
 */
function createTemplateItem(template) {
  const li = document.createElement("li");
  li.className = "template-item";

  if (defaultTemplateIds.includes(template.id)) {
    li.style.opacity = "0.7";
  }

  const nameSpan = document.createElement("span");
  nameSpan.className = "template-name";
  const defaultLabel = defaultTemplateIds.includes(template.id) ? " (default)" : "";
  nameSpan.textContent = `${template.name}${defaultLabel} `;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "template-actions";
  actionsDiv.appendChild(createEditButton(template));
  actionsDiv.appendChild(createRemoveButton(template));

  li.appendChild(nameSpan);
  li.appendChild(actionsDiv);

  return li;
}

/**
 * Merges default templates with user templates.
 * @param {Array} userTemplates - User-created templates
 * @param {Array} defaultTemplates - Default templates
 * @returns {Array} Merged templates with defaults first
 */
function mergeTemplates(userTemplates, defaultTemplates) {
  const merged = [...defaultTemplates];
  const defaultIds = new Set(defaultTemplates.map(t => t.id));
  userTemplates.forEach(template => {
    if (!defaultIds.has(template.id)) {
      merged.push(template);
    }
  });
  return merged;
}

/**
 * Refreshes the template list display.
 */
async function refresh() {
  const userTemplates = await getTemplates();
  const defaultTemplates = await loadDefaultTemplates();

  // Dynamically extract default template IDs from loaded templates
  defaultTemplateIds = defaultTemplates.map(t => t.id);

  const allTemplates = mergeTemplates(userTemplates, defaultTemplates);
  console.log("Loaded templates:", allTemplates);

  elements.list.innerHTML = "";
  allTemplates.forEach(template => {
    elements.list.appendChild(createTemplateItem(template));
  });
}

/**
 * Validates form inputs.
 * @returns {boolean} True if valid, false otherwise
 */
function validateForm() {
  const { name, content } = getFormValues();
  if (!name || !content) {
    showAlert("Name and content are required!", true);
    return false;
  }
  return true;
}

/**
 * Saves the current template from the form.
 */
async function handleSave() {
  if (!validateForm()) {
    return;
  }

  const { id, name, content } = getFormValues();
  const templates = await getTemplates();

  if (id) {
    // Update existing template
    const index = templates.findIndex(tpl => tpl.id === id);
    if (index !== -1) {
      templates[index] = { name, content, id };
    }
  } else {
    // Create new template
    templates.push({ id: Date.now().toString(), name, content });
  }

  await saveTemplates(templates);
  clearForm();
  showAlert("Template saved successfully!");
  refresh();
}

/**
 * Shows an alert message.
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showAlert(message, isError = false) {
  elements.alertBox.textContent = message;
  elements.alertBox.classList.add("show");

  if (isError) {
    elements.alertBox.classList.add("error");
  } else {
    elements.alertBox.classList.remove("error");
  }

  setTimeout(() => {
    elements.alertBox.textContent = "";
    elements.alertBox.classList.remove("show", "error");
  }, ALERT_DURATION);
}

// Event listeners
elements.newBtn.onclick = clearForm;
elements.saveBtn.onclick = handleSave;
elements.optionsBtn.onclick = () => { chrome.runtime.openOptionsPage(); };

// Initialize the UI
refresh();
