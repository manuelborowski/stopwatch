import {datatables_init, datatable_reload_table} from "../datatables/dt.js";
import {fetch_post, fetch_get, fetch_update, fetch_delete} from "../common/common.js";
import {BForms} from "../common/BForms.js";
import {badge_raw2hex} from "../common/rfid.js";

const template_add =
    [
        {tag: "link", href: "static/css/form.css", rel: "stylesheet"},
        {
            format: "vertical-center", rows: [
                {type: "check", label: "Auto increment label?", name: "auto_increment", id: "auto-increment-check"},
                {type: "input", label: "Nummer", name: "label", id: "id-field"},
                {type: "input", label: "Rfid", name: "rfid", id: "rfid-field"},
            ]
        }
    ]


const __badge_add = async (default_id = null, default_auto_increment = false) => {
    const bform = new BForms(template_add);

    bootbox.dialog({
        title: "Nieuwe badge(s)",
        message: bform.form,
        buttons: {
            confirm: {
                label: "Bewaar",
                className: "btn-primary",
                callback: async () => {
                    const form_data = bform.get_data();
                    const label = parseInt(form_data.label);
                    if (isNaN(label)) {
                        new AlertPopup("warning", "Het veld 'Nummer' moet een getal zijn.")
                    } else {
                        const resp = await fetch_post("spare.spare", form_data);
                        datatable_reload_table();
                        if (resp && form_data.auto_increment) {
                            await __badge_add(label + 1, form_data.auto_increment);
                        }
                    }
                }
            },
            cancel: {
                label: "Annuleer", className: "btn-secondary", callback: async () => {
                }
            },
        },
        onShown: async () => {
            const rfid_field = bform.element('rfid-field');
            const id_field = bform.element('id-field');
            rfid_field.focus();
            rfid_field.addEventListener('keypress', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    const [valid_code, code] = badge_raw2hex(rfid_field.value);
                    if (valid_code) {
                        rfid_field.value = code;
                        document.querySelector('.bootbox .btn-primary').click(); // Trigger the Submit button
                    }
                }
            });
            setTimeout(() => {
                bform.element("auto-increment-check").checked = default_auto_increment;
                if (default_id) {
                    id_field.value = default_id;
                    id_field.dispatchEvent(new Event("input"));
                }
            }, 100);
            rfid_field.value = "";
        },
    });
}

const __badge_delete = async (ids) => {
    bootbox.confirm("Wilt u deze badge(s) verwijderen?", async result => {
        if (result) {
            await fetch_delete("spare.spare", {ids})
            datatable_reload_table();
        }
    });
}

const context_menu_items = [
    {type: "item", label: 'Nieuwe badge', iconscout: 'plus-circle', cb: ids => __badge_add()},
    {type: "item", label: 'Badge(s) verwijderen', iconscout: 'trash-alt', cb: __badge_delete},
]

const filter_menu_items = [
    {
        type: 'select',
        id: 'user-type',
        label: 'Type',
        options: [{value: "all", label: "Alles"}, {value: "local", label: "local"}, {value: "oauth", label: "oauth"}],
        default: 'all',
        persistent: true
    },
    {
        type: 'select',
        id: 'user-level',
        label: 'Niveau',
        options: [{value: "all", label: "Alles"}, {value: "1", label: "gebruiker"}, {value: "3", label: "secretariaat"}, {value: "4", label: "secretariaat+"},
            {value: "5", label: "admin"}],
        default: 'all',
        persistent: false
    },
]

$(document).ready(function () {
    datatables_init({context_menu_items});
});
