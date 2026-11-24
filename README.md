
# J.A.R.V.I.S. // Neural Core HUD (MK-VII)

A local-first AI desktop assistant and voice-activated command HUD built with Node.js, Google Gemini function calling, and Fish Audio voice synthesis. Engineered for real-time Windows OS automation, file-system management, system diagnostics, and live web search.

---

## Core Capabilities

* **Interactive 3D Neural HUD & Voice Interface:** Holographic web interface (`http://localhost:3000`) featuring browser-based speech recognition (Chrome/Edge), real-time telemetry transcripts, and a direct command execution bar (`EXEC`).
* **Full File & Directory Management:** Opens drives and folders directly in Windows File Explorer (`open_folder`), inspects directory contents (`list_directory`), creates folders and text files (`create_folder`, `create_file`), and renames, moves, copies, or deletes files (`rename_file`, `move_file`, `copy_file`, `delete_file`).
* **Smart Folder Auto-Organizer:** Automatically sorts loose files in `Downloads` or any specified directory into categorized `Images`, `Documents`, `Installers`, `Archives`, and `Media` subfolders (`organize_directory`).
* **Real-Time System & Storage Telemetry:** Reports live CPU specs, RAM utilization, system uptime, and `C:` drive free storage, with optional scanning for large space-hogging files in `Downloads` (`system_telemetry`).
* **App, Dev Environment & URL Launcher:** Launches VS Code, Google Chrome, PowerShell, Task Manager, Calculator, Notepad, or external URLs on command (`launch_app`).
* **Windows Clipboard Chaining:** Reads text or terminal stack traces from the Windows clipboard (`read_clipboard`), writes generated snippets back to the clipboard (`write_clipboard`), and chains multi-step actions (such as summarizing clipboard errors into a local file).
* **Hardware & Process Controls:** Locks the workstation, toggles mute, adjusts system volume, inspects top RAM-consuming processes, and safely terminates non-critical frozen applications (`desktop_control`).
* **Live Web Search Grounding:** Executes isolated Google Search queries for up-to-date technical documentation, software releases, and real-time facts (`web_search`).

---

## Tech Stack

* **Backend Runtime:** Node.js (`server.mjs`), Express, `child_process`, `fs/promises`, `os`
* **AI Reasoning & Tool Calling:** `@google/genai` (`gemini-3.5-flash-lite` primary with `gemini-3.8-flash` fallback)
* **Voice Synthesis (TTS):** Fish Audio API (`s2.1-pro-free` low-latency MP3 synthesis)
* **Frontend HUD:** HTML5, CSS3, JavaScript (ES Modules), Web Speech API (`SpeechRecognition`)

---

## Project Structure

```text
Jarvis/
├── public/
│   ├── index.html       # Holographic HUD layout and telemetry stream UI
│   ├── main.js          # Web Speech API capture, API requests, and audio playback
│   └── style.css        # Stark OS dark theme and HUD styling
├── src/                 # Frontend source assets
├── server.mjs           # Express server, Gemini tool declarations, and Windows OS tools
├── index.mjs            # Entry/module utilities
├── jarvis.mjs           # Core assistant module
├── package.json         # Project dependencies and scripts
├── .env                 # Local API credentials (excluded from Git)
└── .gitignore           # Excludes node_modules/ and .env from version control
```

---

## Local Setup & Installation

> **Note:** Because J.A.R.V.I.S. executes native Windows PowerShell and file-system operations (`open_folder`, `launch_app`, `desktop_control`), the Node.js backend must run locally on your Windows machine rather than on static web hosting.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/CrenzArevalo/Jarvis.git](https://github.com/CrenzArevalo/Jarvis.git)
   cd Jarvis
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key
   FISH_AUDIO_API_KEY=your_fish_audio_api_key
   ```

4. **Start the J.A.R.V.I.S. server:**
   ```bash
   node server.mjs
   ```

5. **Open the Web HUD:**
   Navigate to `http://localhost:3000` in **Google Chrome** or **Microsoft Edge** and allow microphone permissions for voice commands.

---

## Example Directives

* **Explorer & File Operations:** *"Jarvis, open my C drive"* or *"Create a file named notes.txt with deployment checklist inside."*
* **Folder Cleanup:** *"Jarvis, organize my Downloads folder."*
* **System Diagnostics:** *"Run system diagnostics and check what large files are in my Downloads."*
* **App Launching:** *"Open VS Code"* or *"Open Google Chrome."*
* **Clipboard Chaining:** *"Read my clipboard and save a summary to bug-notes.txt."*
* **System Controls:** *"What apps are using the most RAM?"*, *"Mute my volume"*, or *"Lock my computer."*
