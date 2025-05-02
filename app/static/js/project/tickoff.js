import {datatable_row_data_from_id, datatables_init, datatable_reload_table} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update, fetch_delete} from "../common/common.js";
import {BForms} from "../common/BForms.js";
import {AlertPopup} from "../common/popup.js";
import {badge_raw2hex} from "../common/rfid.js";
import {argument_set} from "../base.js";

let meta = await fetch_get("tickoff.meta");
let dt = null;

const __filter_type_cb = (value) => {
    argument_set("type", value);
    window.location.href = Flask.url_for("tickoff.show", {type: value});
}

const __filter_category_cb = (category_id) => {
    const type_id = document.getElementById("filter-type").value;
    if (type_id in meta.tickoff && category_id in meta.tickoff[type_id]) {
        const tickoffs = meta.tickoff[type_id][category_id];
        const tickoff_options = tickoffs.map(t => ({label: t, value: t}));
        dt.filter_menu.filter_update({id: "filter-tickoff", options: tickoff_options, default: tickoff_options[0].value});
    } else {
        dt.filter_menu.filter_update({id: "filter-tickoff", options: [{label: " ", value: " "}], default: " "});

    }
}


const filter_menu_items = [
    {
        type: 'select',
        id: 'filter-type',
        label: 'Type',
        persistent: false,
        invalidate: ["filter-category", "filter-tickoff"],
        cb: __filter_type_cb
    },
    {
        type: 'select',
        id: 'filter-category',
        label: 'Evenement',
        persistent: true,
        cb: __filter_category_cb
    },
    {
        type: 'select',
        id: 'filter-tickoff',
        label: 'Sessie',
        options: [{value: " ", label: " "}],
        default: " ",
        persistent: true,
    },

]

$(document).ready(function () {
    dt = datatables_init();
    const stored_values = dt.filter_menu.store_get();
    const url_args = new URLSearchParams(window.location.search);
    const type = url_args.get("type") || meta.default.type;
    const categories = meta.tickoff[type] ? Object.entries(meta.tickoff[type]).map(c => c[0]) : null;
    const tickoffs = categories && meta.tickoff[type][categories[0]] ? meta.tickoff[type][categories[0]] : null;
    for (const item of filter_menu_items) {
        if (item.id === "filter-type") {
            item.options = Object.entries(meta.type).map(([k, v]) => ({label: v.label, value: k}));
            item.default = type;
        } else if (item.id === "filter-category") {
            item.options = categories ? categories.map(i => ({value: i, label: i})) : [{value: " ", label: " "}];
            item.default = item.options[0];
        } else if (item.id === "filter-tickoff") {
            item.options = tickoffs ? tickoffs.map(i => ({value: i, label: i})) : [{value: " ", label: " "}];
            item.default = item.options[0];
        }
    }
    // __set_tickoff_filter(document.getElementById("filter-category").value);
});
