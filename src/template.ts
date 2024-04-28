import { App, TFile, FrontMatterCache, Notice } from 'obsidian';
import { relative } from 'path';
import { Moment } from 'moment';
import { NOTE_META } from 'src/handlers';
import { Settings } from 'src/settings';
import { pinyinfy, simplify } from 'src/utils';
import ContentPublisher from 'main';

const arrayHandler = (arr: string[]) => `\n  - ${arr.join('\n  - ')}`;

class TemplateProcessor {
    constructor(public variables: Record<string, any>) {}

    setVariable(name: string, value: any) {
        this.variables[name] = value;
    }

    evalPart(expr: string) {
        // avoid direct eval
        const evaluated = new Function(
            ...Object.keys(this.variables),
            `return ${expr};`,
        )(...Object.values(this.variables));
        if (evaluated === undefined) {
            throw Error(`The expression "${expr}" cannot be evaluated.`);
        }
        return evaluated;
    }

    evalTemplate(template: string) {
        return template.replace(/{{(.*?)}}/g, (_match, expr) =>
            this.evalPart(expr),
        );
    }
}

export type MetaVariables = {
    file: TFile;
    frontmatter?: FrontMatterCache;
};

export type MetadataTemplateVariables = {
    file: TFile;
    array: (arr: string[]) => string; // handle array to YAML list
    simplify: (str: string) => string;
    relative: (file: TFile) => string;
    nowTime: Moment;
    frontmatter?: FrontMatterCache;
    refer?: string;
    urlPrefix?: string;
    buiSlug?: string;
    pubSlug?: string;
    pubUrl?: String;
    pubTime?: Moment;
    modTime?: Moment;
};

export class MetadataTemplateProcessorManager {
    plugin: ContentPublisher;
    prcessorCache: Record<string, MetadataTemplateProcessor>;

    constructor(plugin: ContentPublisher) {
        this.plugin = plugin;
        this.clear();
    }

    getProcessor(variables: MetaVariables): MetadataTemplateProcessor {
        const file = variables.file;
        let processor = this.prcessorCache[file.path];
        if (processor === undefined) {
            processor = new MetadataTemplateProcessor(this.plugin, variables);
            this.prcessorCache[file.path] = processor;
        }
        if (variables.frontmatter) {
            processor.setFrontmatter(variables.frontmatter);
        }
        return processor;
    }

    clear(): void {
        this.prcessorCache = {};
    }
}

export class MetadataTemplateProcessor extends TemplateProcessor {
    app: App;
    settings: Settings;
    translate: (zh: string) => string;
    inited: Record<string, boolean>;

    constructor(plugin: ContentPublisher, variables: MetaVariables) {
        const { app, settings, translate } = plugin;
        const metadataVariables: MetadataTemplateVariables = {
            ...variables,
            // initial more here
            array: arrayHandler,
            nowTime: window.moment(),
            simplify: simplify,
            relative: (f: TFile) => relative(settings.noteFolder, f.path),
        };
        super(metadataVariables);
        this.app = app;
        this.settings = settings;
        this.translate = translate;
        this.inited = {};
    }

    evalTemplate(template: string) {
        return template.replace(/{{(.*?)}}/g, (_match, expr) => {
            this.expressionHandler(expr);
            return this.evalPart(expr);
        });
    }

    evalTemplateWithTryList(list: string[]): string {
        for (let i = 0; i < list.length; i++) {
            try {
                return this.evalTemplate(list[i]);
            } catch (err) {
                if (i === list.length - 1) {
                    // If it's the last item in the list
                    new Notice(
                        `All evals failed. Last error: ${err.message}`,
                        2000,
                    );
                } else {
                    new Notice(
                        `Eval ${list[i]} failed: ${err.message}, trying next.`,
                        2000,
                    );
                }
            }
        }
        throw new Error('All template evaluations failed.'); // Or return a default value
    }

    setFrontmatter(frontmatter: FrontMatterCache) {
        this.setVariable('frontmatter', frontmatter);
        this.inited['frontmatter'] = true;
    }

    setPubUrl(pubUrl: string) {
        this.setVariable('pubUrl', pubUrl);
        this.inited['pubUrl'] = true;
    }

    setPubTime(pubTime: Moment) {
        this.setVariable('pubTime', pubTime);
        this.inited['pubTime'] = true;
    }

    setModTime(modTime: Moment) {
        this.setVariable('modTime', modTime);
        this.inited['modTime'] = true;
    }

    setRefer(refer: string) {
        this.setVariable('refer', refer);
        this.inited['refer'] = true;
    }

    getRelatedPath(file: TFile): string {
        return relative(this.settings.noteFolder, file.path);
    }

    generateBuiSlug(file: TFile): string {
        const segs = this.getRelatedPath(file).replace(/\.md$/, '').split('/');
        const slug = segs.map((text) => this.translate(text)).join('-');

        return simplify(slug);
    }

    expressionHandler(expr: string) {
        const matches = expr.match(
            /(frontmatter)|(pubTime)|(modTime)|(refer)|(urlPrefix)|(buiSlug)|(pubSlug)|(pubUrl)/g,
        );
        // load date when needed
        if (matches) {
            matches.forEach((match) => {
                if (this.inited[match]) return;
                switch (match) {
                    case 'frontmatter':
                        this.initFrontmatter();
                        break;
                    case 'pubTime':
                        this.initPubTime();
                        break;
                    case 'modTime':
                        this.initModTime();
                        break;
                    case 'refer':
                        this.initRefer();
                        break;
                    case 'urlPrefix':
                        this.initUrlPrefix();
                        break;
                    case 'buiSlug':
                        this.initBuiSlug();
                        break;
                    case 'pubSlug':
                        this.initPubSlug();
                        break;
                    case 'pubUrl':
                        this.initPubUrl();
                        break;
                }
                this.inited[match] = true;
            });
        }
    }

    initFrontmatter() {
        if (this.variables.frontmatter !== undefined) {
            return;
        }
        const file = this.variables.file;
        const cache = this.app.metadataCache.getFileCache(file)?.frontmatter;
        if (cache === undefined) {
            new Notice(`${file.basename} has no frontmatter`, 2000);
        }
        this.setVariable('frontmatter', cache);
    }

    initPubTime() {
        if (this.variables.pubTime !== undefined) {
            return;
        }
        this.initFrontmatter(); // depend on frontmatter
        const ts = this.variables.frontmatter[NOTE_META.pubTs];
        this.setVariable(
            'pubTime',
            ts ? window.moment(ts) : this.variables.nowTime,
        );
    }

    initModTime() {
        if (this.variables.modTime !== undefined) {
            return;
        }
        this.initFrontmatter(); // depend on frontmatter
        const ts = this.variables.frontmatter[NOTE_META.modTs];
        this.setVariable(
            'modTime',
            ts ? window.moment(ts) : this.variables.nowTime,
        );
    }

    initRefer() {
        if (this.variables.refer !== undefined) {
            return;
        }
        // use file basename as default
        this.setVariable('refer', this.variables.file.basename);
    }

    initUrlPrefix() {
        if (this.variables.urlPrefix !== undefined) {
            return;
        }
        this.setVariable('urlPrefix', this.settings.publishUrlPrefix);
    }

    initBuiSlug() {
        if (this.variables.buiSlug !== undefined) {
            return;
        }
        const buiSlug = this.generateBuiSlug(this.variables.file);
        this.setVariable('buiSlug', buiSlug);
    }

    initPubSlug() {
        if (this.variables.pubSlug !== undefined) {
            return;
        }
        if (/pubSlug/.test(this.settings.publishSlugTemplate)) {
            throw Error(
                `Can't use pubSlug in pubSlug template, current is "${this.settings.publishSlugTemplate}" which cause dead cycle.`,
            );
        }
        const pubSlug = this.evalTemplate(this.settings.publishSlugTemplate);
        this.setVariable('pubSlug', pubSlug);
    }

    initPubUrl() {
        if (this.variables.pubUrl !== undefined) {
            return;
        }
        this.initFrontmatter(); // depend on frontmatter
        const pubUrl = this.variables.frontmatter[NOTE_META.pubUrl];
        if (pubUrl === undefined) {
            const err = `${this.variables.file.basename} has no publish url!`;
            new Notice(err, 2000);
            throw Error(err);
        }
        this.setVariable('pubUrl', pubUrl);
    }
}
