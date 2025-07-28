import {datatables_init, datatable_reload_table, datatable_row_data_from_id, datatable_update_cell, datatable_row_add, datatable_filter, datatable_table_add} from "../datatables/dt.js";
import {fetch_get, fetch_update, now_iso_string} from "../common/common.js";
import {Rfid} from "../common/rfidusb.js";
import {socketio} from "../common/socketio.js";
import {AlertPopup} from "../common/popup.js";

const meta = await fetch_get("person.meta");
const lijsten_cache = Object.fromEntries(meta.lijsten.map(l => [l.id, l]));

const __update_filter = (id, value) => {
    if (value === "all") datatable_filter(id, "");
    else if (id === "lijst") {
            const label = lijsten_cache[parseInt(value)].name;
            datatable_filter(id, label);
    } else if (id === "klasgroep") {
        datatable_filter(id, value);
    }
}

const filter_menu_items = [
    {
        type: 'select',
        id: 'klasgroep',
        label: 'Klas',
        default: 'all',
        persistent: true,
        cb: value => __update_filter("klasgroep", value)
    },
    {
        type: 'select',
        id: 'lijst',
        label: 'Lijst',
        default: 'all',
        persistent: true,
        cb: value => __update_filter("lijst", value)
    },
]

// Called by the server when one or more items are updated in the list
const __socketio_update_items = (type, msg) => {
    if (msg.status) {
        for (const item of msg.data) {
            if ("checkin_time" in item) datatable_update_cell(item.id, "checkin_time", item.checkin_time);
        }
    }
}

$(document).ready(async function () {
    filter_menu_items.find(filter => filter.id === "klasgroep").options = [{value: "all", label: "Alles"}].concat(meta.klasgroepen.map(k => ({value: k, label: k})));
    filter_menu_items.find(filter => filter.id === "lijst").options = [{value: "all", label: "Alles"}, {value: "no-list", label: "Zonder lijst"}].concat(meta.lijsten.map(l => ({value: l.id.toString(), label: l.name})));
    let persons = await fetch_get("person.person", {});
    persons = persons.map(p => {
        p.row_action = p.id;
        p.DT_RowId = p.id;
        p.lijst = p.lijst_id in lijsten_cache ? lijsten_cache[p.lijst_id].name : "NVT";
        return p
    });
    const initial_data = persons.length > 0 ? persons : [];
    datatables_init({filter_menu_items, initial_data});

    Rfid.init(meta.rfidusb);
    Rfid.set_location("checkin");
    Rfid.set_managed_state(true);

    // Even on the checkin page, it is possible to get status-popups
    socketio.subscribe_to_room(meta.my_ip);
    socketio.subscribe_to_room("checkin");
    socketio.subscribe_on_receive("alert-popup", (type, data) => new AlertPopup("warning", data, 6000));
    socketio.subscribe_on_receive("update-items-in-list-of-checkins", __socketio_update_items);

    // In case multiple tabs/browsers to this page are opened, the Rfid-location (checkin) is set the one that is in focus.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) Rfid.set_location("checkin");
    });
});

