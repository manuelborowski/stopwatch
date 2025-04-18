export class FilterMenu {
    constructor(placeholder, menu, changed_cb, id) {
        this.id = id;
        this.menu_cache = Object.assign({}, ...menu.map(m => ({[m.id]: m})));
        this.filter_cache = {};

        const __add_label = (placeholder, item) => {
            const label = document.createElement("label");
            placeholder.appendChild(label);
            label.classList.add("control-label")
            label.setAttribute("for", item.id);
            label.innerHTML = item.label;
        }

        if (menu.length > 0) {
            for (const item of menu) {
                const form_group = document.createElement("div");
                form_group.classList.add(".filter-form-group");
                if (item.type === "select") {
                    __add_label(form_group, item);
                    const select = document.createElement("select");
                    form_group.appendChild(select);
                    select.classList.add("filter-form-control", "table-filter");
                    select.addEventListener("change", e => {
                        this.store_set(e.target);
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
                    __add_label(form_group, item);
                    const checkbox = document.createElement("input");
                    form_group.appendChild(checkbox);
                    checkbox.type = "checkbox";
                    checkbox.id = item.id;
                    checkbox.classList.add("filter-form-control", "table-filter");
                    checkbox.addEventListener("click", e => {
                        this.store_set(e.target);
                        changed_cb();
                    });
                } else if (item.type === "button") {
                    const button = document.createElement("a");
                    form_group.appendChild(button);
                    button.type = "button";
                    button.id = item.id;
                    button.classList.add("filter-form-control", "table-filter", "btn", "btn-success");
                    button.innerHTML = item.label;
                    button.addEventListener("click", item.callback);
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
            this.store_init();
            placeholder.style.display = "flex";
        }
    }

    get filters() {
        return Object.entries(this.filter_cache).map(k => (Object.assign({id: k[0]}, k[1])))
    }

    // A filter can be:
    // persistent: the current value is stored in localStore
    // not-persistent: the default value is stored in localStore
    // dynamic: not stored in localStore
    // depends: multiple, current, values are stored in localStore.  The current value stored depends on the value of another filter (depends)
    // invalidate/skip: when a filter with the invalidate attribute is changed, the filters, listed in the attributed, get a "skip" flag.  When the page is reloaded, filters with the "skip" flag
    //    are skipped (default value is used).  When a filter with a skip flag is changed, the skip flag is removed.
    store_init() {
        let set_store_content = {};
        this.filter_cache = {};

        const __build_store_structure = (first_pass = true) => {
            for (const [id, item] of Object.entries(this.menu_cache)) {
                if (first_pass === ("depends" in item)) continue;
                let value = null;
                if (item.type === "select") value = document.getElementById(id).value;
                else if (item.type === "checkbox") value = document.getElementById(id).checked;
                this.filter_cache[id] = {type: item.type, value};
                if ("dynamic" in item && item.dynamic) continue; // Filter options are not fixed and cannot be stored
                let store_content = first_pass ? {value} : {depends: {id: item.depends, value: {[this.filter_cache[item.depends].value]: value}}};
                if ("invalidate" in item) store_content.invalidate = item.invalidate;
                Object.assign(store_content, {persistent: item.persistent, type: item.type})
                set_store_content[id] = store_content;
            }
        }

        const get_store_content = JSON.parse(localStorage.getItem(`Filter-${this.id}`));
        if (get_store_content) {
            for (const [key, data] of Object.entries(get_store_content)) {
                if ("skip" in data || !data.persistent) continue;
                if ("depends" in data) {
                    if (get_store_content[data.depends.id].value in data.depends.value) document.getElementById(key).value = data.depends.value[get_store_content[data.depends.id].value];
                } else {
                    document.getElementById(key).value = data.value;
                }
            }
        }
        // Two passes are required: first pass, consider the non-depends filters only.  Second pass, consider the depends filters only (the value depends on a non-depends filter).
        __build_store_structure(true);
        __build_store_structure(false);
        if (!get_store_content) localStorage.setItem(`Filter-${this.id}`, JSON.stringify(set_store_content));
    }

    store_set(target = null) {
        const store_content = JSON.parse(localStorage.getItem(`Filter-${this.id}`));
        const item = store_content[target.id];
        if ("depends" in item) {
            item.depends.value[store_content[item.depends.id].value] = target.value;
        } else {
            item.value = target.value;
        }
        //Filters with the "skip" flag are skipped when the page is loaded (i.e. the default filter value is used).  The flag is removed when said filter is changed.
        if ("invalidate" in item) for (const filter of item.invalidate) store_content[filter].skip = true;
        if ("skip" in item) delete item.skip;
        localStorage.setItem(`Filter-${this.id}`, JSON.stringify(store_content));
        this.filter_cache[target.id].value = target.value;
        if ("cb" in this.menu_cache[target.id]) this.menu_cache[target.id].cb(target.value);
    }
}