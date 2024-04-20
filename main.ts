// import { Editor, MarkdownView, TFile, Notice, Plugin } from 'obsidian';
import { TFile, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from 'src/settings';
import { ContentHandler } from 'src/handlers';
import {
    checkSettingOfAbPath,
    resolvePublishPath,
    writeContentToAbPath,
} from 'src/utils';

export default class ContentPublisher extends Plugin {
    settings: Settings;
    contentHandler: ContentHandler;

    async onload() {
        await this.loadSettings();

        this._addCommandValidateAbPath();
        this._addCommandPublishCurrentNote();

        this.addSettingTab(new SettingTab(this.app, this));
        this.contentHandler = new ContentHandler(this);
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData(),
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async publishSingleNote(
        file: TFile,
        callback: () => void | null,
    ): Promise<void> {
        if (!callback) {
            callback = () => {
                new Notice(
                    `publish ${file.basename} to ${this.settings.publishToAbFolder}`,
                );
            };
        }
        // TODO: if respect update-ts
        // TODO: update frontmatter to note
        // content-publish-url: https://evisx.me/posts/homebre-opnjdk
        // content-publish-ts:
        // content-update-ts:
        // content-auto-slug:
        const yaml = this.contentHandler.getPublishedYAML(file);
        const content = await this.contentHandler.getPublishedText(file);

        writeContentToAbPath(
            resolvePublishPath(this, file),
            yaml + '\n' + content,
            callback,
        );
    }

    _checkProjectContentAbPathSetting(validNoticed = false): boolean {
        if (
            checkSettingOfAbPath(
                this,
                this.settings.publishToAbFolder,
                'The project content folder does not exist.\nPlease create the path or update the current path in plugin settings.',
            )
        ) {
            if (validNoticed) {
                new Notice(`Valid path: ${this.settings.publishToAbFolder}`);
            }
        } else {
            new Notice(`Invalid path: ${this.settings.publishToAbFolder}`);
            return false;
        }
        return true;
    }

    _checkNoteInBlogPathSetting(file: TFile): boolean {
        if (
            new RegExp('^' + this.settings.noteFolder + '.*\\.md$').test(
                file.path,
            )
        ) {
            return true;
        }
        new Notice(
            `Not in Blog Folder: ${this.settings.noteFolder} Or Not a Markdown File`,
        );
        return false;
    }

    _addCommandValidateAbPath(): void {
        this.addCommand({
            id: 'validate-ab-path',
            name: 'Validate absolute project content path',
            callback: () => this._checkProjectContentAbPathSetting(true),
        });
    }

    _addCommandPublishCurrentNote(): void {
        this.addCommand({
            id: 'Publish-current-note',
            name: 'Publish current note to blog',
            callback: () => {
                if (!this._checkProjectContentAbPathSetting()) {
                    return;
                }
                const file = this.app.workspace.getActiveFile();
                if (!file || !this._checkNoteInBlogPathSetting(file)) {
                    return;
                }
                this.publishSingleNote(file, () => {
                    new Notice(
                        `Your note has been published! At ${this.settings.publishToAbFolder}`,
                    );
                });
            },
        });
    }
}
