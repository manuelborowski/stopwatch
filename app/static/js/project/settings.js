import {socketio} from "../common/socketio.js";
import {busy_indication_off, busy_indication_on} from "../common/common.js";

var _form = null;
$(document).ready(function () {
    socketio.subscribe_on_receive("settings", socketio_settings_ack);
    load_formio_form();
});


function load_formio_form() {
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
            socketio_transmit_setting('data', JSON.stringify((submission.data)))
            _form.getComponentById(button_id).setValue(false);
        })
        form.on('submitButton', button => {
            button_id = button.instance.id;
        });
    });
}

function socketio_settings_ack(type, data) {
    _form.emit('submitDone')
    // setTimeout(function() {$("#configuration-settings .alert").css("display", "none");}, 1000);
    setTimeout(function () {
        document.querySelectorAll("[ref=buttonMessageContainer]").forEach(b => b.style.display = "none");
        document.querySelectorAll("[ref=button]").forEach(b => {
            b.classList.remove('btn-success');
            b.classList.remove('submit-success');
        });
    }, 1000);
    busy_indication_off();
}

function socketio_transmit_setting(setting, value) {
    busy_indication_on();
    socketio.send_to_server('settings', {setting: setting, value: value});
    return false;
}
