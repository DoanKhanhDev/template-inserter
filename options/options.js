// options/options.js - save/load template JSON URL
const urlInput = document.getElementById('template-json-url');
const saveBtn = document.getElementById('save');
const statusEl = document.getElementById('status');

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.style.color = isError ? '#b91c1c' : '#065f46';
  setTimeout(() => { statusEl.textContent = ''; }, 3000);
}

// Load saved URL on open
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['template_json_url'], (result) => {
    const url = result.template_json_url || '';
    urlInput.value = url;
  });
});

saveBtn.addEventListener('click', () => {
  const url = urlInput.value && urlInput.value.trim();
  chrome.storage.sync.set({ template_json_url: url || '' }, () => {
    if (chrome.runtime.lastError) {
      showStatus('Save failed', true);
      console.error(chrome.runtime.lastError);
      return;
    }
    showStatus('Saved');
    // notify background/popup to reload templates if needed
    chrome.runtime.sendMessage({ action: 'reloadMenus' });
  });
});
