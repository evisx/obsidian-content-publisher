import { Notice, TFile } from 'obsidian';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { ErrorModal } from './modals';
import ContentPublisher from '../main';
import pinyin from 'pinyin';

export function checkSettingOfAbPath(
    plugin: ContentPublisher,
    abPath: string,
    errorText: string,
): boolean {
    if (!abPath.length && !existsSync(abPath)) {
        new ErrorModal(plugin.app, errorText).open();
        return false;
    }
    return true;
}

export function resolvePublishPath(
    plugin: ContentPublisher,
    file: TFile,
): string {
    const { publishToAbFolder, noteFolder } = plugin.settings;
    return resolve(publishToAbFolder, relative(noteFolder, file.path));
}

export function writeContentToAbPath(
    abFilePath: string,
    content: string,
    successCallback: () => void,
): void {
    try {
        const dirPath = dirname(abFilePath);
        if (!existsSync(dirPath)) {
            mkdirSync(dirPath, { recursive: true });
        }
        writeFileSync(abFilePath, content, { encoding: 'utf8' });
        if (successCallback) {
            successCallback();
        }
    } catch (err) {
        new Notice(err.message, 2000);
    }
}

export function arraymove<T>(
    arr: T[],
    fromIndex: number,
    toIndex: number,
): void {
    if (toIndex < 0 || toIndex === arr.length) {
        return;
    }
    const element = arr[fromIndex];
    arr[fromIndex] = arr[toIndex];
    arr[toIndex] = element;
}

export function removeEmoji(str: string): string {
    return str.replace(
        /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g,
        '',
    );
}

export function containsChinese(text: string): boolean {
    return /[\u3400-\u4DBF\u4E00-\u9FFF\u20000-\u2A6DF]/.test(text);
}

export function pinyinfy(str: string, sp: string = '-'): string {
    return pinyin(str, { style: 'normal' })
        .map((arr: string[]) => arr[0])
        .join(sp);
}

export function simplify(str: string): string {
    return (
        str
            .replace(/[\s\/\\]+/g, '-')
            // only allow url supported symbol
            .replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@%]+/g, '')
            // handle duplicated symbol
            .replace(/[\s\-._~!$&'()*+,;=:@]+/g, '-')
            .toLowerCase()
    );
}
