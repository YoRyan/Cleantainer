class MessageElement extends HTMLSpanElement {
    constructor() {
        super();
    }
    connectedCallback() {
        if (!("initialized" in this.dataset)) {
            const { textContent } = this;
            if (textContent !== null) {
                this.textContent = browser.i18n.getMessage(textContent);
            }
            this.dataset.initialized = "";
        }
    }
}
customElements.define("i18n-message", MessageElement, { extends: "span" });
