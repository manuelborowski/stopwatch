import { FormioPopup } from "../common/popup.js"
import {ContextMenu} from "../common/context_menu.js";
import {get_ids_of_selected_items} from "../datatables/dt.js";

const user_add = async (ids) => {
    new FormioPopup().init(popups.user_password_form, async (action, opaque, data = null) => {
        if (action === 'submit') {
            const ret = await fetch(Flask.url_for('api.user_add'), {headers: {'x-api-key': api_key,}, method: 'POST', body: JSON.stringify(data),});
            const status = await ret.json();
            if (status.status) {
                bootbox.alert(`Gebruiker ${data.username} is toegevoegd`)
            } else {
                bootbox.alert(status.data)
            }
            ctx.reload_table();
        }
    }, {"new_password": true})
}

const user_update = async (ids) => {
    const ret = await fetch(Flask.url_for('api.user_get', {id: ids[0]}), {headers: {'x-api-key': api_key,}});
    const status = await ret.json();
    if (status.status) {
        formio_popup_create(ctx.popups.user_password_form, async (action, opaque, data = null) => {
            if (action === 'submit') {
                const ret = await fetch(Flask.url_for('api.user_update'), {headers: {'x-api-key': api_key,}, method: 'POST', body: JSON.stringify(data),});
                const status = await ret.json();
                if (status.status) {
                    bootbox.alert(`Gebruiker ${data.username} is aangepast`)
                } else {
                    bootbox.alert(status.data)
                }
                ctx.reload_table();
            }
        }, status.data)
    } else {
        bootbox.alert(status.data)
    }
}


const users_delete = async (ids) => {
    bootbox.confirm("Wilt u deze gebruiker(s) verwijderen?", async result => {
        if (result) {
                const ret = await fetch(Flask.url_for('api.user_delete'), {headers: {'x-api-key': api_key,}, method: 'POST', body: JSON.stringify(ids),});
                const status = await ret.json();
                if (status.status) {
                    bootbox.alert(`Gebruiker(s) is/zijn verwijderd.`)
                } else {
                    bootbox.alert(status.data)
                }
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
