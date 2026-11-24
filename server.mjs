import { GoogleGenAI } from '@google/genai';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

dotenv.config();

const execAsync = promisify(exec);
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const FISH_API_KEY = process.env.FISH_AUDIO_API_KEY;
const JARVIS_VOICE_ID = "05b36da8574341d0803391491850db20";

const FILE_CATEGORIES = {
  Images: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'],
  Documents: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.csv', '.ppt', '.pptx', '.md'],
  Installers: ['.exe', '.msi', '.iso'],
  Archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  Media: ['.mp4', '.mkv', '.avi', '.mov', '.mp3', '.wav', '.flac']
};

const PROTECTED_PROCESSES = new Set([
  'system', 'smss.exe', 'csrss.exe', 'wininit.exe', 'services.exe',
  'lsass.exe', 'svchost.exe', 'winlogon.exe', 'explorer.exe', 'dwm.exe', 'node.exe'
]);

const systemTools = {
  // 1. Folder & File CRUD
  open_folder: async ({ folderPath }) => {
    try {
      const target = folderPath || "C:\\";
      exec(`start "" "${target}"`, (err) => {
        if (err) console.error("Explorer error:", err);
      });
      return { success: true, immediate: true, message: `Opening ${target} on your desktop, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  list_directory: async ({ dirPath }) => {
    try {
      const target = dirPath || process.cwd();
      const entries = await fs.readdir(target, { withFileTypes: true });
      const listing = entries
        .slice(0, 50)
        .map((e) => `${e.isDirectory() ? '[DIR]' : '[FILE]'} ${e.name}`)
        .join(', ');
      return {
        success: true,
        immediate: false,
        directory: target,
        totalItems: entries.length,
        contents: listing || "Directory is empty."
      };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  create_folder: async ({ folderPath }) => {
    try {
      await fs.mkdir(folderPath, { recursive: true });
      return { success: true, immediate: true, message: `Created folder at ${folderPath}, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  create_file: async ({ filePath, content }) => {
    try {
      await fs.mkdir(path.dirname(path.resolve(filePath)), { recursive: true });
      await fs.writeFile(filePath, content || '', 'utf8');
      return { success: true, immediate: true, message: `Created file ${path.basename(filePath)}, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  rename_file: async ({ oldPath, newPath }) => {
    try {
      await fs.rename(oldPath, newPath);
      return { success: true, immediate: true, message: `Renamed to ${path.basename(newPath)}, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  delete_file: async ({ filePath }) => {
    try {
      await fs.unlink(filePath);
      return { success: true, immediate: true, message: `Deleted ${path.basename(filePath)}, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  move_file: async ({ srcPath, destPath }) => {
    try {
      await fs.rename(srcPath, destPath);
      return { success: true, immediate: true, message: `Moved ${path.basename(srcPath)} to ${destPath}, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  copy_file: async ({ srcPath, destPath }) => {
    try {
      await fs.copyFile(srcPath, destPath);
      return { success: true, immediate: true, message: `Copied ${path.basename(srcPath)} to ${destPath}, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },

  // 2. Real-Time System & Storage Diagnostics
  system_telemetry: async ({ scanLargeFiles = false }) => {
    try {
      const totalMemGB = (os.totalmem() / 1024 ** 3).toFixed(1);
      const freeMemGB = (os.freemem() / 1024 ** 3).toFixed(1);
      const usedMemPct = Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100);
      const uptimeHours = (os.uptime() / 3600).toFixed(1);

      let diskInfo = "Unavailable";
      try {
        const stats = await fs.statfs("C:\\");
        const totalDiskGB = ((stats.blocks * stats.bsize) / 1024 ** 3).toFixed(1);
        const freeDiskGB = ((stats.bavail * stats.bsize) / 1024 ** 3).toFixed(1);
        diskInfo = `${freeDiskGB} GB free of ${totalDiskGB} GB`;
      } catch {
        const { stdout } = await execAsync(
          'powershell -NoProfile -Command "$d = Get-PSDrive C; [math]::Round($d.Free/1GB,1)"'
        );
        diskInfo = `${stdout.trim()} GB free on C:`;
      }

      let largestFiles = [];
      if (scanLargeFiles) {
        const downloadsDir = path.join(os.homedir(), 'Downloads');
        const entries = await fs.readdir(downloadsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const fullPath = path.join(downloadsDir, entry.name);
            const stat = await fs.stat(fullPath);
            largestFiles.push({ name: entry.name, sizeMB: Math.round(stat.size / 1024 ** 2) });
          }
        }
        largestFiles.sort((a, b) => b.sizeMB - a.sizeMB);
        largestFiles = largestFiles.slice(0, 5);
      }

      return {
        success: true,
        immediate: false,
        cpuModel: os.cpus()[0]?.model || "Unknown CPU",
        memory: `${freeMemGB} GB free of ${totalMemGB} GB (${usedMemPct}% used)`,
        cDriveStorage: diskInfo,
        uptimeHours,
        largestDownloads: largestFiles
      };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },

  // 3. Smart Folder Auto-Organizer
  organize_directory: async ({ dirPath }) => {
    try {
      const targetDir = dirPath || path.join(os.homedir(), 'Downloads');
      const entries = await fs.readdir(targetDir, { withFileTypes: true });
      let movedCount = 0;

      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        const category = Object.keys(FILE_CATEGORIES).find((cat) =>
          FILE_CATEGORIES[cat].includes(ext)
        );
        if (!category) continue;

        const destFolder = path.join(targetDir, category);
        await fs.mkdir(destFolder, { recursive: true });

        const srcFile = path.join(targetDir, entry.name);
        let destFile = path.join(destFolder, entry.name);

        try {
          await fs.access(destFile);
          const parsed = path.parse(entry.name);
          destFile = path.join(destFolder, `${parsed.name}_${Date.now()}${parsed.ext}`);
        } catch {
          // Destination does not exist yet
        }

        await fs.rename(srcFile, destFile);
        movedCount++;
      }

      return {
        success: true,
        immediate: true,
        message:
          movedCount > 0
            ? `Organized ${movedCount} files into categorized folders inside ${path.basename(targetDir)}, Sir.`
            : `No loose files needed organizing in ${path.basename(targetDir)}, Sir.`
      };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },

  // 4. App, Dev Environment & URL Launcher
  launch_app: async ({ target, args = "" }) => {
    try {
      const normalized = target.trim().toLowerCase();
      let command = "";

      if (normalized === "vscode" || normalized === "code" || normalized === "visual studio code") {
        command = args ? `code "${args}"` : "code";
      } else if (normalized === "chrome" || normalized === "google chrome" || normalized === "browser") {
        command = args ? `start chrome "${args}"` : "start chrome";
      } else if (normalized === "calculator" || normalized === "calc") {
        command = "calc";
      } else if (normalized === "notepad") {
        command = args ? `notepad "${args}"` : "notepad";
      } else if (normalized === "taskmgr" || normalized === "task manager") {
        command = "taskmgr";
      } else if (normalized === "terminal" || normalized === "powershell") {
        command = "start powershell";
      } else if (/^https?:\/\//i.test(target)) {
        command = `start "" "${target}"`;
      } else {
        command = `start "" "${target}" ${args}`.trim();
      }

      exec(command, (err) => {
        if (err) console.error("Launch error:", err);
      });

      return { success: true, immediate: true, message: `Launching ${target} now, Sir.` };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },

  // 5. Windows Clipboard Inspector & Writer
  read_clipboard: async () => {
    try {
      const { stdout } = await execAsync('powershell -NoProfile -Command "Get-Clipboard"');
      const text = stdout.trim();
      return {
        success: true,
        immediate: false,
        clipboardText: text ? text.slice(0, 4000) : "Clipboard is currently empty."
      };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },
  write_clipboard: async ({ text }) => {
    try {
      await new Promise((resolve, reject) => {
        const ps = spawn('powershell', ['-NoProfile', '-Command', '$input | Set-Clipboard']);
        ps.on('error', reject);
        ps.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit code ${code}`))));
        ps.stdin.write(text);
        ps.stdin.end();
      });
      return { success: true, immediate: true, message: "Copied that to your clipboard, Sir." };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },

  // 6. Windows Hardware & Session Controls
  desktop_control: async ({ action, processName = "" }) => {
    try {
      switch (action) {
        case "lock":
          exec("rundll32.exe user32.dll,LockWorkStation");
          return { success: true, immediate: true, message: "Locking your workstation now, Sir." };
        case "mute_toggle":
          await execAsync(
            'powershell -NoProfile -Command "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"'
          );
          return { success: true, immediate: true, message: "Audio mute toggled, Sir." };
        case "volume_up":
          await execAsync(
            'powershell -NoProfile -Command "1..5 | ForEach-Object { (New-Object -ComObject WScript.Shell).SendKeys([char]175) }"'
          );
          return { success: true, immediate: true, message: "System volume increased, Sir." };
        case "volume_down":
          await execAsync(
            'powershell -NoProfile -Command "1..5 | ForEach-Object { (New-Object -ComObject WScript.Shell).SendKeys([char]174) }"'
          );
          return { success: true, immediate: true, message: "System volume lowered, Sir." };
        case "list_processes": {
          const { stdout } = await execAsync(
            'powershell -NoProfile -Command "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 8 Name, @{N=\'MB\';E={[math]::Round($_.WorkingSet64/1MB)}} | ConvertTo-Json"'
          );
          return { success: true, immediate: false, topProcesses: stdout.trim() };
        }
        case "kill_process": {
          if (!processName) {
            return { success: false, immediate: true, error: "No process name provided." };
          }
          const cleanName = processName.toLowerCase().endsWith('.exe')
            ? processName.toLowerCase()
            : `${processName.toLowerCase()}.exe`;
          if (PROTECTED_PROCESSES.has(cleanName)) {
            return {
              success: false,
              immediate: true,
              error: `Refusing to terminate critical system process ${cleanName}.`
            };
          }
          await execAsync(`taskkill /IM "${cleanName}" /F`);
          return { success: true, immediate: true, message: `Terminated ${cleanName}, Sir.` };
        }
        default:
          return { success: false, immediate: true, error: "Unsupported desktop control action." };
      }
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  },

  // 7. Isolated Live Google Search Tool (avoids mixing grounding + functionDeclarations)
  web_search: async ({ query }) => {
    try {
      const searchRes = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: query,
        config: {
          systemInstruction: "Provide a concise, factual 1-2 sentence answer in plain text.",
          tools: [{ googleSearch: {} }]
        }
      });
      return {
        success: true,
        immediate: true,
        message: searchRes.text || "No live results found, Sir."
      };
    } catch (error) {
      return { success: false, immediate: true, error: error.message };
    }
  }
};

const toolDeclarations = [
  {
    name: "open_folder",
    description: "Opens a folder or drive in Windows File Explorer on the desktop.",
    parameters: {
      type: "OBJECT",
      properties: {
        folderPath: { type: "STRING", description: "Full path of the folder, e.g., C:\\ or C:\\Users" }
      },
      required: ["folderPath"]
    }
  },
  {
    name: "list_directory",
    description: "Lists files and folders inside a directory path.",
    parameters: {
      type: "OBJECT",
      properties: {
        dirPath: { type: "STRING", description: "Directory path to inspect." }
      },
      required: []
    }
  },
  {
    name: "create_folder",
    description: "Creates a new folder at the specified path.",
    parameters: {
      type: "OBJECT",
      properties: {
        folderPath: { type: "STRING", description: "Full path of the folder to create." }
      },
      required: ["folderPath"]
    }
  },
  {
    name: "create_file",
    description: "Creates or overwrites a text file with content.",
    parameters: {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING", description: "Path and filename." },
        content: { type: "STRING", description: "Text content to write." }
      },
      required: ["filePath"]
    }
  },
  {
    name: "rename_file",
    description: "Renames a file.",
    parameters: {
      type: "OBJECT",
      properties: {
        oldPath: { type: "STRING", description: "Current path." },
        newPath: { type: "STRING", description: "New path." }
      },
      required: ["oldPath", "newPath"]
    }
  },
  {
    name: "delete_file",
    description: "Deletes a file at the specified path.",
    parameters: {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING", description: "Path of the file to delete." }
      },
      required: ["filePath"]
    }
  },
  {
    name: "move_file",
    description: "Moves a file from source to destination.",
    parameters: {
      type: "OBJECT",
      properties: {
        srcPath: { type: "STRING", description: "Source path." },
        destPath: { type: "STRING", description: "Destination path." }
      },
      required: ["srcPath", "destPath"]
    }
  },
  {
    name: "copy_file",
    description: "Copies a file from source to destination.",
    parameters: {
      type: "OBJECT",
      properties: {
        srcPath: { type: "STRING", description: "Source path." },
        destPath: { type: "STRING", description: "Destination path." }
      },
      required: ["srcPath", "destPath"]
    }
  },
  {
    name: "system_telemetry",
    description: "Checks live CPU, RAM, uptime, C: drive storage space, and optionally scans largest files in Downloads.",
    parameters: {
      type: "OBJECT",
      properties: {
        scanLargeFiles: {
          type: "BOOLEAN",
          description: "Set true if the user asks what is taking up storage space or wants largest files in Downloads."
        }
      },
      required: []
    }
  },
  {
    name: "organize_directory",
    description: "Automatically sorts loose files in a folder (defaults to Downloads) into Images, Documents, Installers, Archives, and Media subfolders.",
    parameters: {
      type: "OBJECT",
      properties: {
        dirPath: { type: "STRING", description: "Folder path to organize. Leave empty to organize Downloads." }
      },
      required: []
    }
  },
  {
    name: "launch_app",
    description: "Launches desktop applications (vscode, chrome, notepad, calculator, taskmgr, terminal) or opens URLs.",
    parameters: {
      type: "OBJECT",
      properties: {
        target: { type: "STRING", description: "App name or full https URL." },
        args: { type: "STRING", description: "Optional project folder path for VS Code or URL for Chrome." }
      },
      required: ["target"]
    }
  },
  {
    name: "read_clipboard",
    description: "Reads current text or code copied to the Windows clipboard.",
    parameters: {
      type: "OBJECT",
      properties: {},
      required: []
    }
  },
  {
    name: "write_clipboard",
    description: "Copies text or generated code into the Windows clipboard.",
    parameters: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING", description: "Text to place on the clipboard." }
      },
      required: ["text"]
    }
  },
  {
    name: "desktop_control",
    description: "Controls Windows hardware/session: lock screen, mute_toggle, volume_up, volume_down, list_processes, or kill_process.",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          enum: ["lock", "mute_toggle", "volume_up", "volume_down", "list_processes", "kill_process"],
          description: "The system action to perform."
        },
        processName: {
          type: "STRING",
          description: "Executable name (e.g., notepad.exe) when action is kill_process."
        }
      },
      required: ["action"]
    }
  },
  {
    name: "web_search",
    description: "Searches the live web for real-time facts, news, weather, or latest software releases.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "The search query." }
      },
      required: ["query"]
    }
  }
];

const jarvisSystemInstruction = [
  "You are J.A.R.V.I.S., an autonomous neural assistant modeled after Tony Stark's AI.",
  "MANDATORY RULE: Every single response you generate MUST address the user as 'Sir' at least once.",
  "Maintain a composed, sophisticated, and subtly witty British butler demeanor.",
  "Keep spoken responses concise (1 to 3 sentences) so voice synthesis remains rapid.",
  "Output plain text only without markdown formatting such as asterisks, bolding, or bullet points, as your text is spoken aloud by a voice synthesizer."
].join(" ");

async function generateWithFallback(contents) {
  const candidates = [
    { model: 'gemini-3.5-flash-lite', thinkingConfig: { thinkingLevel: 'minimal' } },
    { model: 'gemini-3.8-flash', thinkingConfig: { thinkingLevel: 'low' } }
  ];

  let lastError;

  for (const candidate of candidates) {
    try {
      const result = await ai.models.generateContent({
        model: candidate.model,
        contents,
        config: {
          systemInstruction: jarvisSystemInstruction,
          thinkingConfig: candidate.thinkingConfig,
          tools: [{ functionDeclarations: toolDeclarations }]
        }
      });
      console.log(`[Jarvis Core]: Active model -> ${candidate.model}`);
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`[Jarvis Notice]: ${candidate.model} failed -> ${error.message}`);
      if (candidate !== candidates[candidates.length - 1]) {
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

async function generateJarvisAudio(text) {
  if (!FISH_API_KEY) {
    console.warn("[Fish Audio]: Missing FISH_AUDIO_API_KEY in .env");
    return null;
  }

  try {
    const response = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FISH_API_KEY}`,
        "Content-Type": "application/json",
        "model": "s2.1-pro-free"
      },
      body: JSON.stringify({
        text: text,
        reference_id: JARVIS_VOICE_ID,
        format: "mp3",
        mp3_bitrate: 128,
        latency: "low"
      })
    });

    if (!response.ok) {
      const errDetail = await response.text();
      console.error(`[Fish Audio Error ${response.status}]:`, errDetail);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
  } catch (error) {
    console.error("[Fish Audio Network Error]:", error);
    return null;
  }
}

app.post('/api/jarvis', async (req, res) => {
  const { prompt } = req.body;
  console.log(`\n[User Prompt]: ${prompt}`);

  try {
    console.time("1-Gemini-LLM");
    let conversation = [{ role: 'user', parts: [{ text: prompt }] }];
    let response = await generateWithFallback(conversation);
    let replyText = "";

    for (let step = 0; step < 3; step++) {
      if (!response.functionCalls || response.functionCalls.length === 0) {
        replyText = response.text || "Systems nominal, Sir.";
        break;
      }

      const call = response.functionCalls[0];
      console.log(`[Jarvis Action]: Executing -> ${call.name}`, call.args);

      const handler = systemTools[call.name];
      if (!handler) {
        replyText = "Unknown tool requested, Sir.";
        break;
      }

      const result = await handler(call.args || {});

      if (result.immediate) {
        replyText = result.success
          ? result.message
          : `I encountered an error, Sir: ${result.error}`;
        break;
      }

      if (response.candidates?.[0]?.content) {
        conversation.push(response.candidates[0].content);
      }
      conversation.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: call.name,
              response: result
            }
          }
        ]
      });

      response = await generateWithFallback(conversation);
      if (!response.functionCalls || response.functionCalls.length === 0) {
        replyText = response.text || "Diagnostics complete, Sir.";
        break;
      }
    }
    console.timeEnd("1-Gemini-LLM");

    if (!/\bsir\b/i.test(replyText)) {
      replyText = `Certainly, Sir. ${replyText}`;
    }

    console.log(`[Jarvis Reply]: ${replyText}`);

    console.time("2-FishAudio-TTS");
    const audioBase64 = await generateJarvisAudio(replyText);
    console.timeEnd("2-FishAudio-TTS");

    res.json({
      reply: replyText,
      audio: audioBase64
    });
  } catch (error) {
    console.error("Agent error:", error);

    const fallbackReply =
      "My apologies, Sir. External neural servers are experiencing heavy traffic at the moment. Please try your request again shortly.";
    const audioBase64 = await generateJarvisAudio(fallbackReply);

    res.json({
      reply: fallbackReply,
      audio: audioBase64
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`==========================================`);
  console.log(`  J.A.R.V.I.S. Web HUD Server Online      `);
  console.log(`  Open http://localhost:${PORT} in browser`);
  console.log(`==========================================`);
});