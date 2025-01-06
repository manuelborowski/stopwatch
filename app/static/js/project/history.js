import {datatables_init} from "../datatables/dt.js";
import {fetch_get} from "../common/common.js";

const filter_menu_items = [
    {
        type: 'select',
        id: 'incident-id',
        label: 'Incident',
        persistent: true
    },
]

$(document).ready(async () => {
    let incident_options = await fetch_get("history.incident_option");
    filter_menu_items.filter((e, i, a) => {
        if (e.id === "incident-id") {
            a[i].options = incident_options.options;
            a[i].default = incident_options.default;
            return true
        }
        return false;
    });
    datatables_init({filter_menu_items});
});
