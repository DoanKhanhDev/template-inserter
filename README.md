# Template Inserter

A Chrome extension that allows you to quickly insert predefined text templates into any text input or contenteditable element on the web.

## Features

- **Template Management** - Create, edit, and delete reusable text templates
- **Context Menu Integration** - Right-click on any text input to insert templates
- **Default Templates** - Load templates from a remote JSON file
- **Chrome Storage Sync** - All templates sync across Chrome devices
- **Settings UI** - Configure template JSON URL and validate templates
- **Template Refresh** - Manually refresh templates from the configured URL

## Installation

### For Users

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right toggle)
4. Click "Load unpacked" and select the project folder
5. The extension icon will appear in your Chrome toolbar

### For Developers

```bash
# Clone the repository
git clone https://github.com/doankhanh/template-note.git
cd template-inserter

# No build step required - it's a vanilla JavaScript extension
```

## Quick Start

1. **Open the popup** - Click the Template Inserter icon in your Chrome toolbar
2. **Create a template** - Enter a name and content, click "Save"
3. **Use a template** - Right-click on any text input or textarea and select from the "Insert Template" submenu
4. **View all templates** - The popup shows all your saved templates
5. **Edit/Delete** - Click any template in the list to edit or delete it

## Configuration

### Setting Up Default Templates

Templates can be loaded from a remote JSON file:

1. Click the **Settings** button in the popup
2. Enter a URL pointing to a JSON file with template definitions
3. Click **Save** to store the URL
4. Click **Refresh** to validate and load the templates

### JSON Format

Your template JSON file should be an array of template objects:

```json
[
  {
    "id": "greeting_1",
    "name": "Greeting",
    "content": "Hello, how are you?"
  },
  {
    "id": "signature_1",
    "name": "Email Signature",
    "content": "Best regards,\nDoan Khanh"
  }
]
```

**Required fields:**
- `id` - Unique identifier for the template
- `name` - Display name shown in menus
- `content` - Text to insert (supports newlines with `\n`)

### Local Development Server

To test with a local JSON file:

```bash
# Using Python 3
python3 -m http.server 5500

# Or using Node.js with http-server
npx http-server -p 5500
```

Then configure the extension to use: `http://127.0.0.1:5500/templates.json`

## Usage

### Creating Templates

1. Open the extension popup
2. Enter template details:
   - **Template ID** - Unique identifier (hidden by default)
   - **Template name** - Shown in context menu
   - **Template text** - Content to insert
3. Click **Save**

### Using Templates

1. Click in any text input, textarea, or contenteditable element
2. Right-click and hover over "Insert Template"
3. Select the template you want to insert
4. The template text will be inserted at your cursor position

### Editing Templates

1. Click on any template in the list to load it into the editor
2. Modify the name or content
3. Click **Save** to update

### Deleting Templates

1. Click on a template to load it
2. Click the **Delete** button (trash icon)
3. Confirm the deletion

## File Structure

```
template-note/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup UI
├── popup.js              # Popup logic
├── background.js         # Service worker (context menu, storage)
├── content.js            # Content script (template insertion)
├── style.css             # UI styles
├── options/
│   ├── options.html      # Settings page
│   ├── options.js        # Settings logic
│   └── options.css       # Settings styles
├── icons/
│   └── icon.png          # Extension icon
├── LICENSE
└── README.md
```

## How It Works

### Architecture

The extension uses Chrome's Manifest V3 architecture with three main components:

1. **Service Worker** (`background.js`)
   - Manages context menu creation and updates
   - Listens for context menu clicks
   - Injects content script into tabs
   - Sends template content to content scripts

2. **Content Script** (`content.js`)
   - Runs on all web pages
   - Inserts templates into text inputs and contenteditable elements
   - Handles cursor positioning and formatting

3. **Popup UI** (`popup.js`)
   - Displays saved templates
   - Allows create/edit/delete operations
   - Shows default templates from JSON
   - Communicates with service worker for menu refresh

### Data Flow

```
User creates/edits template in popup
         ↓
Template saved to chrome.storage.sync
         ↓
Service worker notified via message
         ↓
Service worker rebuilds context menu
         ↓
User right-clicks and selects template
         ↓
Content script inserts text at cursor
```

### Storage

- **Custom templates** - Stored locally in `chrome.storage.sync['templates']`
- **Default templates** - Fetched from configured JSON URL
- **Configuration** - Template JSON URL stored in `chrome.storage.sync['template_json_url']`

## Browser Compatibility

- **Chrome** - Version 88+ (Manifest V3 required)
- **Edge** - Version 88+
- **Opera** - Version 74+

## Permissions Required

- `contextMenus` - To create right-click menu
- `storage` - To save templates locally
- `activeTab` - To detect active tab for injection
- `scripting` - To inject content script into pages

## Limitations

### Insertion Works On

- `<input>` elements (text, email, url, search, etc.)
- `<textarea>` elements
- Elements with `contenteditable="true"`

### Insertion Doesn't Work On

- Input types: password, number, date, checkbox, radio (by design)
- Rich text editors (some may work, varies by implementation)
- Shadow DOM elements
- Cross-origin iframes (security restricted)

## Troubleshooting

### Templates not appearing in context menu

1. Make sure templates are saved (check popup list)
2. Right-click on a text input (not regular text)
3. Reload the extension at `chrome://extensions/`

### Default templates not loading

1. Check the URL is correct in Settings
2. Ensure the JSON file is valid:
   - Should be an array `[...]`
   - Each object needs `id`, `name`, `content`
3. Check CORS headers if on different domain
4. Look at Chrome console for error messages (more menu → Developer tools)

### Content not inserting

1. Make sure element is focused (has cursor)
2. Right-click directly in the input field
3. Check that element isn't read-only

## Development

### Adding Features

To extend the extension:

1. Modify relevant `.js` file
2. Update `manifest.json` if adding permissions
3. Test by reloading at `chrome://extensions/`
4. Check console (F12) for errors

### Code Style

- Plain JavaScript (no frameworks)
- JSDoc comments for functions
- Consistent naming conventions

### Testing

No automated tests included. Manual testing:

1. Create templates in popup
2. Test insertion in various inputs
3. Test default templates with local JSON file
4. Verify settings persistence

## Future Enhancements

Potential improvements:

- [ ] Template categories/folders
- [ ] Keyboard shortcuts
- [ ] Rich text/HTML template support
- [ ] Template sharing/export
- [ ] Usage statistics
- [ ] Dark mode
- [ ] Keyboard navigation in popup

## License

See [LICENSE](LICENSE) file for details.

## Author

**Doan Khanh** (doankhanh.dev)

## Changelog

### v1.0
- Initial release
- Template create/edit/delete
- Context menu integration
- Default templates from JSON
- Settings page with URL configuration
