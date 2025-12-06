class MessageElement extends HTMLSpanElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const { textContent } = this;
        if (textContent !== null) {
            this.insertAdjacentHTML(
                "afterend",
                browser.i18n.getMessage(
                    textContent.trim(),
                    readSubstitutions(this),
                ),
            );
        }
        this.remove();
    }
}
customElements.define("i18n-message", MessageElement, { extends: "span" });

function readSubstitutions(el: HTMLElement): string[] {
    const { dataset } = el;
    return [
        dataset["substitution-1"],
        dataset["substitution-2"],
        dataset["substitution-3"],
        dataset["substitution-4"],
        dataset["substitution-5"],
        dataset["substitution-6"],
        dataset["substitution-7"],
        dataset["substitution-8"],
        dataset["substitution-9"],
    ].map(s => s ?? "");
}
