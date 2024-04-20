import { App, TFile, FrontMatterCache, Notice } from 'obsidian';
import { Moment } from 'moment';
import ContentPublisher from '../main';

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

export interface MetadataTemplateVariables {
    file: TFile;
    array: (arr: string[]) => string; // handle array to YAML list
    frontmatter?: FrontMatterCache | null;
    nowTime?: Moment;
    pubTime?: Moment;
    modTime?: Moment;
}

export class MetadataTemplateProcessor extends TemplateProcessor {
    app: App;
    inited: Record<string, boolean>;

    constructor(
        plugin: ContentPublisher,
        variables: {
            file: TFile;
            frontmatter?: FrontMatterCache;
        },
    ) {
        const { app } = plugin;
        const metadataVariables: MetadataTemplateVariables = {
            ...variables,
            // initial more here
            array: arrayHandler,
            nowTime: window.moment(),
        };
        super(metadataVariables);
        this.app = app;
        this.inited = {};
    }

    evalTemplate(template: string) {
        return template.replace(/{{(.*?)}}/g, (_match, expr) => {
            this.expressionHandler(expr);
            return this.evalPart(expr);
        });
    }

    expressionHandler(expr: string) {
        const matches = expr.match(/(frontmatter)|(pubTime)|(modTime)/g);
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
            new Notice(`${file.basename} has no frontmatter`);
        }
        this.setVariable('frontmatter', cache ? cache : null);
    }

    initPubTime() {
        if (this.variables.pubTime !== undefined) {
            return;
        }
        this.initFrontmatter(); // depend on frontmatter
        const ts = this.variables.frontmatter['content-publish-ts'];
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
        const ts = this.variables.frontmatter['content-update-ts'];
        this.setVariable(
            'modTime',
            ts ? window.moment(ts) : this.variables.nowTime,
        );
    }
}
