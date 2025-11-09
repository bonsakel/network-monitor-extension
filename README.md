# Network Monitor Browser Extension

Project Overview
----------------

Network Monitor is a lightweight Chrome extension that captures outgoing HTTP/HTTPS requests in real time and stores them locally using the browser's storage. It shows recent requests (domain, latency, status) in a popup UI and works fully offline.

Features
--------

- Records outgoing HTTP/HTTPS requests
- Measures latency (ms) per request
- Stores logs locally with a max history of 100 entries
- Popup shows the 10 most recent requests
- Clear logs button to reset stored data
 - Advanced: filtering by domain, export logs as JSON, and retention setting

How It Works
------------

The extension registers a service worker (`background.js`) that listens to webRequest events. It records start times on `onBeforeRequest` and computes latency when requests complete or fail. Logs are saved to `chrome.storage.local` and the popup reads those logs via messaging.

How to Install
--------------

1. Open Chrome and go to chrome://extensions
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select the `network-monitor-extension` folder (this project's root)
5. The Network Monitor icon will appear in the toolbar. Click it to open the popup.

Future Improvements
-------------------

- Add filtering and search in the popup
- Add request details (full URL, headers, timing breakdown)
- Export logs as JSON/CSV
- Add options page for retention settings and toggles

Advanced features added in this version
-------------------------------------

- Filter input in the popup to quickly search domains.
- Export JSON button to download stored logs.
- Insert Sample Data button to populate sample logs for testing the UI.
- Retention input to control how many logs to keep (default 100).

Usage notes
-----------

- Use the Filter box in the popup to narrow results by domain.
- Click Export JSON to download the current stored logs as a JSON file.
- Use Insert Sample Data to add sample entries for quick UI testing.
- Change the Retention number to keep more or fewer logs; storage will be trimmed automatically.

Notes
-----

- No external services are used; all data remains local.
- Manifest v3 service worker is used to comply with modern Chrome extension standards.
