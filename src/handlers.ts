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

    updateNoteMeta(
        frontmatter: FrontMatterCache,
        file: TFile,
        nowTime: Moment,
    ): void {
        let pubTime;
        if (!frontmatter[NOTE_META.pubUrl]) {
            frontmatter[NOTE_META.pubUrl] = this.generatePobUrl(file);
        }
        if (!frontmatter[NOTE_META.pubTs]) {
            pubTime = nowTime;
            frontmatter[NOTE_META.pubTs] = nowTime.valueOf();
        } else {
            pubTime = window.moment(frontmatter[NOTE_META.pubTs]);
        }
        frontmatter[NOTE_META.modTs] = nowTime.valueOf();

        const process = this.plugin.getTemplateProcessor({ file: file });
        process.setModTime(nowTime);
        process.setPubTime(pubTime);
    }

    async updateFrontmatter(file: TFile): Promise<FrontMatterCache> {
        const getter: { obj?: FrontMatterCache } = {};
        const nowTime = window.moment();
        await this.plugin.app.fileManager.processFrontMatter(
            file,
            (frontmatter: FrontMatterCache) => {
                this.updateNoteMeta(frontmatter, file, nowTime);
                getter.obj = frontmatter;
            },
            {
                mtime: nowTime.valueOf(),
            },
        );
        if (getter.obj === undefined) {
            throw Error('failed to update frontmatter');
        }
        return getter.obj;
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
                const texts = refer.split('|');
                const links = texts[0].split(/[#]+/); // anchor
                const linkFile = cache.getFirstLinkpathDest(
                    links[0],
                    file.path,
                );
                const tplProc = tplProcManager.getProcessor({
                    file: linkFile ? linkFile : file,
                });
                tplProc.setRefer(texts.length > 1 ? texts[1] : refer);
                if (!linkFile) {
                    new Notice(`Note of [[${refer}]] not found!`, 2000);
                    return tplProc.evalTemplate(notFound);
                }
                const link = tplProc.evalTemplateWithTryList([
                    major,
                    minor,
                    notFound,
                ]);
                // TODO: anchor support?
                if (links.length > 1) {
                    return link.replace(/\)$/, `#${links[1]})`);
                }
                return link;
            },
        );
    }

    async getContentWithoutFrontMatter(file: TFile): Promise<string> {
        const fileContent = await this.plugin.app.vault.read(file);
        return fileContent.replace(/^---[\s\S]+?---/, '').trim();
    }
}
