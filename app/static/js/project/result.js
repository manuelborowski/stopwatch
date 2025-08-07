import {datatables_init, datatable_update_cell, datatable_filter, datatable_rows_delete, datatable_rows_add} from "../datatables/dt.js";
import {fetch_get, fetch_update} from "../common/common.js";
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

const __milliseconds2string = ms => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    // Pad with zeros
    const pad = (n, z = 2) => n.toString().padStart(z, '0');
    const padMs = (n) => n.toString().padStart(3, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${padMs(milliseconds)}`;
}

// To facilitate adding and removing persons
const person_cache = {};

const __create_person_cache = persons => {
    for (const person of persons) {
        const list_id = person.lijst_id;
        if (!person_cache[list_id]) {
            person_cache[list_id] = [];
        }
        person_cache[list_id].push(person);
    }
    for (const list_id in person_cache) {
        person_cache[list_id].sort((a, b) => a.result_time - b.result_time);
        person_cache[list_id].forEach((p, index) => {
            p.place = index + 1;
            p.row_action = p.id;
            p.DT_RowId = p.id;
            p.lijst = p.lijst_id in lijsten_cache ? lijsten_cache[p.lijst_id].name : "NVT";
            p.result_time = __milliseconds2string(p.result_time);
        });
    }
}

const __add_person_to_cache = person => {
    const list_id = person.lijst_id;
    if (!person_cache[list_id]) person_cache[list_id] = [];
    person_cache[list_id].push(person);
    person.place = person_cache[list_id].length;
    person.row_action = person.id;
    person.DT_RowId = person.id;
    person.lijst = person.lijst_id in lijsten_cache ? lijsten_cache[person.lijst_id].name : "NVT";
    person.result_time = __milliseconds2string(person.result_time);
}

const __delete_persons_from_cache = persons => {
    const lijst_ids = [];
    for (const person of persons) {
        const index = person_cache[person.lijst_id].findIndex(p => person.id === p.id);
        person_cache[person.lijst_id].splice(index, 1);
        lijst_ids.push(person.lijst_id);
    }
    for (const list_id of [...new Set(lijst_ids)]) person_cache[list_id].forEach((p, index) => {
        p.place = index + 1;
        datatable_update_cell(p.id, "place", p.place);
    });
}

// Called by the server when one or more items are updated in the list
const __socketio_update_items = (type, msg) => {
    if (msg.status) {
        for (const item of msg.data) {
            if ("result_time" in item) datatable_update_cell(item.id, "result_time", __milliseconds2string(item.result_time));
        }
    }
}

// Called by the server when one item is added to the list
const __socketio_add_item = (type, msg) => {
    if (msg.status) {
        __add_person_to_cache(msg.data);
        datatable_rows_add([msg.data]);
    }
}

// Called by the server when items are removed from the list
const __socketio_delete_items = (type, msg) => {
    if (msg.status) {
        __delete_persons_from_cache(msg.data);
        datatable_rows_delete(msg.data.map(p => p.id));
    }
}

const __delete_result = async (ids) => {
    bootbox.confirm("Uitslag verwijderen?", async result => {
        if (result) {
            await fetch_update("person.person", {result_time: null, ids});
        }
    });
}

const context_menu_items = [
    {type: "item", label: 'Uitslag wissen', iconscout: 'trash-alt', cb: ids => __delete_result(ids), level: 2},
]

$(document).ready(async function () {
    filter_menu_items.find(filter => filter.id === "klasgroep").options = [{value: "all", label: "Alles"}].concat(meta.klasgroepen.map(k => ({value: k, label: k})));
    filter_menu_items.find(filter => filter.id === "lijst").options = [{value: "all", label: "Alles"}].concat(meta.lijsten.map(l => ({value: l.id.toString(), label: l.name})));
    let persons = await fetch_get("person.person", {filters: "result_time$!$null"});

    __create_person_cache(persons);

    const initial_data = persons.length > 0 ? persons : [];
    datatables_init({filter_menu_items, initial_data, context_menu_items});

    Rfid.init(meta.rfidusb);
    Rfid.set_location("result");
    Rfid.set_managed_state(true);

    // Even on the checkin page, it is possible to get status-popups
    socketio.subscribe_to_room(meta.my_ip);
    socketio.subscribe_to_room("result");
    socketio.subscribe_on_receive("alert-popup", (type, data) => new AlertPopup("warning", data, 6000));
    socketio.subscribe_on_receive("update-items-in-list-of-results", __socketio_update_items);
    socketio.subscribe_on_receive("add-item-to-list-of-results", __socketio_add_item);
    socketio.subscribe_on_receive("delete-items-from-list-of-results", __socketio_delete_items);

    // In case multiple tabs/browsers to this page are opened, the Rfid-location (checkin) is set the one that is in focus.
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) Rfid.set_location("result");
    });
});

