import { App, Modal } from 'obsidian';

export class ErrorModal extends Modal {
    text: string;

    constructor(app: App, text: string) {
        super(app);
        this.text = text;
    }

    onOpen() {
        this.contentEl.setText(this.text);
    }

    onClose() {
        this.contentEl.empty();
    }
}