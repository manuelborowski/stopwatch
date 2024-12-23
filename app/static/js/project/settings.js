import {socketio} from "../common/socketio.js";
import {busy_indication_off, busy_indication_on} from "../common/common.js";
import {base_init} from "../base.js";

let _form = null;

const __formio_load_form = () => {
    Formio.createForm(document.getElementById('configuration-settings'), data.template, {submitMessage: "", disableAlerts: true, noAlerts: true}).then((form) => {
        _form = form
        var button_id; // hack to set the value of the button, which was just clicked, to false again.
        if (data.default != null) {
            for (const [k, v] of Object.entries(data.default)) {
                const c = form.getComponent(k)
                if (c !== undefined && c !== null) c.setValue(v);
            }
        }
        form.on('submit', function (submission) {
            busy_indication_on();
            socketio.send_to_server('settings', {setting: "data", value: JSON.stringify(submission.data)});
            _form.getComponentById(button_id).setValue(false);
        })
        form.on('submitButton', button => {
            button_id = button.instance.id;
        });
    });
}

const __socketio_settings_ack = (type, data) => {
    _form.emit('submitDone')
    // setTimeout(function() {$("#configuration-settings .alert").css("display", "none");}, 1000);
    setTimeout(() => {
        document.querySelectorAll("[ref=buttonMessageContainer]").forEach(b => b.style.display = "none");
        document.querySelectorAll("[ref=button]").forEach(b => {
            b.classList.remove('btn-success');
            b.classList.remove('submit-success');
        });
    }, 1000);
    busy_indication_off();
}

$(document).ready(function () {
    socketio.subscribe_on_receive("settings", __socketio_settings_ack);
    __formio_load_form();
    base_init({});
});

