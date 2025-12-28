/**
 * Embed <a> elements with localized messages into a localized message.
 *
 * @param anchorMessages An array of messages to localize for the anchors. Each
 * item can be a string, which represents the message, or an array in which the
 * first item is the message and the remaining items are the substitutions.
 * @returns An array of strings and elements suitable for passing to .append(),
 * and an in-order array of references to the anchors.
 */
export function createTextWithAnchors(
    message: string,
    ...anchorMessages: (string | string[])[]
): [
    textAndAnchors: (string | HTMLAnchorElement)[],
    anchors: HTMLAnchorElement[],
] {
    const separator = "__CTWA_SEPARATOR__";
    const { length } = anchorMessages;

    const text = browser.i18n
        .getMessage(message, Array(length).fill(separator))
        .split(separator, length + 1);
    const anchors = anchorMessages
        .slice(0, text.length - 1) // too many anchors
        .map(m => {
            let message: string, substitutions: string[];
            if (typeof m === "string") {
                message = m;
                substitutions = [];
            } else {
                [message, ...substitutions] = m;
            }

            const a = document.createElement("a") as HTMLAnchorElement;
            a.innerText = browser.i18n.getMessage(message, substitutions);
            return a;
        });

    let textAndAnchors: (string | HTMLAnchorElement)[] = [];
    for (let i = 0; i < text.length; i++) {
        textAndAnchors.push(text[i]);
        if (i < anchors.length) {
            textAndAnchors.push(anchors[i]);
        }
    }

    return [textAndAnchors, anchors];
}

class MessageElement extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const { textContent } = this;
        if (textContent !== null) {
            this.insertAdjacentText(
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
customElements.define("i18n-message", MessageElement);

function readSubstitutions(el: HTMLElement): string[] {
    const { dataset } = el;
    const range = [...Array(9).keys()];
    return range
        .map(n => "substitution-" + (n + 1))
        .map(k => dataset[k])
        .map(s => s ?? "");
}
