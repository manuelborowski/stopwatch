export const create_html = (parent, template) => {
    let container_level = 0;

    const __iterate_template = (component, parent) => {
        if ("rows" in component) {
            container_level++;
            const button = document.createElement("button");
            parent.appendChild(button);
            button.classList.add("collapsible", `collapsible-${container_level}`);
            button.type = "button";
            button.innerText = component.label;
            const content = document.createElement("div");
            parent.appendChild(content);
            content.classList.add("content");
            if (!("save" in component && !component.save)) {
                const save_button = document.createElement("button");
                save_button.classList.add("btn", "btn-success", "btn-save")
                save_button.innerText = "Bewaar sectie";
                save_button.style.margin = "10px";
                content.appendChild(save_button);
            }
            for (const row of component.rows) {
                __iterate_template(row, content);
            }
        } else {
            const form_row = document.createElement("div");
            parent.appendChild(form_row);
            form_row.classList.add("form-row");
            if (!Array.isArray(component)) component = [component];
            for (const element of component) {
                const form_element = document.createElement("div");
                form_row.appendChild(form_element);
                form_element.classList.add("form-element");
                let tag = null;
                if (element.type === "div") {
                    tag = document.createElement("div");
                    form_element.appendChild(tag);
                } else if (element.type === "button") {
                    tag = document.createElement("button");
                    tag.classList.add("btn", "btn-success");
                    tag.innerText = element.label;
                    form_element.appendChild(tag);
                } else {
                    const text = document.createTextNode(element.label);
                    const span = document.createElement("span");
                    if (!("save" in element && !element.save)) {
                        const save_button = document.createElement("button");
                        save_button.classList.add("btn", "btn-success", "btn-save")
                        save_button.innerText = "Bewaar";
                        save_button.style.marginRight = "10px";
                        span.appendChild(save_button);
                    }
                    span.appendChild(text);
                    const label = document.createElement("label");
                    form_element.appendChild(label);
                    if (element.type === "textarea") {
                        tag = document.createElement("textarea");
                        tag.rows = "10";
                        tag.cols = "150";
                        label.classList.add("top");
                    } else if (element.type === "check") {
                        tag = document.createElement("input");
                        tag.type = "checkbox"
                    } else if (element.type === "select") {
                        tag = document.createElement("select");
                    } else if (element.type === "input") {
                        tag = document.createElement("input");
                    }
                    if (tag) {
                        label.appendChild(span);
                        label.appendChild(tag);
                    }
                }
                if (tag) {
                    if ("name" in element) tag.name = element.name;
                    if ("id" in element) tag.id = element.id;
                    if ("class" in element) tag.classList.add(element.class);
                }
            }
            return
        }
        container_level--;
    }

    for (const row of template) {
        __iterate_template(row, parent);
    }
}