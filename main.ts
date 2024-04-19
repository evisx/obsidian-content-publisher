// import { Editor, MarkdownView, TFile, Notice, Plugin } from 'obsidian';
import { TFile, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, Settings, SettingTab } from 'src/SettingTab'
import { MESSAGES, checkSettingOfAbPath, resolvePublishPath, writeContentToAbPath } from 'src/utils'

export default class ContentPublisher extends Plugin {
    settings: Settings;

    async onload() {
        await this.loadSettings();

        // This creates an icon in the left ribbon.
        // const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
        //  // Called when the user clicks the icon.
        //  new Notice('This is a notice!');
        // });
        // Perform additional things with the ribbon
        // ribbonIconEl.addClass('my-plugin-ribbon-class');

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        // const statusBarItemEl = this.addStatusBarItem();
        // statusBarItemEl.setText('Status Bar Text');
        this._addCommandValidateAbPath()
        this._addCommandPublishCurrentNote()

        // This adds a simple command that can be triggered anywhere
        // this.addCommand({
        //  id: 'open-sample-modal-simple',
        //  name: 'Open sample modal (simple)',
        //  callback: () => {
        //      new SampleModal(this.app).open();
        //  }
        // });
        // This adds an editor command that can perform some operation on the current editor instance
        // this.addCommand({
        //  id: 'sample-editor-command',
        //  name: 'Sample editor command',
        //  editorCallback: (editor: Editor, view: MarkdownView) => {
        //      console.log(editor.getSelection());
        //      editor.replaceSelection('Sample Editor Command');
        //  }
        // });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        // this.addCommand({
        //  id: 'open-sample-modal-complex',
        //  name: 'Open sample modal (complex)',
        //  checkCallback: (checking: boolean) => {
        //      // Conditions to check
        //      const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        //      if (markdownView) {
        //          // If checking is true, we're simply "checking" if the command can be run.
        //          // If checking is false, then we want to actually perform the operation.
        //          if (!checking) {
        //              new SampleModal(this.app).open();
        //          }

        //          // This command will only show up in Command Palette when the check function returns true
        //          return true;
        //      }
        //  }
        // });

        this.addSettingTab(new SettingTab(this.app, this));

        // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
        // Using this function will automatically remove the event listener when this plugin is disabled.
        // this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
        //  console.log('click', evt);
        // });

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        // this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
    }

    onunload() {

    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    _checkProjectContentAbPathSetting(validNoticed = false): boolean {
        if (checkSettingOfAbPath(this, this.settings.projectContentAbFolder, MESSAGES.invalidProjectContentAbFolder)) {
            if (validNoticed) {
                new Notice(`Valid path: ${this.settings.projectContentAbFolder}`);
            }
        } else {
            new Notice(`Invalid path: ${this.settings.projectContentAbFolder}`);
            return false
        }
        return true
    }

    _checkNoteInBlogPathSetting(file: TFile): boolean {
        if (new RegExp('^' + this.settings.vaultBlogFolder + '.*\\.md$').test(file.path)) {
            return true
        }
        new Notice(`Not in Blog Folder: ${this.settings.vaultBlogFolder} Or Not a Markdown File`);
        return false
    }

    _addCommandValidateAbPath(): void {
        this.addCommand({
            id: "validate-ab-path",
            name: "Validate absolute project content path",
            callback: () => this._checkProjectContentAbPathSetting(true)
        });
    }

    _addCommandPublishCurrentNote(): void {
        this.addCommand({
            id: "Publish-current-note",
            name: "Publish current note to blog",
            callback: () => {
                if (!this._checkProjectContentAbPathSetting()) {
                    return
                }
                const file = this.app.workspace.getActiveFile()
                if (!file || !this._checkNoteInBlogPathSetting(file)) {
                    return
                }
                writeContentToAbPath(
                    resolvePublishPath(this, file),
                    'test',
                    `Your note has been published! At ${this.settings.projectContentAbFolder}`
                )
            }
        });
    }
}