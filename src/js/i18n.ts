class MessageElement extends HTMLSpanElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const { textContent } = this;
        if (textContent !== null) {
            this.insertAdjacentText(
                "afterend",
                browser.i18n.getMessage(textContent),
            );
        }
        this.remove();
    }
}
customElements.define("i18n-message", MessageElement, { extends: "span" });
