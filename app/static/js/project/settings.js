import {busy_indication_off, busy_indication_on, fetch_get, fetch_post, fetch_update} from "../common/common.js";
import {base_init} from "../base.js";
import {create_form, populate_form} from "../common/BForms.js";

const meta = await fetch_get("settings.meta")

const __handle_save = () => {
    document.querySelectorAll(".btn-save").forEach(b => {
        b.addEventListener("click", async e => {
            e.preventDefault();
            const form_data = Object.fromEntries(new FormData(e.target.closest("form")));
            // checkboxes are present only when selected and have the value "on" => convert
            document.querySelectorAll("input[type='checkbox']").forEach(c => form_data[c.name] = c.name in form_data)
            // Depending on the location of the save button pushed, a single setting is selected or all settings in a section
            const content = e.target.parentElement.closest("div")
            // Consider only the data depending on the save button pushed
            let data = {};
            content.querySelectorAll("[name]").forEach(n => data[n.name] = form_data[n.name]);
            // Process the (variable) list of cron modules (disable or enable)
            const cron_modules = Array.from(content.querySelectorAll(".cron-modules"));
            if (cron_modules.length > 0) data["cron-enable-modules"] = Object.fromEntries(cron_modules.map(m => [m.name, form_data[m.name]]));
            await fetch_update("settings.setting", data)
        });
    });
}

const template =
    [
        {
            type: "container", label: "Templates", save: true, default_collapsed: true, rows: [
                {label: "Gebruikers", name: "user-datatables-template", type: "textarea", save: true},
                {label: "Personen", name: "person-datatables-template", type: "textarea"},
                {label: "Categorieen", name: "category-datatables-template", type: "textarea"},
            ]
        },
        {
            type: "container", label: "Modules", default_collapsed: true, rows: [
                {
                    type: "container", label: "Algemeen", save: true, default_collapsed: true, rows: [
                        [{label: "Nieuwe gebruikers mogen via Smartschool aanmelden?", name: "generic-new-via-smartschool", type: "check"}],
                        [{label: "Nieuwe gebruikers, standaard niveau", name: "generic-new-via-smartschool-default-level", type: "select"}],
                    ]
                },
                {
                    type: "container", label: "Cron", save: true, default_collapsed: true, rows: [
                        [{label: "Cron template", name: "cron-scheduler-template", type: "input", save: true}],
                        [{label: "Start cron cyclus?", id: "display-button-start-cron-cycle", type: "check", save: false},
                            {label: "Start", id: "button-start-cron-cycle", type: "button", class: "btn btn-success"}],
                        {id: "cron-enable-modules", type: "div"},

                    ]
                },
                {
                    type: "container", label: "Afvink types", save: true, default_collapsed: true, rows: [
                        {label: "YAML", name: "tickoff-types", type: "textarea"},
                    ]
                },
            ]
        }
    ]

const __create_html_page = () => {
    const __populate_settings = async () => {
        const settings = await fetch_get("settings.setting");
        if (settings && settings.data) {
            populate_form(settings.data, meta);
        }
    }

    const __init_start_cron_button = () => {
        // Start cron cycle manually
        const cron_start_button = document.getElementById("button-start-cron-cycle");
        cron_start_button.hidden = true;
        document.getElementById("display-button-start-cron-cycle").addEventListener("click", e => {
            cron_start_button.hidden = !e.target.checked;
        });
        cron_start_button.addEventListener("click", async e => {
            e.preventDefault();
            await fetch_post("settings.button", {id: e.target.id});
        });
    }

    const form = document.createElement("form");
    create_form(form, template);
    document.querySelector(".container-form").appendChild(form);
    let cron_modules_template = []
    for (const module of meta.cron_table) cron_modules_template.push({label: module.label, name: module.id, type: "check", class: "cron-modules"})
    create_form(document.getElementById("cron-enable-modules"), cron_modules_template)
    populate_form(meta.cron_enable_modules);
    __init_start_cron_button();
    __populate_settings();

}

$(document).ready(function () {
    __create_html_page();
    __handle_save();
    base_init({});
});

