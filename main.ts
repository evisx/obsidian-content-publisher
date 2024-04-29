// import { Editor, MarkdownView, TFile, Notice, Plugin } from 'obsidian';
import { TAbstractFile, TFolder, TFile, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from 'src/settings';
import {
    MetaVariables,
    MetadataTemplateProcessorManager,
    MetadataTemplateProcessor,
} from 'src/template';
import { NOTE_META, NoteHandler, ContentHandler } from 'src/handlers';
import {
    checkSettingOfAbPath,
    resolvePublishPath,
    writeContentToAbPath,
    containsChinese,
    pinyinfy,
} from 'src/utils';

export default class ContentPublisher extends Plugin {
    tplProccessorManager: MetadataTemplateProcessorManager;
    waitProcessingTask: number;
    result: { successed: number; failed: number };
    settings: Settings;
    noteHandler: NoteHandler;
    contentHandler: ContentHandler;
    translate: (zh: string) => string;

    async onload() {
        await this.loadSettings();

        this._addCommandValidateAbPath();
        this._addCommandPublishCurrentNote();
        this._addCommandPublishAllNotes();
        this._addCommandPublishAllNotesForce();

        this.addSettingTab(new SettingTab(this));
        this.noteHandler = new NoteHandler(this);
        this.contentHandler = new ContentHandler(this);
        this.tplProccessorManager = new MetadataTemplateProcessorManager(this);

        this.translate = pinyinfy;
        // this.translate = async (zh: string): Promise<string> => {
        //     if (!containsChinese(zh)) {
        //         return zh;
        //     }
        //     const installedPlugins = Reflect.get(this.app, 'plugins').plugins;
        //     if (installedPlugins.translate !== undefined) {
        //         const res = await installedPlugins.translate.api.translate();
        //         if (res.status_code != 200) {
        //             throw Error(res);
        //         }
        //         // TODO: result
        //         return zh;
        //     } else {
        //         return pinyinfy(zh);
        //     }
        // };
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

    checkTaskDone() {
        this.waitProcessingTask--;
        if (this.waitProcessingTask <= 0) {
            this.clearTemplateProcessor();
            this.noticeResult();
            this.clearTask();
        }
    }

    clearTemplateProcessor() {
        this.tplProccessorManager.clear();
    }

    setTask(task: number) {
        this.waitProcessingTask = task;
        this.result = { successed: 0, failed: 0 };
    }

    clearTask() {
        this.waitProcessingTask = 0;
        this.result = { successed: 0, failed: 0 };
    }

    noticeResult() {
        if (this.result.failed > 0) {
            new Notice(
                `All done, failed: ${this.result.failed}, successed: ${this.result.successed}`,
                5000,
            );
        } else {
            new Notice('All notes have been published!', 5000);
        }
    }

    async publishSingleNote(file: TFile, callback?: () => void): Promise<void> {
        const frontmatter = await this.noteHandler.updateFrontmatter(file);
        this.setTask(1);
        this.justPublishContent(
            {
                file: file,
                frontmatter: frontmatter,
            },
            callback,
        );
    }

    async refreshContentFrontmatter(files: TFile[]): Promise<void> {
        for (const file of files) {
            try {
                const frontmatter =
                    await this.noteHandler.updateFrontmatter(file);
                // caching
                this.getTemplateProcessor({
                    file: file,
                    frontmatter: frontmatter,
                });
            } catch (err) {
                new Notice(
                    `refreshing ${file.basename} frontmatter failed, skip it.`,
                    2000,
                );
            }
        }
    }

    async justPublishContent(
        variables: MetaVariables,
        callback?: () => void,
    ): Promise<void> {
        const file = variables.file;
        if (callback === undefined) {
            callback = () => {
                new Notice(
                    `publish ${file.basename} to ${this.settings.publishToAbFolder}`,
                    2000,
                );
            };
        }
        try {
            const yaml = this.contentHandler.getPublishedYAML(variables);
            const content = await this.contentHandler.getPublishedText(file);
            writeContentToAbPath(
                resolvePublishPath(this, file),
                yaml + '\n' + content,
                callback,
            );
            this.result.successed++;
        } catch (err) {
            this.result.failed++;
            console.error(`publish ${file.basename} failded:`, err.message);
        }
        this.checkTaskDone();
    }

    async publishAllNotes(respectModTs: boolean = true): Promise<void> {
        if (!this._checkProjectContentAbPathSetting()) {
            return;
        }

        new Notice('Preparing to publish all...', 2000);
        const folder = this.app.vault.getAbstractFileByPath(
            this.settings.noteFolder,
        );
        const queue: (TAbstractFile | null)[] = [folder];
        const files = [];
        const cache = this.app.metadataCache;

        while (queue.length) {
            const t = queue.shift();
            if (t instanceof TFolder) {
                queue.push(...t.children);
            } else if (t instanceof TFile) {
                if (respectModTs) {
                    const frontcache = cache.getFileCache(t)?.frontmatter;
                    if (
                        frontcache &&
                        frontcache[NOTE_META.modTs] &&
                        frontcache[NOTE_META.modTs] >= t.stat.mtime
                    ) {
                        new Notice(
                            `Skipping ${t.basename}, due to no content modified.`,
                            3500,
                        );
                        continue;
                    }
                }
                files.push(t);
            }
        }
        await this.refreshContentFrontmatter(files);
        this.setTask(files.length);
        new Notice(
            `Got ${this.waitProcessingTask} nots for publishing...`,
            5000,
        );
        for (const file of files) {
            this.justPublishContent({ file: file });
        }
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
                new Notice(
                    `Valid path: ${this.settings.publishToAbFolder}`,
                    2000,
                );
            }
        } else {
            new Notice(
                `Invalid path: ${this.settings.publishToAbFolder}`,
                2000,
            );
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
            2000,
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
            id: 'publish-current-note',
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
                        2000,
                    );
                });
            },
        });
    }

    _addCommandPublishAllNotes(): void {
        this.addCommand({
            id: 'publish-only-modified-notes',
            name: 'Publish only modified notes',
            callback: async () => {
                this.publishAllNotes();
            },
        });
    }

    _addCommandPublishAllNotesForce(): void {
        this.addCommand({
            id: 'publish-or-republish-all-notes',
            name: 'Publish or republish all notes',
            callback: async () => {
                this.publishAllNotes(false);
            },
        });
    }
}
