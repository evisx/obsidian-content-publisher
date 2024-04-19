import { App, PluginSettingTab, Setting } from 'obsidian';
import ContentPublisher from '../main';

export interface Settings {
    vaultBlogFolder: string;
    projectContentAbFolder: string;
}

export const DEFAULT_SETTINGS: Settings = {
    vaultBlogFolder: "",
    projectContentAbFolder: "",
}

export class SettingTab extends PluginSettingTab {
    plugin: ContentPublisher;

    constructor(app: App, plugin: ContentPublisher) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        this.containerEl.empty();

        this._addSettingHeader();
        this._addProjectContentAbFolder();
        this._addVaultBlogFoler();
    }

    _addSettingHeader(): void {
        this.containerEl.createEl("h2", {text: "Content Publisher General Setting."});
    }

    _addProjectContentAbFolder(): void {
        new Setting(this.containerEl)
            .setName("local project content folder absolute path")
            .setDesc("The local project content folder for your blog. Must be an absolute path.")
            .addText(text => text
                .setPlaceholder("Example: /Users/home/projects/astro/src/blog")
                .setValue(this.plugin.settings.projectContentAbFolder)
                .onChange(async (value) => {
                    this.plugin.settings.projectContentAbFolder = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    _addVaultBlogFoler(): void {
        new Setting(this.containerEl)
            .setName("blog location")
            .setDesc("Files in this folder will be expose to blog project.")
            .addText(text => text
                .setPlaceholder("Example: folder1/folder2")
                .setValue(this.plugin.settings.vaultBlogFolder)
                .onChange(async (value) => {
                    this.plugin.settings.vaultBlogFolder = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}