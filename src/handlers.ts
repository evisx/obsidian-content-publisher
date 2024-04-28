import { TFile, Notice, FrontMatterCache } from 'obsidian';
import { Settings } from 'src/settings';
import { MetaVariables, MetadataTemplateProcessorManager } from 'src/template';
import { Moment } from 'moment';
import ContentPublisher from 'main';

class Handler {
    plugin: ContentPublisher;
    settings: Settings;

    constructor(plugin: ContentPublisher) {
        this.plugin = plugin;
        this.settings = plugin.settings;
    }
}

export const NOTE_META = {
    pubUrl: 'content-publish-url',
    pubTs: 'content-publish-ts',
    modTs: 'content-update-ts',
};

export class NoteHandler extends Handler {
    constructor(plugin: ContentPublisher) {
        super(plugin);
    }

    generatePobUrl(file: TFile): string {
        const process = this.plugin.getTemplateProcessor({ file: file });
        return (
            this.settings.publishUrlPrefix +
            process.evalTemplate(this.settings.publishSlugTemplate)
        );
    }

    updateNoteMeta(frontmatter: FrontMatterCache, file: TFile): void {
        // TODO: respect option
        let pubTime;
        let modTime;
        if (!frontmatter[NOTE_META.pubUrl]) {
            frontmatter[NOTE_META.pubUrl] = this.generatePobUrl(file);
        }
        if (!frontmatter[NOTE_META.pubTs]) {
            pubTime = window.moment();
            frontmatter[NOTE_META.pubTs] = pubTime.valueOf();
        }
        modTime = window.moment(file.stat.mtime);
        frontmatter[NOTE_META.modTs] = file.stat.mtime;

        const process = this.plugin.getTemplateProcessor({ file: file });
        process.setModTime(modTime);

        if (pubTime !== undefined) {
            process.setPubTime(pubTime);
        }
    }

    async updateFrontmatter(file: TFile): Promise<FrontMatterCache> {
        return new Promise<FrontMatterCache>((resolve, _reject) => {
            this.plugin.app.fileManager.processFrontMatter(
                file,
                (frontmatter: FrontMatterCache) => {
                    this.updateNoteMeta(frontmatter, file);
                    resolve(frontmatter);
                },
                file.stat, // keep mtime not change
            );
        });
    }
}

export class ContentHandler extends Handler {
    constructor(plugin: ContentPublisher) {
        super(plugin);
    }

    getPublishedYAML(variables: MetaVariables): string {
        const process = this.plugin.getTemplateProcessor(variables);
        const metadatas: string[] = [];
        this.settings.metadataFormats.forEach((meta) => {
            if (meta.rule === 'none') return;
            try {
                const data = process.evalTemplate(meta.template);
                if (meta.rule === 'present' && !data) return;
                metadatas.push(
                    `${meta.name}: ${data}`.replace(/\s+\n/g, '\n').trim(),
                );
            } catch (error) {
                new Notice(`Publish Error: ${error.message}`, 2000);
                throw Error(error.message);
            }
        });
        return `---\n${metadatas.join('\n')}\n---\n`;
    }

    // TODO: handle local image file link
    async getPublishedText(file: TFile): Promise<string> {
        const tplProcManager = this.plugin.tplProccessorManager;
        const cache = this.plugin.app.metadataCache;
        const { major, minor, notFound } = this.settings.wikilinkFormats;
        return (await this.getContentWithoutFrontMatter(file)).replace(
            /\[\[(.*?)\]\]/g,
            (_match, refer) => {
                let tplProc;
                const linkFile = cache.getFirstLinkpathDest(refer, file.path);
                if (!linkFile) {
                    new Notice(`Note of [[${refer}]] not found!`, 2000);
                    tplProc = tplProcManager.getProcessor({ file: file });
                    tplProc.setRefer(refer);
                    return tplProc.evalTemplate(notFound);
                }

                tplProc = tplProcManager.getProcessor({ file: linkFile });
                tplProc.setRefer(refer);
                return tplProc.evalTemplateWithTryList([
                    major,
                    minor,
                    notFound,
                ]);
            },
        );
    }

    async getContentWithoutFrontMatter(file: TFile): Promise<string> {
        const fileContent = await this.plugin.app.vault.read(file);
        return fileContent.replace(/^---[\s\S]+?---/, '').trim();
    }
}
