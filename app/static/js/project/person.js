import {datatables_init, datatable_reload_table} from "../datatables/dt.js";
import {fetch_post, fetch_get, fetch_update, fetch_delete} from "../common/common.js";

const meta = await fetch_get("person.meta");

// Some filters are mutually exclusive (they overlap), i.e. when a filter is set to a not-all value, other filters need to be set to the all-value
const __filter_helper = (id, value) => {
    const constraints = {
        deelschool: ["klasgroep", "lijst"],
        graad: ["jaar", "klasgroep", "lijst"],
        jaar: ["graad", "klasgroep", "lijst"],
        klasgroep: ["graad", "jaar", "deelschool", "lijst"],
        geslacht: ["lijst"],
        lijst: ["graad", "jaar", "deelschool", "klasgroep", "geslacht"],
    }
    if (id in constraints && value !== "all") {
        for (const filter of constraints[id]) {
            const element = document.getElementById(filter);
            element.value = "all";
            element.dispatchEvent(new Event("change"));
        }
    }
}

const filter_menu_items = [
    {
        type: 'select',
        id: 'deelschool',
        label: 'School',
        options: [{value: "all", label: "Alles"}, {value: "sum", label: "SUM"}, {value: "sui", label: "SUI"}, {value: "sul", label: "SUL"}],
        default: 'all',
        persistent: true,
        cb: value => __filter_helper("deelschool", value)
    },
    {
        type: 'select',
        id: 'graad',
        label: 'Graad',
        options: [{value: "all", label: "Alles"}, {value: "1", label: "1ste"}, {value: "2", label: "2de"}, {value: "3", label: "3de"}],
        default: 'all',
        persistent: true,
        cb: value => __filter_helper("graad", value)
    },
    {
        type: 'select',
        id: 'jaar',
        label: 'Jaar',
        options: [{value: "all", label: "Alles"}, {value: "1", label: "1"}, {value: "2", label: "2"}, {value: "3", label: "3"}, {value: "4", label: "4"}, {value: "5", label: "5"}, {
            value: "6", label: "6"
        }],
        default: 'all',
        persistent: true,
        cb: value => __filter_helper("jaar", value)
    },
    {
        type: 'select',
        id: 'klasgroep',
        label: 'Klas',
        options: [{value: "all", label: "Alles"}],
        default: 'all',
        persistent: true,
        cb: value => __filter_helper("klasgroep", value)
    },
    {
        type: 'select',
        id: 'geslacht',
        label: 'Geslacht',
        options: [{value: "all", label: "Alles"}, {value: "V", label: "V"}, {value: "M", label: "M"},],
        default: 'all',
        persistent: true,
        cb: value => __filter_helper("geslacht", value)
    },
    {
        type: 'select',
        id: 'lijst',
        label: 'Lijst',
        options: [{value: "all", label: "Alles"}],
        default: 'all',
        persistent: true,
        cb: value => __filter_helper("lijst", value)
    },
]

const __add_to_list = ids => {
    bootbox.prompt({
        title: 'Deelnemers toevoegen aan een lijst',
        inputType: 'select',
        inputOptions: [{text: "kies een lijst", value: ""}].concat(meta.lijsten.map(l => ({text: l.name, value: l.id}))),
        callback: async result => {
            console.log(result);
            if (!(["", null].includes(result))) {
                await fetch_update("person.person", ids.map(i => ({id: i, lijst_id: parseInt(result)})));
                datatable_reload_table();
            }
        }
    });
}

const __delete_from_list = async (ids) => {
    bootbox.confirm("Deelnemers verwijderen van lijst", async result => {
        if (result) {
            await fetch_update("person.person", ids.map(i => ({id: i, lijst_id: null})));
            datatable_reload_table();
       }
    });
}

const context_menu_items = [
    {type: "item", label: 'Toevoegen aan lijst', iconscout: 'plus-circle', cb: ids => __add_to_list(ids)},
    {type: "item", label: 'Verwijderen van lijst', iconscout: 'trash-alt', cb: ids => __delete_from_list(ids)},
]

$(document).ready(function () {
    filter_menu_items.find(filter => filter.id === "klasgroep").options = [{value: "all", label: "Alles"}].concat(meta.klasgroepen.map(k => ({value: k, label: k})));
    filter_menu_items.find(filter => filter.id === "lijst").options = [{value: "all", label: "Alles"}].concat(meta.lijsten.map(l => ({value: l.id, label: l.name})));
    datatables_init({filter_menu_items, context_menu_items});
});
