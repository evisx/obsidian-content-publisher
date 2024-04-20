import { TFile, Notice } from 'obsidian';
import { Settings } from './settings';
import { MetadataTemplateProcessor } from './template';
import ContentPublisher from '../main';

export class ContentHandler {
    plugin: ContentPublisher;
    settings: Settings;

    constructor(plugin: ContentPublisher) {
        this.plugin = plugin;
        this.settings = plugin.settings;
    }

    getPublishedYAML(file: TFile): string {
        const process = new MetadataTemplateProcessor(this.plugin, {
            file: file,
        });
        const metadatas: string[] = [];
        this.settings.metadataFormats.forEach((meta) => {
            try {
                metadatas.push(
                    `${meta.name}: ${process.evalTemplate(meta.template)}`,
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
