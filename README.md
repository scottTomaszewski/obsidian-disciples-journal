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
- **Click** on the reference: Opens or creates a note for that chapter

### Full Passage Rendering

For longer passages, use a code block with the "bible" language specifier:

````
```bible
Genesis 1:1-10
```
````

This will render the entire passage directly in your note, displaying all verses in the range.

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
4. Enable the plugin in Obsidian's community plugins settings

## Troubleshooting

### Bible Data Not Loading

This plugin requires the `ESV.json` file to be properly loaded. If you see an error about Bible data not loading, try these steps:

1. Go to Settings → Disciples Journal → Diagnostics
2. Click the "Reload Bible Data" button
3. If that doesn't work, verify that the `ESV.json` file exists in the plugin's `src` directory
4. Restart Obsidian and try again

### Verse References Not Working

If your verse references aren't being processed correctly:

1. Make sure the plugin is enabled
2. Check that you're using the correct format (e.g., `Genesis 1:1` inside backticks)
3. For code blocks, ensure you're using the "bible" language specification
4. Try reloading the plugin through Settings → Disciples Journal → Diagnostics

## Scripture Copyright

Scripture quotations marked "ESV" are from the ESV® Bible (The Holy Bible, English Standard Version®), copyright © 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.

## Feedback and Contributions

If you encounter any issues or have suggestions for improvements, please open an issue on [GitHub](https://github.com/scottTomaszewski/obsidian-disciples-journal).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
