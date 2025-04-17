import {datatable_row_data_from_id, datatables_init, datatable_reload_table} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, fetch_delete} from "../common/common.js";
import {BForms} from "../common/BForms.js";
import {AlertPopup} from "../common/popup.js";
import {badge_raw2hex} from "../common/rfid.js";
import {argument_set} from "../base.js";

let meta = await fetch_get("category.meta");

const upload_template =
    [
        {tag: "link", href: "static/css/form.css", rel: "stylesheet"},
        [
            {type: "check", label: "Hoofding aanwezig?", id: "header-present", attribute: {checked: true}},
            {type: "button", label: "(1) Bestand opladen", id: "upload-tickoff-file-button", class: "btn btn-success",},
        ],
        {tag: "input", tagtype: "file", hidden: true, name: "tickoff_file", id: "tickoff-file-input", attribute: {accept: ".xls,.xlsx"}},
        {
            group: "phase2-group", hidden: true, rows: [
                {tag: "p", innerHTML: "<b>Bestand:</b> ", id: "tickoff-file-name", hidden: true},
                {tag: "p", class: "select-columns", innerHTML: "Voor elk veld, selecteer kolom in de excel:"},
                {tag: "div", class: "select-columns"},
                {type: "button", label: "(2) Bestand verwerken", id: "process-data-button", class: "btn btn-success",},
            ]
        },
        {
            group: "phase3-group", hidden: true, rows: [
                {type: "input", label: "Nieuw evenement", id: "category-input", name: "category"},
                {type: "select", label: "Of bestaand evenement", id: "category-select", name: "category_select"},
                {tag: "p", innerHTML: "<b>Niet gevonden:</b> ", id: "entries-not-found"},
                {type: "button", label: "(3) Bestand opslaan", id: "save-data-button", class: "btn btn-success",},
            ]
        },
    ]

const __upload_tickoff_file = async (type) => {
    const bform = new BForms(upload_template);
    const dialog = bootbox.dialog({
        title: "Nieuw evenement: deelnemers inladen",
        message: bform.form,
        buttons: {
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
                const info = await fetch_post("category.upload", form_data, true);
                if ("status" in info) {
                    new AlertPopup(info.status, info.msg);
                    return false
                }
                // Prepare form for seconde phase, show columns to select key, show existing categories
                const file_name_field = bform.element("tickoff-file-name");
                file_name_field.hidden = false;
                file_name_field.innerHTML += info.data.filename;
                let column_template = [];
                let data = {};
                info.data.column.unshift("NVT")
                for (const field of meta.type[type].import) {
                    column_template.push([{type: "select", label: field, name: field, class: "column-select"}, {type: "input", label: "v.b.", id: field}]);
                    meta.option[field] = info.data.column.map(c => ({value: c, label: c}))
                    data[field] = info.data.column[0];
                }
                bform.show("phase2-group");
                bform.add(bform.form.querySelector("div.select-columns"), column_template);
                bform.populate(data, meta);
                bform.form.querySelectorAll(".column-select").forEach(c => {
                    c.addEventListener("change", e => bform.element(e.target.name).value = info.data.data[e.target.value]);
                    c.dispatchEvent(new Event("change"));
                });
                const data2 = {category_select: ""};
                const options = [{value: "none", label: ""}].concat(meta.category[type] ? meta.category[type].map(c => ({label: c, value: c})) : []);
                bform.populate(data2, {option: {category_select: options}});
                // process data button is pushed, i.e. with the key (from the columns) process the file, list not find items and list them
                bform.element("process-data-button").addEventListener("click", async e => {
                    e.preventDefault();
                    const form_data = bform.get_data();
                    form_data.stage = 2;
                    form_data.type = type;
                    form_data.filename = form_data.tickoff_file.name;
                    delete form_data.tickoff_file;
                    const ret = await fetch_update("category.upload", form_data);
                    // Show stage 3, i.e. the file is processed and non found items are listed
                    bform.show("phase3-group");
                    const list = bform.element("entries-not-found");
                    let id2person = {};
                    let id2pd = {};
                    if (ret) {
                        if (ret.tbc.length === 0 && ret.found.length === 0) {
                            list.innerHTML = "<b>Fout, geen deelnemer gevonden</b>";

                        } else if (ret.tbc.length > 0) {
                            list.innerHTML = "<b>Niet gevonden:</b>";
                            let id = 0;
                            ret.tbc.forEach(e => {
                                list.innerHTML += `<br><input type="checkbox" data-person-id=${id} checked>&nbsp;${e.pd.key_fields.map(i => e.pd.data[i]).join(" ")} -> ${e.person.key_fields.map(i => e.person.data[i]).join(" ")}`;
                                id2person[id] = e.person.data;
                                id2pd[id] = e.pd.data;
                                id++;
                            });
                        } else {
                            list.innerHTML = "<b>Geen fouten gevonden</b>";
                        }
                    }
                    // save button is pushed, the file is processed again and stored in the database.
                    bform.element("save-data-button").addEventListener("click", async e => {
                        e.preventDefault();
                        // No category selected or filled in
                        const form_data = bform.get_data();
                        if (form_data.category === "" && form_data.category_select === "none") {
                            new AlertPopup("error", "Gelieve een evenement te selecteren of een nieuwe in te typen aub.");
                            return
                        }
                        form_data.stage = 3;
                        form_data.not_found = []
                        Array.from(document.querySelectorAll("[data-person-id]")).forEach(c => {
                            if (c.checked)
                                ret.found.push(id2person[c.dataset.personId])
                            else
                                form_data.not_found.push(id2pd[c.dataset.personId])
                        });
                        form_data.found = ret.found;
                        form_data.filename = form_data.tickoff_file.name;
                        delete form_data.tickoff_file;
                        form_data.type = type;
                        if (form_data.category === "") {
                            form_data.category = form_data.category_select;
                            await fetch_delete("category.upload", {category: form_data.category, type});
                        }
                        await fetch_update("category.upload", form_data);
                        const category_options = document.getElementById("filter-label");
                        const option = document.createElement("option");
                        option.text = form_data.category;
                        option.value = form_data.category;
                        category_options.add(option, null);
                        category_options.value = form_data.category;
                        category_options.dispatchEvent(new Event("change"));
                    });
                });
            })
        },
    });
}

const update_person_template =
    [
        {tag: "link", href: "static/css/form.css", rel: "stylesheet"},
        {tag: "link", href: "https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/css/select2.min.css", rel: "stylesheet"},
        {tag: "script", src: "https://cdn.jsdelivr.net/npm/select2@4.0.13/dist/js/select2.min.js"},
        {type: "select", label: "Nieuwe deelnemer", id: "person-select", name: "person", style: "width:90%;"},
    ]

const __update_person = async ids => {
    const new_person = ids === null;
    const bform = new BForms(update_person_template);
    let title = "Nieuwe deelnemer";
    if (!new_person) {
        const row = datatable_row_data_from_id(ids[0]);
        title = `Huidige deelnemer: ${row.naam} ${row.voornaam}`;
    }
    bootbox.dialog({
        title,
        message: bform.form,
        buttons: {
            confirm: {
                label: "Bewaar",
                className: "btn-primary",
                callback: async () => {
                    const person_select = $("#person-select");
                    const persons = await fetch_get("person.person", {filters: `id$=$${person_select.select2("data")[0].id}`})
                    if (persons.length > 0) {
                        const person = persons[0];
                        if (new_person) {
                            const type = document.getElementById("filter-type").value;
                            const label = document.getElementById("filter-label").value;
                            await fetch_post("category.category", {naam: person.naam, voornaam: person.voornaam, klas: person.klas, klasgroep: person.klasgroep, rfid: person.rfid, type, label})
                        } else {
                            await fetch_update("category.category", {id: ids[0], naam: person.naam, voornaam: person.voornaam, klas: person.klas, klasgroep: person.klasgroep, rfid: person.rfid})
                        }
                        datatable_reload_table();
                    }

                }
            },
            cancel: {
                label: "Annuleer", className: "btn-secondary", callback: async () => {
                }
            },
        },
        onShown: async () => {
            const person_select = $("#person-select");
            const persons = await fetch_get("person.person");
            if (persons.length > 0) {
                if (person_select.hasClass("select2-hidden-accessible")) await person_select.empty().select2('destroy').trigger("change")
                const person_options = persons.map(p => ({id: p.id, text: `${p.naam} ${p.voornaam} ${p.klasgroep}`}));
                let select2_config = {data: person_options, width: "resolve", dropdownParent: bform.form};
                await person_select.select2(select2_config);
            }
        },
    });
}

const update_rfid_template =
    [
        {tag: "link", href: "static/css/form.css", rel: "stylesheet"},
        {type: "input", label: "Huidige badge", id: "old-rfid-input"},
        {type: "input", label: "Nieuwe badge", id: "new-rfid-input"},
    ]

const __update_rfid = async ids => {
    const categories = await fetch_get("category.category", {filters: `id$=$${ids[0]}`});
    const category = categories[0];
    const bform = new BForms(update_rfid_template);

    bootbox.dialog({
        title: `Scan de badge aub`,
        message: bform.form,
        buttons: {
            confirm: {
                label: "Bewaar",
                className: "btn-primary",
                callback: async () => {
                    await fetch_update("category.category", {id: ids[0], rfid: bform.element("new-rfid-input").value})
                    datatable_reload_table();
                }
            },
            cancel: {
                label: "Annuleer", className: "btn-secondary", callback: async () => {
                }
            },
        },
        onShown: async () => {
            const old_rfid_input = bform.element("old-rfid-input");
            const new_rfid_input = bform.element("new-rfid-input");
            old_rfid_input.value = category.rfid;

            new_rfid_input.focus();
            new_rfid_input.addEventListener("keyup", e => {
                e.preventDefault();
                if (e.key === "Enter") {
                    const [valid_code, code] = badge_raw2hex(e.target.value);
                    if (valid_code) {
                        new_rfid_input.value = code;
                    }
                }
            })

        },
    });

}


const button_menu_items = [
    {
        type: 'button',
        id: 'import-category',
        label: 'Deelnemers inladen',
        cb: () => __upload_tickoff_file(document.getElementById("filter-type").value)
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
        label: 'Evenement',
        persistent: true,
        depends: "filter-type"
    },
]

const __person_delete = async (ids) => {
    bootbox.confirm("Wilt u deze deelnemer(s) verwijderen?", async result => {
        if (result) {
            await fetch_delete("category.category", {ids})
            datatable_reload_table();
        }
    });
}

const context_menu_items = [
    {type: "item", label: 'Badgecode aanpassen', iconscout: 'wifi', cb: ids => __update_rfid(ids)},
    {type: "item", label: 'Deelnemer aanpassen', iconscout: 'pen', cb: ids => __update_person(ids)},
    {type: "item", label: 'Nieuwe deelnemer', iconscout: 'plus-circle', cb: ids => __update_person(null)},
    {type: "item", label: 'Deelnemer(s) verwijderen', iconscout: 'trash-alt', cb: __person_delete},
]


$(document).ready(function () {
    const url_args = new URLSearchParams(window.location.search);
    const type = url_args.get("type") || meta.default.type;
    for (const item of filter_menu_items) {
        if (item.id === "filter-type") {
            item.options = meta.option.type;
            item.default = type;
        } else if (item.id === "filter-label") {
            item.options = meta.category[type] ? meta.category[type].map(i => ({value: i, label: i})) : [{value: " ", label: " "}];
            item.default = meta.category[type] ? meta.category[type][0] : " ";
        }
    }
    datatables_init({button_menu_items, filter_menu_items, context_menu_items});
    document.getElementById("filter-type").addEventListener("change", e => {
        argument_set("type", e.target.value);
        window.location.href = Flask.url_for("category.show", {type: e.target.value});
    });
});
