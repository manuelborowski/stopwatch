import {FormioPopup} from "../common/popup.js"
import {ctx, datatables_init} from "../datatables/dt.js";
import {fetch_post, fetch_get} from "../common/common.js";

const __user_add = async (ids) => {
    const user_popup = await fetch_get("api.popup_get", {id: "popup-new-update-user"})
    if (user_popup) {
        new FormioPopup().init({
            template: user_popup.template,
            cb: async (action, opaque, data = null) => {
                if (action === 'submit') {
                    await fetch_post("api.user_add", data);
                    ctx.reload_table();
                }
            },
            defaults: {"new_password": true, "password": "", "confirm_password": ""}
        });
    }
}

const __user_update = async (ids) => {
    const user_popup = await fetch_get("api.popup_get", {id: "popup-new-update-user", "user_id": ids[0]})
    if (user_popup) {
         new FormioPopup().init({
            template: user_popup.template,
            cb: async (action, opaque, data = null) => {
                if (action === 'submit') {
                    await fetch_post("api.user_update", data);
                    ctx.reload_table();
                }
            },
            defaults: user_popup.defaults.user
        });
    }
}

const __users_delete = async (ids) => {
    bootbox.confirm("Wilt u deze gebruiker(s) verwijderen?", async result => {
        if (result) {
            await fetch_post("api.user_delete", ids)
            ctx.reload_table();
        }
    });
}

const context_menu_items = [
    {type: "item", label: 'Nieuwe gebruiker', iconscout: 'plus-circle', cb: __user_add},
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
    datatables_init({context_menu_items, filter_menu_items});
});
