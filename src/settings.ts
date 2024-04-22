import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import { arraymove } from './utils';
import ContentPublisher from '../main';

export interface MetadataTemplate {
    name: string;
    template: string;
}

export interface Settings {
    noteFolder: string;
    publishToAbFolder: string;
    publishUrlPrefix: string;
    publishSlugTemplate: string;
    metadataFormats: MetadataTemplate[];
    wikilinkFormats: {
        major: string;
        minor: string;
        notFound: string;
    };
}

export const DEFAULT_SETTINGS: Settings = {
    noteFolder: '',
    publishToAbFolder: '',
    publishUrlPrefix: '',
    publishSlugTemplate: '{{buiSlug}}',
    metadataFormats: [
        {
            name: 'title',
            template: '{{file.basename}}',
        },
        {
            name: 'author',
            template: '{{frontmatter.author}}',
        },
        {
            name: 'pubDatetime',
            template: '{{pubTime.format()}}',
        },
        {
            name: 'modDatetime',
            template: '{{modTime.format()}}',
        },
        {
            name: 'featured',
            template: 'false',
        },
        {
            name: 'slug',
            template: '{{pubSlug}}',
        },
        {
            name: 'draft',
            template: '{{frontmatter.draft}}',
        },
        {
            name: 'tags',
            template: '{{array(frontmatter.tags)}}',
        },
        {
            name: 'description',
            template: '{{frontmatter.description}}',
        },
    ],
    wikilinkFormats: {
        major: '[{{refer}}]({{pubUrl}})',
        minor: '[{{refer}}]({{frontmatter.url}})',
        notFound: '[{{refer}}](https://blog.com/404)',
    },
};

export class SettingTab extends PluginSettingTab {
    plugin: ContentPublisher;

    constructor(plugin: ContentPublisher) {
        super(plugin.app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        this.containerEl.empty();

        this._addSettingHeader();
        this._addNoteFolder();
        this._addProjectContentAbFolder();
        this._addPublishUrlPrefix();
        this._addPublishSlugTemplate();
        this._addNewMetadataTemplateButton();
        this._addDisplayMetadataFormats();
        this._addWikilinkTemplateDescription();
        this._addDisplayWikilinkFormats();
    }

    redisplay(): void {
        this.display();
    }

    _addSettingHeader(): void {
        this.containerEl.createEl('h2', {
            text: 'Content Publisher General Setting.',
        });
    }

    _addNoteFolder(): void {
        new Setting(this.containerEl)
            .setName('source location')
            .setDesc(
                'Obsidian md files in this folder will be expose to your local project content.',
            )
            .addText((text) =>
                text
                    .setPlaceholder('Example: folder1/folder2')
                    .setValue(this.plugin.settings.noteFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.noteFolder = value;
                        await this.plugin.saveSettings();
                    }),
            );
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

    _addPublishUrlPrefix(): void {
        new Setting(this.containerEl)
            .setName('publish domain url prefix')
            .setDesc(
                'The prefix to form a visitable publish url. result is `${prefix}${pubSlug}`.',
            )
            .addText((text) =>
                text
                    .setPlaceholder('Example: https://blog.com/post/')
                    .setValue(this.plugin.settings.publishUrlPrefix)
                    .onChange(async (value) => {
                        this.plugin.settings.publishUrlPrefix = /\/$/.test(
                            value,
                        )
                            ? value
                            : value + '/';
                        await this.plugin.saveSettings();
                    }),
            );
    }

    _addPublishSlugTemplate(): void {
        new Setting(this.containerEl)
            .setName('publish slug format')
            .setDesc('The format is used to format pubSlug.')
            .addText((text) =>
                text
                    .setPlaceholder('Example: {{buiSlug}}')
                    .setValue(this.plugin.settings.publishSlugTemplate)
                    .onChange(async (value) => {
                        this.plugin.settings.publishSlugTemplate =
                            value.replace(/pubSlug/g, 'buiSlug');
                        await this.plugin.saveSettings();
                    }),
            );
    }

    _addNewMetadataTemplateButton(): void {
        new Setting(this.containerEl)
            .setName('front matter mapping')
            .setDesc(
                'Add new front matter mapping template to match your collection schema.',
            )
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
                    .addText((text) => {
                        text.setPlaceholder('name')
                            .then((text) => (text.inputEl.size = 30))
                            .setValue(metadataTemplate.name)
                            .onChange((name) => {
                                metadataTemplate.name = name;
                                this.plugin.saveSettings();
                            });
                    })
                    .addText((text) => {
                        text.setPlaceholder('template')
                            .then((text) => (text.inputEl.size = 50))
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

    _addWikilinkTemplateDescription(): void {
        new Setting(this.containerEl)
            .setName('wikilinks to markdownlinks')
            .setDesc(
                'The following templates is used to handle reference link (plugin will resolve file of wikilink).',
            );
    }

    setSettingItemDescription(el: HTMLElement, text: string): void {
        let desEl = el.querySelector('.setting-item-description');
        if (desEl) {
            desEl.textContent = text;
        }
    }

    _addDisplayWikilinkFormats(): void {
        this.setSettingItemDescription(
            new Setting(this.containerEl).addText((text) => {
                text.setPlaceholder('template')
                    .then((text) => (text.inputEl.size = 65))
                    .setValue(this.plugin.settings.wikilinkFormats.major)
                    .onChange((template) => {
                        this.plugin.settings.wikilinkFormats.major = template;
                        this.plugin.saveSettings();
                    });
            }).infoEl,
            'First Try',
        );
        this.setSettingItemDescription(
            new Setting(this.containerEl).addText((text) => {
                text.setPlaceholder('template')
                    .then((text) => (text.inputEl.size = 65))
                    .setValue(this.plugin.settings.wikilinkFormats.minor)
                    .onChange((template) => {
                        this.plugin.settings.wikilinkFormats.minor = template;
                        this.plugin.saveSettings();
                    });
            }).infoEl,
            'Second Try',
        );
        this.setSettingItemDescription(
            new Setting(this.containerEl).addText((text) => {
                text.setPlaceholder('template')
                    .then((text) => (text.inputEl.size = 65))
                    .setValue(this.plugin.settings.wikilinkFormats.notFound)
                    .onChange((template) => {
                        this.plugin.settings.wikilinkFormats.notFound =
                            template;
                        this.plugin.saveSettings();
                    });
            }).infoEl,
            'Not Found',
        );
    }
}
