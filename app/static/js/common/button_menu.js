export class ButtonMenu {
    constructor(placeholder, menu) {
        this.menu = menu;
        this.filters = [];
        if (menu.length > 0) {
            for (const item of menu) {
                if (item.type === "button") {
                    const button = document.createElement("button");
                    placeholder.appendChild(button);
                    button.classList.add("btn");
                    button.type = "button";
                    button.innerHTML = item.label;
                    button.addEventListener("click", item.cb);
                } else if (item.type === "select") {
                    const form_group = document.createElement("div");
                    placeholder.appendChild(form_group);
                    form_group.classList.add(".filter-form-group");
                    const label = document.createElement("label");
                    form_group.appendChild(label);
                    label.classList.add("control-label")
                    label.setAttribute("for", item.id);
                    label.innerHTML = item.label;
                    const select = document.createElement("select");
                    form_group.appendChild(select);
                    select.classList.add("filter-form-control", "table-filter");
                    select.addEventListener("change", item.cb)
                    select.id = item.id;
                    for (const o of item.options) {
                        const option = document.createElement("option");
                        select.appendChild(option);
                        if (o.value === item.default) option.setAttribute("selected", true);
                        option.value = o.value;
                        option.innerHTML = o.label;
                    }
                }
                // }
                // const button = document.createElement("button");
                // placeholder.appendChild(button);
                // button.classList.add("btn", "btn-danger");
                // button.type = "button";
                // button.innerHTML = "Reset";
                // button.addEventListener("click", () => {
                //     localStorage.clear(`Filter-${this.id}`);
                //     location.reload();
                // });
                // this.load_settings();
                // this.store_settings();
            }
            placeholder.style.display = "flex";
        }
    }
}