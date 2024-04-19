// import { Notice } from 'obsidian'
import { existsSync } from 'fs';
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
  return true
}