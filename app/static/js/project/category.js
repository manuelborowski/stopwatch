import {datatables_init} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, fetch_delete} from "../common/common.js";
import {BForms} from "../common/BForms.js";
import {AlertPopup} from "../common/popup.js";

let meta = await fetch_get("category.meta");

const template =
    [
        {tag: "link", href: "static/css/form.css", rel: "stylesheet"},
        {type: "select", label: "Type", id: "type-select", name: "type"},
        [
            {type: "check", label: "Hoofding aanwezig?", id: "header-present", attribute: {checked: true}},
            {type: "button", label: "Excel bestand opladen", id: "upload-tickoff-file-button", class: "btn btn-success",},
        ],
        {tag: "p", innerHTML: "<b>Bestand:</b> ", id: "tickoff-file-name", hidden: true},
        {tag: "input", tagtype: "file", hidden: true, name: "tickoff_file", id: "tickoff-file-input", attribute: {accept: ".xls,.xlsx"}},
        {
            group: "select-columns", hidden: true, rows: [
                {tag: "p", class: "select-columns", innerHTML: "Voor elk veld, selecteer kolom in de excel:"},
                {tag: "div", class: "select-columns"},
            ]
        },
        {
            group: "select-category", hidden: true, rows: [
                {type: "input", label: "Nieuwe categorie", id: "category-input", name: "category"},
                {type: "select", label: "Of bestaande categorie", id: "category-select", name: "category_select"},
            ]
        },
    ]

const __upload_tickoff_file = async () => {
    const bform = new BForms(template);
    const dialog = bootbox.dialog({
        title: "Gegevens opladen",
        message: bform.form,
        buttons: {
            confirm: {
                label: "Bewaar",
                className: "btn-primary",
                callback: async () => {
                    const form_data = bform.get_data();
                    form_data["stage"] = 2;
                    form_data["filename"] = form_data.tickoff_file.name;
                    delete form_data.tickoff_file;
                    if (form_data.category === "") {
                        form_data.category = form_data.category_select;
                        await fetch_delete("category.category", {category: form_data.category, type: form_data.type});
                    }
                    await fetch_update("category.category", form_data);
                }
            },
            cancel: {
                label: "Annuleer", className: "btn-secondary", callback: async () => {
                }
            },
        },
        onShown: async () => {
            dialog[0].querySelector(".modal-dialog").style.maxWidth = "800px";
            const data = {"type": meta.default.type};
            bform.populate(data, meta);

            //upload button
            bform.element("upload-tickoff-file-button").addEventListener("click", e => {
                e.preventDefault();
                bform.element("tickoff-file-input").click();
            })
            // upload file when the file-selector-popup closes
            bform.element("tickoff-file-input").addEventListener("change", async e => {
                const form_data = new FormData(bform.form);
                form_data.append("stage", 1);
                form_data.append("header_present", bform.element("header-present").checked);
                const info = await fetch_post("category.category", form_data, true);
                if ("status" in info) {
                    new AlertPopup(info.status, info.msg);
                    return false
                }
                const file_name_field = bform.element("tickoff-file-name");
                file_name_field.hidden = false;
                file_name_field.innerHTML += info.data.filename;

                const type = meta.type[bform.element("type-select").value];
                let column_template = [];
                let data = {};
                for (const field of type.import) {
                    column_template.push([{type: "select", label: field, name: field, class: "column-select"}, {type: "input", label: "v.b.", id: field}]);
                    meta.option[field] = info.data.column.map(c => ({value: c, label: c}))
                    data[field] = info.data.column[0];
                }
                bform.show("select-columns");
                bform.add(bform.form.querySelector("div.select-columns"), column_template);
                bform.populate(data, meta);
                bform.form.querySelectorAll(".column-select").forEach(c => {
                    c.addEventListener("change", e => bform.element(e.target.name).value = info.data.data[e.target.value]);
                    c.dispatchEvent(new Event("change"));
                });
                bform.show("select-category");
                bform.element("type-select").addEventListener("change", e => {
                    const data = {category_select: ""};
                    const options = [{value: "none", label: ""}].concat(meta.category[e.target.value].map(c => ({label: c, value: c})));
                    bform.populate(data, {option: {category_select: options}});
                });
                bform.element("type-select").dispatchEvent(new Event("change"));

            })
        },
    });

}

const button_menu_items = [
    {
        type: 'button',
        id: 'import-category',
        label: 'Gegevens opladen',
        cb: () => __upload_tickoff_file()
    },
]

const filter_menu_items = [
    {
        type: 'select',
        id: 'filter-type',
        label: 'Type',
        persistent: true
    },
    {
        type: 'select',
        id: 'filter-label',
        label: 'Label',
        dynamic: true
    },
]

$(document).ready(function () {
    const url_args = new URLSearchParams(window.location.search);
    const type = url_args.get("type") || meta.default.type;
    for (const item of filter_menu_items) {
        if (item.id === "filter-type") {
            item.options = meta.option.type;
            item.default = meta.option.type[0].value;
        } else if (item.id === "filter-label") {
            item.options = meta.category[type].map(i => ({value: i, label: i}));
            item.default = meta.category[type][0];
        }
    }
    datatables_init({button_menu_items, filter_menu_items});
    document.getElementById("filter-type").addEventListener("change", e => {
        window.location.href = Flask.url_for("category.show", {type: e.target.value});
    });
});
