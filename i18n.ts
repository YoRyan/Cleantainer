class MessageElement extends HTMLSpanElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const { textContent } = this;
        if (textContent !== null) {
            this.textContent = browser.i18n.getMessage(textContent);
        }
    }
}
customElements.define("i18n-message", MessageElement, { extends: "span" });
