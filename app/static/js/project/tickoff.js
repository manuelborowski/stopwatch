import {datatable_row_data_from_id, datatables_init, datatable_reload_table} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, fetch_delete} from "../common/common.js";
import {BForms} from "../common/BForms.js";
import {AlertPopup} from "../common/popup.js";
import {badge_raw2hex} from "../common/rfid.js";
import {argument_set} from "../base.js";

let meta = await fetch_get("tickoff.meta");
let dt = null;

const __reload_page = (value) => {
    argument_set("type", value);
    window.location.href = Flask.url_for("tickoff.show", {type: value});
}

const filter_menu_items = [
    {
        type: 'select',
        id: 'filter-type',
        label: 'Type',
        trigger: ["filter-category"],
        cb: __reload_page
    },
    {
        type: 'select',
        id: 'filter-category',
        label: 'Evenement',
        source: {id: ["filter-type"]},
        trigger: ["filter-tickoff"],
        persistent: true,
    },
    {
        type: 'select',
        id: 'filter-tickoff',
        label: 'Sessie',
        source: {id: ["filter-type", "filter-category"]},
        persistent: true,
    },

]

const __new_registration = async ids => {
    const row = datatable_row_data_from_id(ids[0]);
    bootbox.confirm(`Nieuwe registratie voor ${row.naam} ${row.voornaam}?`, async result => {
        if (result) {
            const now = new Date();
            const iso_now = now.toJSON().substring(0, 19).replace(/T../, ` ${now.getHours()}`);
            await fetch_update("tickoff.tickoff", {timestamp: iso_now, id: ids[0]});
            datatable_reload_table();
        }
    });
}

const context_menu_items = [
    {type: "item", label: 'Nieuwe registratie', iconscout: 'wifi', cb: ids => __new_registration(ids)},
]

const __delete_tickoff = () => {
    bootbox.confirm(`Wilt u deze sessie verwijderen?`, async result => {
        if (result) {
            const type = document.getElementById("filter-type").value;
            const category = document.getElementById("filter-category").value;
            const tickoff = document.getElementById("filter-tickoff").value;
            await fetch_delete("tickoff.tickoff", {type, category, tickoff});
            datatable_reload_table();
        }
    });

}

const button_menu_items = [
    {
        type: 'button',
        id: 'delete-tickoff',
        label: 'Verwijder sessie',
        cb: () => __delete_tickoff(),
    },
]

$(document).ready(function () {
    const url_args = new URLSearchParams(window.location.search);
    const type = url_args.get("type") || meta.default.type;
    for (const item of filter_menu_items) {
        if (item.id === "filter-type") {
            item.options = meta.option.type;
            item.default = type;
        } else if (item.id === "filter-category") {
            let source_options = {};
            for (const type of Object.entries(meta.tickoff)) {
                source_options[type[0]] = Object.entries(type[1]).map(e => ({value: e[0], label: e[0]}))
            }
            item.source["options"] = source_options;
        } else if (item.id === "filter-tickoff") {
            let source_options = JSON.parse(JSON.stringify(meta.tickoff));
            for (const type of Object.entries(source_options))
                for (const category of Object.entries(type[1]))
                    source_options[type[0]][category[0]] = category[1].map(e => ({value: e, label: e}))
            item.source["options"] = source_options;
        }
    }
    datatables_init({filter_menu_items, context_menu_items, button_menu_items});
});
