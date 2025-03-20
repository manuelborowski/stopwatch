import {busy_indication_off, busy_indication_on, fetch_get, fetch_post, fetch_update, form_populate} from "../common/common.js";
import {base_init} from "../base.js";
import {create_html} from "../common/forms.js";

const meta = await fetch_get("settings2.meta")

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
            await fetch_update("settings2.setting", data)
        });
    });
}

const template =
    [
        {
            label: "Templates", rows: [
                {label: "Gebruikers", name: "user-datatables-template", type: "textarea"},
                {label: "Personen", name: "person-datatables-template", type: "textarea"},
            ]
        },
        {
            label: "Modules", save: false, rows: [
                {
                    label: "Algemeen", rows: [
                        [{label: "Nieuwe gebruikers mogen via Smartschool aanmelden?", name: "generic-new-via-smartschool", type: "check"}],
                        [{label: "Nieuwe gebruikers, standaard niveau", name: "generic-new-via-smartschool-default-level", type: "select"}],
                    ]
                },
                {
                    label: "Cron", rows: [
                        [{label: "Cron template", name: "cron-scheduler-template", type: "input"}],
                        [{label: "Start cron cyclus?", id: "display-button-start-cron-cycle", type: "check", save: false},
                            {label: "Start", id: "button-start-cron-cycle", type: "button", save: false}],
                        {id: "cron-enable-modules", type: "div"},

                    ]
                }
            ]
        }
    ]

const __create_html_page = () => {
    const __populate_setting = async () => {
        const settings = await fetch_get("settings2.setting");
        if (settings && settings.data) {
            form_populate(settings.data, meta);
        }
    }

    const __init_collapsible_containers = () => {
        document.querySelectorAll(".collapsible").forEach(c => {
            c.addEventListener("click", e => {
                e.target.classList.toggle("active");
                const content = e.target.nextElementSibling;
                content.style.display = content.style.display === "block" ? "none" : "block";
            });
        });
        // Start cron cycle manually
        const cron_start_button = document.getElementById("button-start-cron-cycle");
        cron_start_button.hidden = true;
        document.getElementById("display-button-start-cron-cycle").addEventListener("click", e => {
            cron_start_button.hidden = !e.target.checked;
        });
        cron_start_button.addEventListener("click", async e => {
            e.preventDefault();
            await fetch_post("settings2.button", {id: e.target.id});
        });
    }

    const form = document.createElement("form");
    create_html(form, template);
    document.querySelector(".container-form").appendChild(form);
    let cron_modules_template = []
    for (const module of meta.cron_table) cron_modules_template.push({label: module.label, name: module.id, type: "check", save: false, class: "cron-modules"})
    create_html(document.getElementById("cron-enable-modules"), cron_modules_template)
    form_populate(meta.cron_enable_modules);
    __init_collapsible_containers();
    __populate_setting();

}

$(document).ready(function () {
    __create_html_page();
    __handle_save();
    base_init({});
});

