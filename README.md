# Disciples Journal - Bible Verse Reference Plugin for Obsidian

This plugin enhances your Bible study and journaling in Obsidian by rendering Bible verse references and passages directly in your notes.

## Features

### Inline Verse References

Type a Bible reference in an inline code block like this:

```
`Genesis 1:1`
```

The plugin will transform it into a clickable link. When you:

- **Hover** over the reference: Shows a preview of the verse text
- **Click** on the reference: Opens or creates a note for that chapter in your vault

### Full Passage Rendering

For longer passages, use a code block with the "bible" language specifier:

````
```bible
Genesis 1:1-10
```
````

This will render the entire passage directly in your note, displaying all verses in the range.

### Enhanced ESV HTML Format Support

The plugin now supports ESV's HTML formatted passages, providing richer rendering with:

- Proper typesetting for poetic passages
- Section headings
- Footnotes and cross-references
- Proper formatting for special text

### Download on Demand

With an ESV API token, the plugin can automatically download Bible passages that aren't already in your local library:

- Enter your ESV API token in the plugin settings
- Enable the "Download on Demand" option
- When you reference a passage that isn't already available, it will be downloaded automatically
- Downloaded passages are saved locally for future use
- Chapter notes are created in your vault automatically for easy navigation

### Organized Content Structure

Downloaded Bible content is saved in an organized folder structure:

```
Bible/ESV/
  ├── Genesis/
  │   ├── Genesis 1.md
  │   ├── Genesis 2.md
  │   └── ...
  ├── Exodus/
  │   ├── Exodus 1.md
  │   └── ...
  └── ...
```

You can customize this path in the settings to fit your vault organization.

## Supported Reference Formats

The plugin supports various Bible reference formats:

- Single verses: `Genesis 1:1`, `John 3:16`
- Verse ranges in the same chapter: `Genesis 1:1-10`, `John 3:16-18`
- Entire chapters: `Genesis 1`, `Psalm 23`
- Multi-chapter passages: `Matthew 5:3-7:29`
- Books with spaces: `1 Corinthians 13:4-7`, `Song of Solomon 2:1`

## Settings

Access plugin settings in Settings → Disciples Journal:

- **Display Settings**:
  - **Display Inline Verses**: Toggle inline verse reference rendering
  - **Display Full Passages**: Toggle full passage code block rendering
  - **Verse Font Size**: Customize the font size for displayed verses
  
- **Bible Version Settings**:
  - Currently only supports the English Standard Version (ESV)

- **Bible Content Vault Path**:
  - Specify the vault directory where chapter files will be saved
  - Default is `Bible/ESV`
  - Each book will get its own subdirectory (e.g., `Bible/ESV/Genesis/`)

- **ESV API Settings**:
  - **ESV API Token**: Enter your token from api.esv.org
  - **Download on Demand**: Enable automatic downloading of requested passages

- **Diagnostics**:
  - Check Bible data loading status
  - Reload Bible data if needed

## Installation

1. In Obsidian, go to Settings → Community plugins → Browse
2. Search for "Disciples Journal"
3. Click Install, then Enable

## Manual Installation

1. Download the latest release from the releases page
2. Extract the zip file to your Obsidian plugins folder: `.obsidian/plugins/`
3. Make sure the `ESV.json` file is in the `src` directory within the plugin folder
4. For enhanced rendering, place ESV API HTML-formatted JSON files in the `src/data/esv` directory
5. Enable the plugin in Obsidian's community plugins settings

## Using ESV API HTML Format

There are two ways to use the enhanced HTML format:

### Manual Method
1. Obtain passage data from the [ESV API](https://api.esv.org/) (requires an API key)
2. Request passages using the HTML format endpoint
3. Save the response JSON files in the `src/data/esv` directory
4. Name files according to their reference (e.g., `Genesis 1.json`, `John 3.json`)

### Automatic Method
1. Get an ESV API token from [api.esv.org](https://api.esv.org/)
2. Enter the token in the plugin settings
3. Enable "Download on Demand"
4. The plugin will automatically download and save passages when needed

The plugin will automatically detect and use these files when available, providing rich HTML rendering of the passages.

## Getting an ESV API Token

To use the download-on-demand feature, you'll need an ESV API token:

1. Go to [api.esv.org](https://api.esv.org/) and create an account
2. Log in and create a new API key
3. Copy the token and paste it into the plugin settings
4. Your token will look something like: `5bea343abb51ab0434a6e929081ab1c4964feef7`

## Chapter Notes in Vault

When you click on a Bible reference or download a chapter, the plugin creates a well-formatted note in your vault:

- Notes are stored in the path specified in settings (default: `Bible/ESV/[Book]/[Chapter].md`)
- Each book has its own folder for organization
- Notes include a `bible` code block that renders the passage
- Notes are automatically opened when you click on a reference

## Troubleshooting

### Bible Data Not Loading

This plugin requires either the `ESV.json` file, HTML-formatted chapter files, or an ESV API token to be properly configured. If you see an error about Bible data not loading, try these steps:

1. Go to Settings → Disciples Journal → Diagnostics
2. Click the "Reload Bible Data" button
3. If that doesn't work, verify that either:
   - The `ESV.json` file exists in the plugin's `src` directory, or
   - HTML-formatted chapter files exist in the plugin's `src/data/esv` directory, or
   - You have entered a valid ESV API token and enabled "Download on Demand"
4. Restart Obsidian and try again

### Verse References Not Working

If your verse references aren't being processed correctly:

1. Make sure the plugin is enabled
2. Check that you're using the correct format (e.g., `Genesis 1:1` inside backticks)
3. For code blocks, ensure you're using the "bible" language specification
4. Try reloading the plugin through Settings → Disciples Journal → Diagnostics

### Chapter Notes Not Being Created

If chapter notes aren't being created or opened when you click on references:

1. Check that the vault path specified in settings exists or can be created
2. Make sure you have permission to write to that directory
3. Try manually creating the directory structure if needed
4. Ensure "Download on Demand" is enabled if you're using the ESV API

## Scripture Copyright

Scripture quotations marked "ESV" are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.

## Feedback and Contributions

If you encounter any issues or have suggestions for improvements, please open an issue on [GitHub](https://github.com/scottTomaszewski/obsidian-disciples-journal).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
