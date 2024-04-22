// import { Editor, MarkdownView, TFile, Notice, Plugin } from 'obsidian';
import { TFile, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from 'src/settings';
import {
    MetaVariables,
    MetadataTemplateProcessorManager,
    MetadataTemplateProcessor,
} from 'src/template';
import { NoteHandler, ContentHandler } from 'src/handlers';
import {
    checkSettingOfAbPath,
    resolvePublishPath,
    writeContentToAbPath,
    pinyinfy,
} from 'src/utils';

export default class ContentPublisher extends Plugin {
    public pinyin: any;
    settings: Settings;
    noteHandler: NoteHandler;
    contentHandler: ContentHandler;
    tplProccessorManager: MetadataTemplateProcessorManager;

    async onload() {
        await this.loadSettings();
        this.pinyin = pinyinfy;

        this._addCommandValidateAbPath();
        this._addCommandPublishCurrentNote();

        this.addSettingTab(new SettingTab(this));
        this.noteHandler = new NoteHandler(this);
        this.contentHandler = new ContentHandler(this);
        this.tplProccessorManager = new MetadataTemplateProcessorManager(this);
    }

    onunload() {
        this.clearTemplateProcessor();
    }

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

    getTemplateProcessor(variables: MetaVariables): MetadataTemplateProcessor {
        return this.tplProccessorManager.getProcessor(variables);
    }

    clearTemplateProcessor() {
        this.tplProccessorManager.clear();
    }

    async publishSingleNote(file: TFile, callback?: () => void): Promise<void> {
        if (callback === undefined) {
            callback = () => {
                new Notice(
                    `publish ${file.basename} to ${this.settings.publishToAbFolder}`,
                );
            };
        }
        // TODO: if respect update-ts
        const frontmatter = await this.noteHandler.updateFrontmatter(file);
        const yaml = this.contentHandler.getPublishedYAML({
            file: file,
            frontmatter: frontmatter,
        });
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

    _checkNoteInSourcePathSetting(file: TFile): boolean {
        if (
            new RegExp('^' + this.settings.noteFolder + '.*\\.md$').test(
                file.path,
            )
        ) {
            return true;
        }
        new Notice(
            `Not in Source Folder: ${this.settings.noteFolder} Or Not a Markdown File`,
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
            name: 'Publish current note',
            callback: () => {
                if (!this._checkProjectContentAbPathSetting()) {
                    return;
                }
                const file = this.app.workspace.getActiveFile();
                if (!file || !this._checkNoteInSourcePathSetting(file)) {
                    return;
                }
                this.publishSingleNote(file, () => {
                    new Notice(
                        `Your note has been published! At ${this.settings.publishToAbFolder}`,
                    );
                });
                this.clearTemplateProcessor();
            },
        });
    }
}
