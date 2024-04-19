import { Notice, TFile } from 'obsidian'
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { ErrorModal } from './modals'
import ContentPublisher from '../main'

interface Messages {
    invalidProjectContentAbFolder: string;
}

export const MESSAGES: Messages = {
  invalidProjectContentAbFolder: "The project content folder does not exist.\nPlease create the path or update the current path in plugin settings."
}

export function checkSettingOfAbPath(plugin: ContentPublisher, abPath: string, errorText: string): boolean {
  if (!abPath.length && !existsSync(abPath)) {
    new ErrorModal(plugin.app, errorText).open();
    return false;
  }
  return true;
}

export function resolvePublishPath(plugin: ContentPublisher, file: TFile): string {
  const { projectContentAbFolder, vaultBlogFolder } = plugin.settings;
  return resolve(projectContentAbFolder, relative(vaultBlogFolder, file.path));
}

export function writeContentToAbPath(abFilePath: string, content: string, successNoticeText: string): void {
  try {
    const dirPath = dirname(abFilePath);
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    writeFileSync(abFilePath, content, { encoding: "utf8" });
    new Notice(successNoticeText)
  } catch (err) {
    new Notice(err.message);
  }
}