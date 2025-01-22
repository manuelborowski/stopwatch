export class ButtonMenu {
    constructor(placeholder, menu) {
        this.menu = menu;
        this.filters = [];
        if (menu.length > 0) {
            for (const item of menu) {
                let element = null;
                if (item.type === "button") {
                    element = document.createElement("button");
                    element.classList.add("btn");
                    element.type = "button";
                    element.innerHTML = item.label;
                    element.addEventListener("click", item.cb);
                    element.id = item.id;
                } else if (item.type === "text") {
                    element = document.createElement("label");
                    element.innerHTML = item.label;
                    const input = document.createElement("input");
                    element.appendChild(input);
                    input.type = "text";
                    input.disabled = true;
                    input.id = item.id;
                    if ("width" in item) input.style.width = item.width;
                }
                if (element) {
                    placeholder.appendChild(element);
                    if ("align" in item) element.classList.add(`align-${item.align}`)
                }
            }
        }
    }
}