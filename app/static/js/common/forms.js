export const create_form = (parent, template) => {
    let container_level = 0;

    const __iterate_template = (component, parent) => {
        if ("tag" in component) { // Create an HTML tag
            const tag = document.createElement(component.tag);
            parent.appendChild(tag);
            if ("href" in component) tag.href = component.href;
            if ("rel" in component) tag.rel = component.rel;
        } else if ("rows" in component) { // This is a container component
            container_level++;
            const button = document.createElement("button");
            parent.appendChild(button);
            button.classList.add("collapsible", `collapsible-${container_level}`);
            button.type = "button";
            button.innerText = component.label;
            const content = document.createElement("div");
            parent.appendChild(content);
            content.classList.add("content");
            if ("save" in component && component.save) {
                const save_button = document.createElement("button");
                save_button.classList.add("btn", "btn-success", "btn-save")
                save_button.innerText = "Bewaar sectie";
                save_button.style.margin = "10px";
                content.appendChild(save_button);
            }
            for (const row of component.rows) {
                __iterate_template(row, content);
            }
        } else { // This is a row in the form
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
                    if ("save" in element && element.save) {
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

// Iterate over data.  If a corresponding field (in the form) is found, set the value.
// In case of a select, it is possible to limit the number of options, depending on the category
export const populate_form = async (data, meta = null, parent = document) => {
    for (let [field_name, value] of Object.entries(data)) {
        const field = parent.querySelector(`[name=${field_name}]`);
        if (field) {
            if (field.type === "checkbox") {
                field.checked = value;
            } else if (field.classList.contains("select2-hidden-accessible")) { // select2 type
                await $(`[name=${field_name}]`).val(value).trigger("change");
            } else if (field.classList.contains("ql-container") && "quill" in meta && field_name in meta.quill) { // quill html editor
                await meta.quill[field_name].clipboard.dangerouslyPasteHTML(value);
            } else if (field.type === "select-one") {
                if (meta && "keyed_option" in meta && field_name in meta.keyed_option) {
                    if ("key_field" in meta.keyed_option[field_name]) {
                        const key_value = data[meta.keyed_option[field_name].key_field];
                        if (key_value) {
                            const options = meta.keyed_option[field_name][key_value];
                            field.innerHTML = "";
                            for (const option of options) field.add(new Option(meta.label[field_name][option], option, value === option, value === option));
                        }
                    }
                } else if (meta && "option" in meta && field_name in meta.option) {
                    field.innerHTML = "";
                    for (const item of meta.option[field_name]) field.add(new Option(item.label, item.value, value === item.value, value === item.value));
                }
            } else {
                if (meta && "label" in meta && field_name in meta.label) value = meta.label[field_name][value];
                field.value = value;
            }
        }
    }
}

export const data_from_form = (form, template) => {
    const form_data = Object.fromEntries(new FormData(form));
    // checkboxes are present only when selected and have the value "on" => convert
    form.querySelectorAll("input[type='checkbox']").forEach(c => {
        if ("name" in c) form_data[c.name] = c.name in form_data
    })
    // if a field needs to be typecasted, e.g. from string to int
    template.forEach(t => {
        if ("typecast" in t) form_data[t.name] = t.typecast === "integer" ? parseInt(form_data[t.name]) : form_data[t.name];
    })
    return form_data;
}

