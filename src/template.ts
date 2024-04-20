import { App, TFile, FrontMatterCache } from 'obsidian';
import ContentPublisher from '../main';

export class TemplateProcessor {
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
        return template.replace(/{{(.*?)}}/g, (match, expr) =>
            this.evalPart(expr),
        );
    }
}

export interface MetadataTemplateVariables {
    file: TFile;
    frontmatter?: FrontMatterCache;
}

export class MetadataTemplateProcessor extends TemplateProcessor {
    app: App;

    constructor(
        plugin: ContentPublisher,
        variables: {
            file: TFile;
            frontmatter?: FrontMatterCache;
        },
    ) {
        const { app } = plugin;
        if (!variables.frontmatter) {
            variables.frontmatter = app.metadataCache.getFileCache(
                variables.file,
            )?.frontmatter;
        }
        const metadataVariables: MetadataTemplateVariables = {
            ...variables,
            // initial more here
        };
        super(metadataVariables);
        this.app = app;
    }
}
