import { TFile, Notice } from 'obsidian';
import { Settings } from './settings';
import { MetadataTemplateProcessor } from './template';
import { relative } from 'path';
import ContentPublisher from '../main';

class Handler {
    plugin: ContentPublisher;
    settings: Settings;

    constructor(plugin: ContentPublisher) {
        this.plugin = plugin;
        this.settings = plugin.settings;
    }
}

export const NOTE_META = {
    viewUrl: 'content-publish-url',
    autoSlug: 'content-auto-slug',
    pubTs: 'content-publish-ts',
    modTs: 'content-update-ts',
};

export class NoteHandler extends Handler {
    constructor(plugin: ContentPublisher) {
        super(plugin);
    }

    getRelatedPath(file: TFile): string {
        return relative(this.settings.noteFolder, file.path);
    }

    // getAutoSlug(file: TFile): string {}
}

export class ContentHandler extends Handler {
    constructor(plugin: ContentPublisher) {
        super(plugin);
    }

    getPublishedYAML(file: TFile): string {
        const process = new MetadataTemplateProcessor(this.plugin, {
            file: file,
        });
        const metadatas: string[] = [];
        this.settings.metadataFormats.forEach((meta) => {
            try {
                metadatas.push(
                    `${meta.name}: ${process.evalTemplate(meta.template)}`
                        .replace(/\s+\n/g, '\n')
                        .trim(),
                );
            } catch (error) {
                new Notice(`Publish Error: ${error.message}`);
                throw Error(error.message);
            }
        });
        return `---\n${metadatas.join('\n')}\n---\n`;
    }

    async getPublishedText(file: TFile): Promise<string> {
        return this.getContentWithoutFrontMatter(file);
    }

    async getContentWithoutFrontMatter(file: TFile): Promise<string> {
        const fileContent = await this.plugin.app.vault.read(file);
        return fileContent.replace(/^---[\s\S]+?---/, '').trim();
    }
}
