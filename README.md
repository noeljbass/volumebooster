# Volume Booster Chrome Extension

A lightweight Manifest V3 Chrome extension that boosts audio and video volume on the active tab up to 600%.

## Features

- Slider control from 0% to 600%.
- One-click presets for 100%, 200%, 400%, and 600%.
- Per-tab boost settings stored for the browser session.
- Automatically applies the selected boost to media elements added after page load.

## Load locally

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this repository folder.
5. Open a page with audio or video and use the extension popup to set the boost level.

## Notes

The extension uses the Web Audio API to route page media through a gain node. Some protected, cross-origin, or browser-restricted media may not allow audio processing.
