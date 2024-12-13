import { FormioPopup } from "../common/popup.js"
import {ContextMenu} from "../common/context_menu.js";
import {get_ids_of_selected_items, ctx} from "../datatables/dt.js";
import {TimedPopup} from "../common/popup.js";
import {api_post, api_get} from "../common/common.js";

const user_add = async (ids) => {
    new FormioPopup().init(popups.user_password_form, async (action, opaque, data = null) => {
        if (action === 'submit') {
            const response = await api_post("user_add", data);
            new TimedPopup(response.status, response.data)
            ctx.reload_table();
        }
    }, {"new_password": true, "password": "", "confirm_password": ""})
}

const user_update = async (ids) => {
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


const users_delete = async (ids) => {
    bootbox.confirm("Wilt u deze gebruiker(s) verwijderen?", async result => {
        if (result) {
            const response = await api_post("user_delete", ids)
            new TimedPopup(response.status, response.data)
            ctx.reload_table();
        }
    });
}


$(document).ready(function () {
    let menu = [
        {type: "item", label: 'Nieuwe gebruiker',iconscout: 'plus-circle', cb: user_add},
        {type: "item", label: 'Gebruiker aanpassen', iconscout: 'pen', cb: user_update},
        {type: "item", label: 'Gebruiker(s) verwijderen', iconscout: 'trash-alt', cb: users_delete},
]
    const context_menu = new ContextMenu(document.querySelector("#datatable"), menu);
    context_menu.subscribe_get_ids(get_ids_of_selected_items);
});
