import {datatable_reload_table, datatable_row_data_from_id, datatables_init} from "../datatables/dt.js";
import {fetch_get, fetch_post, fetch_update} from "../common/common.js";
import {AlertPopup} from "../common/popup.js";
import {badge_raw2hex} from "../common/rfid.js";

const __dialog_new_single_lis_badge = async (default_id = null, default_auto_increment = false) => {
    const form = await fetch_get("lisbadge.form")
    if (form) {
        var new_badge = false;
        bootbox.dialog({
            title: "Nieuwe LIS-badge (* is vereist)",
            message: form.template,
            buttons: {
                confirm: {
                    label: 'Ok',
                    className: 'btn-primary',
                    callback: async () => {
                        const form_data = new FormData(document.getElementById("lis-badge-form"));
                        const data = Object.fromEntries(form_data)
                        const auto_increment = data.auto_increment === "on";
                        if (data.id === "" || data.rfid === "") {
                            new AlertPopup("warning", "'Badgenummer' en 'Rfid' moeten ingevuld zijn.")
                        } else {
                            data.id = parseInt(data.id);
                            if (isNaN(data.id)) {
                                new AlertPopup("warning", "Het veld 'Id' moet een getal zijn.")
                            } else {
                                let resp = null;
                                if (new_badge)
                                    resp = await fetch_post("lisbadge.lisbadge", data);
                                else
                                    resp = await fetch_update("lisbadge.lisbadge", data);
                                datatable_reload_table();
                                if (resp !== null && auto_increment) {
                                    data.id += 1;
                                    await __dialog_new_single_lis_badge(data.id, auto_increment);
                                }
                            }
                        }
                    }
                },
                cancel: {
                    label: 'Annuleer',
                    className: 'btn-secondary'
                }
            },
            onShown: function () {
                const rfid_field = document.getElementById('rfid-field');
                rfid_field.focus();
                rfid_field.addEventListener('keypress', function (event) {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        const [valid_code, code] = badge_raw2hex(rfid_field.value);
                        if (valid_code) {
                            rfid_field.value = code;
                            document.querySelector('.bootbox .btn-primary').click(); // Trigger the Submit button
                        }
                    }
                });

                document.getElementById("id-field").addEventListener("input", () => {
                    const id = document.getElementById("id-field").value;
                    if (id !== "") {
                        const data = datatable_row_data_from_id(id);
                        new_badge = data === undefined;
                        if (!new_badge) {
                            document.getElementById('rfid-field').value = data.rfid;
                            return
                        }
                    }
                    document.getElementById('rfid-field').value = "";
                });
                setTimeout(() => {
                    document.getElementById('auto-increment-id').checked = default_auto_increment;
                    if (default_id) {
                        const id_field = document.getElementById('id-field');
                        id_field.value = default_id;
                        id_field.dispatchEvent(new Event("input"));
                    }
                }, 100);
            }
        });
    }
}

const button_menu_items = [
    {
        type: 'button',
        id: 'lis-badge-new-single',
        label: 'Toevoegen',
        cb: () => __dialog_new_single_lis_badge()
    },
]

$(document).ready(function () {
    datatables_init({button_menu_items});
});
