export class FilterMenu {
    constructor(placeholder, menu, changed_cb, id) {
        this.id = id;
        this.menu = menu;
        this.filters = [];
        if (menu.length > 0) {
            for (const item of menu) {
                const form_group = document.createElement("div");
                form_group.classList.add(".filter-form-group");
                const label = document.createElement("label");
                form_group.appendChild(label);
                label.classList.add("control-label")
                label.setAttribute("for", item.id);
                label.innerHTML = item.label;
                if (item.type === "select") {
                    const select = document.createElement("select");
                    form_group.appendChild(select);
                    select.classList.add("filter-form-control", "table-filter");
                    select.addEventListener("change", () => {
                        this.store_settings();
                        changed_cb();
                    })
                    select.id = item.id;
                    for (const o of item.options) {
                        const option = document.createElement("option");
                        select.appendChild(option);
                        if (o.value === item.default) option.setAttribute("selected", true);
                        option.value = o.value;
                        option.innerHTML = o.label;
                    }
                } else if (item.type === "checkbox") {
                    const checkbox = document.createElement("input");
                    form_group.appendChild(checkbox);
                    checkbox.type = "checkbox";
                    checkbox.id = item.id;
                    checkbox.classList.add("filter-form-control", "table-filter");
                    checkbox.addEventListener("click", () => {
                        this.store_settings();
                        changed_cb();
                    });
                }
                placeholder.appendChild(form_group);
            }
            const button = document.createElement("button");
            placeholder.appendChild(button);
            button.classList.add("btn", "btn-danger");
            button.type = "button";
            button.innerHTML = "Reset";
            button.addEventListener("click", () => {
                localStorage.clear(`Filter-${this.id}`);
                let url = location.href.split("?")[0]; // remove trailing arguments
                location.replace(url);
            });
            this.load_settings();
            this.store_settings();
            placeholder.style.display = "flex";
        }
    }

    //All filters are stored, even the non-persistent.  In the latter case, the default value is stored iso actual value
    store_settings() {
        let store = [];
        this.filters = [];
        for (const f of this.menu) {
            let value = null;
            if (f.type === "select") value = document.querySelector(`#${f.id} option:checked`).value;
            if (f.type === "checkbox") value = document.querySelector(`#${f.id}`).checked;
            store.push({id: f.id, type: f.type, value: f.persistent ? value : f.default});
            this.filters.push({id: f.id, type: f.type, value});
        }
        localStorage.setItem(`Filter-${this.id}`, JSON.stringify(store));
    }

    load_settings() {
        const store = JSON.parse(localStorage.getItem(`Filter-${this.id}`));
        if (store === null || store === []) return false
        for(const f of store) document.querySelector(`#${f.id}`).value = f.value;
        return true;
    }


}