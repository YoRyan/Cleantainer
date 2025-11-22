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

async function i18nMain() {
    const options = document.querySelectorAll(
        "option[data-i18n-message]",
    ) as NodeListOf<HTMLOptionElement>;
    for (const option of options) {
        const { text } = option;
        option.text = browser.i18n.getMessage(text);
    }
}
i18nMain();
