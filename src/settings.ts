import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import { arraymove } from './utils';
import ContentPublisher from '../main';

export interface MetadataTemplate {
    name: string;
    template: string;
}

export interface Settings {
    publishToAbFolder: string;
    contentFolder: string;
    metadataFormats: MetadataTemplate[];
}

export const DEFAULT_SETTINGS: Settings = {
    publishToAbFolder: '',
    contentFolder: '',
    metadataFormats: [
        {
            name: 'author',
            template: 'Publisher',
        },
        {
            name: 'title',
            template: '{{file.basename}}',
        },
        {
            name: 'slug',
            template: '{{frontmatter.slug}}',
        },
    ],
};

export class SettingTab extends PluginSettingTab {
    plugin: ContentPublisher;

    constructor(app: App, plugin: ContentPublisher) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        this.containerEl.empty();

        this._addSettingHeader();
        this._addProjectContentAbFolder();
        this._addVaultBlogFoler();
        this._addNewMetadataTemplateButton();
        this._addDisplayMetadataFormats();
    }

    redisplay(): void {
        this.display();
    }

    _addSettingHeader(): void {
        this.containerEl.createEl('h2', {
            text: 'Content Publisher General Setting.',
        });
    }

    _addProjectContentAbFolder(): void {
        new Setting(this.containerEl)
            .setName('local project content folder absolute path')
            .setDesc(
                'The local project content folder for your blog. Must be an absolute path.',
            )
            .addText((text) =>
                text
                    .setPlaceholder(
                        'Example: /Users/home/projects/astro/src/blog',
                    )
                    .setValue(this.plugin.settings.publishToAbFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.publishToAbFolder = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }

    _addVaultBlogFoler(): void {
        new Setting(this.containerEl)
            .setName('blog location')
            .setDesc('Files in this folder will be expose to blog project.')
            .addText((text) =>
                text
                    .setPlaceholder('Example: folder1/folder2')
                    .setValue(this.plugin.settings.contentFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.contentFolder = value;
                        await this.plugin.saveSettings();
                    }),
            );
    }

    _addNewMetadataTemplateButton(): void {
        new Setting(this.containerEl)
            .setName('front matter mapping')
            .setDesc('Add new front matter mapping template')
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip('Add additional front matter mapping template')
                    .setButtonText('+')
                    .setCta()
                    .onClick(() => {
                        this.plugin.settings.metadataFormats.push({
                            name: '',
                            template: '',
                        });
                        this.plugin.saveSettings();
                        this.redisplay();
                    });
            });
    }

    _addDisplayMetadataFormats(): void {
        this.plugin.settings.metadataFormats.forEach(
            (metadataTemplate, index) => {
                new Setting(this.containerEl)
                    .addText((textEl) => {
                        textEl
                            .setPlaceholder('name')
                            .setValue(metadataTemplate.name)
                            .onChange((name) => {
                                metadataTemplate.name = name;
                                this.plugin.saveSettings();
                            });
                    })
                    .addText((textEl) => {
                        textEl
                            .setPlaceholder('template')
                            .setValue(metadataTemplate.template)
                            .onChange((template) => {
                                metadataTemplate.template = template;
                                this.plugin.saveSettings();
                            });
                    })
                    .addExtraButton((btEl) => {
                        btEl.setIcon('up-chevron-glyph')
                            .setTooltip('Move up')
                            .onClick(() => {
                                arraymove(
                                    this.plugin.settings.metadataFormats,
                                    index,
                                    index - 1,
                                );
                                this.plugin.saveSettings();
                                this.redisplay();
                            });
                    })
                    .addExtraButton((btEl) => {
                        btEl.setIcon('down-chevron-glyph')
                            .setTooltip('Move down')
                            .onClick(() => {
                                arraymove(
                                    this.plugin.settings.metadataFormats,
                                    index,
                                    index + 1,
                                );
                                this.plugin.saveSettings();
                                this.redisplay();
                            });
                    })
                    .addExtraButton((btEl) => {
                        btEl.setIcon('cross')
                            .setTooltip('Delete')
                            .onClick(() => {
                                this.plugin.settings.metadataFormats.splice(
                                    index,
                                    1,
                                );
                                this.plugin.saveSettings();
                                this.redisplay();
                            });
                    })
                    .infoEl.remove();
            },
        );
    }
}
