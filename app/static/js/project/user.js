import { FormioPopup } from "../common/popup.js"
import {ctx, datatables_init} from "../datatables/dt.js";
import {TimedPopup} from "../common/popup.js";
import {api_post, api_get} from "../common/common.js";

const __user_add = async (ids) => {
    new FormioPopup().init(popups.user_password_form, async (action, opaque, data = null) => {
        if (action === 'submit') {
            const response = await api_post("user_add", data);
            new TimedPopup(response.status, response.data)
            ctx.reload_table();
        }
    }, {"new_password": true, "password": "", "confirm_password": ""})
}

const __user_update = async (ids) => {
    const response = await api_get("user_get", {id:ids[0]});
    if (response.status) {
        new FormioPopup().init(ctx.popups.user_password_form, async (action, opaque, data = null) => {
            if (action === 'submit') {
                const response = await api_post("user_update", data);
                new TimedPopup(response.status, response.data)
                ctx.reload_table();
            }
        }, response.data)
    } else {
        new TimedPopup("red", response.data);
    }
}

const __users_delete = async (ids) => {
    bootbox.confirm("Wilt u deze gebruiker(s) verwijderen?", async result => {
        if (result) {
            const response = await api_post("user_delete", ids)
            new TimedPopup(response.status, response.data)
            ctx.reload_table();
        }
    });
}

const context_menu_items = [
    {type: "item", label: 'Nieuwe gebruiker',iconscout: 'plus-circle', cb: __user_add},
    {type: "item", label: 'Gebruiker aanpassen', iconscout: 'pen', cb: __user_update},
    {type: "item", label: 'Gebruiker(s) verwijderen', iconscout: 'trash-alt', cb: __users_delete},
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
    datatables_init(context_menu_items, filter_menu_items);
});
