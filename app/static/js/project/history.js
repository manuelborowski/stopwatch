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
    let incident_ids = await fetch_get("incident.incident", {fields: "id", filters: "id$>$0"});
    filter_menu_items.filter((e, i, a) => {
        if (e.id === "incident-id" && incident_ids && incident_ids.length > 0) {
            a[i].options = [{value: "all", label: "Alles"}].concat(incident_ids.map(e =>  ({label: e.id, value: e.id})));
            a[i].default = "all";
            return true
        }
        return false;
    });
    datatables_init({filter_menu_items});
});
