import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const fileTools = {
  rename_file: async ({ oldPath, newPath }) => {
    try {
      await fs.rename(oldPath, newPath);
      return { success: true, message: `Successfully renamed ${oldPath} to ${newPath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  delete_file: async ({ filePath }) => {
    try {
      await fs.unlink(filePath);
      return { success: true, message: `Successfully deleted ${filePath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  copy_file: async ({ srcPath, destPath }) => {
    try {
      await fs.copyFile(srcPath, destPath);
      return { success: true, message: `Successfully copied ${srcPath} to ${destPath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  move_file: async ({ srcPath, destPath }) => {
    try {
      await fs.rename(srcPath, destPath); // rename acts as move across paths on the same drive
      return { success: true, message: `Successfully moved ${srcPath} to ${destPath}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

const toolDeclarations = [
  {
    name: "rename_file",
    description: "Renames or moves a file from an old path to a new path on the local file system.",
    parameters: {
      type: "OBJECT",
      properties: {
        oldPath: { type: "STRING", description: "The current full path or relative path of the file." },
        newPath: { type: "STRING", description: "The new full path or new name for the file." }
      },
      required: ["oldPath", "newPath"]
    }
  },
  {
    name: "delete_file",
    description: "Permanently deletes a file at the specified path.",
    parameters: {
      type: "OBJECT",
      properties: {
        filePath: { type: "STRING", description: "The path of the file to delete." }
      },
      required: ["filePath"]
    }
  },
  {
    name: "copy_file",
    description: "Copies a file from a source path to a destination path.",
    parameters: {
      type: "OBJECT",
      properties: {
        srcPath: { type: "STRING", description: "The source file path." },
        destPath: { type: "STRING", description: "The destination file path." }
      },
      required: ["srcPath", "destPath"]
    }
  }
];

async function runJarvis(userPrompt) {
  try {
    console.log(`\n[User]: ${userPrompt}`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        tools: [{ functionDeclarations: toolDeclarations }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      console.log(`[Jarvis Action]: Requesting tool -> ${call.name}`, call.args);

      const handler = fileTools[call.name];
      if (handler) {
        const result = await handler(call.args);
        console.log(`[Tool Result]:`, result);
        
        if (result.success) {
          console.log(`[Jarvis]: Action completed successfully, sir.`);
        } else {
          console.log(`[Jarvis]: I encountered an error executing that command, sir: ${result.error}`);
        }
      } else {
        console.log(`[Jarvis]: Error - Unknown tool requested.`);
      }
    } else {
      console.log(`\n[Jarvis]:`, response.text);
    }

  } catch (error) {
    console.error("Execution error:", error.message);
  }
}

runJarvis("Can you rename test.txt to updated-test.txt?");