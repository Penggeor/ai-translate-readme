import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ChatDeepSeek } from "@langchain/deepseek";

export function activate(context: vscode.ExtensionContext) {
  console.log('AI Translate README extension is now active');

  const disposable = vscode.commands.registerCommand('ai-translate-readme.translate', async () => {
    try {
      // Get configuration
      const config = vscode.workspace.getConfiguration('aiTranslateReadme');
      const apiKey = config.get<string>('deepseekApiKey');
      const targetLanguage = config.get<string>('targetLanguage') || 'zh-CN';

      if (!apiKey) {
        throw new Error('Please configure your Deepseek API key in settings.');
      }

      // Get workspace folder
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found.');
      }

      // Read README.md
      const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
      if (!fs.existsSync(readmePath)) {
        throw new Error('README.md not found in workspace root.');
      }

      const readmeContent = fs.readFileSync(readmePath, 'utf-8');

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Translating README...',
        cancellable: false
      }, async (progress) => {
        // Initialize DeepSeek model
        const model = new ChatDeepSeek({
          apiKey: apiKey,
          model: "deepseek-chat",
        });

        // Prepare the translation prompt
        const prompt = `Please translate the following markdown content to ${targetLanguage}. 
        Preserve all markdown formatting and keep any code blocks, links, and special characters intact.
        Only translate the text content:

        ${readmeContent}`;

        // Call Deepseek API for translation
        const response = await model.invoke([
          {
            role: "user",
            content: prompt,
          },
        ]);

        // Write translated content
        const translatedContent = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

        const targetPath = path.join(workspaceFolder.uri.fsPath, `README_${targetLanguage}.md`);
        fs.writeFileSync(targetPath, translatedContent);

        vscode.window.showInformationMessage(`README has been translated to ${targetLanguage}!`);
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      vscode.window.showErrorMessage(`Translation failed: ${errorMessage}`);
    }
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
