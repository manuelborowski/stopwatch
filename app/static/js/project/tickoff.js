import {datatable_row_data_from_id, datatables_init, datatable_reload_table} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, fetch_delete} from "../common/common.js";
import {BForms} from "../common/BForms.js";
import {AlertPopup} from "../common/popup.js";
import {badge_raw2hex} from "../common/rfid.js";
import {argument_set} from "../base.js";

let meta = await fetch_get("tickoff.meta");

const __reload_page = (value) => {
    argument_set("type", value);
    window.location.href = Flask.url_for("tickoff.show", {type: value});
}

const filter_menu_items = [
    {
        type: 'select',
        id: 'filter-type',
        label: 'Type',
        persistent: false,
        invalidate: ["filter-label"],
        cb: __reload_page
    },
    {
        type: 'select',
        id: 'filter-label',
        label: 'Evenement',
        persistent: true,
    },
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
    datatables_init({filter_menu_items});
});
