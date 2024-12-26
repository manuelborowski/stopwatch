__all__ = ["api", "auth", "user", "incident"]

import json, sys
from app import app, version, application as al, data as dl
from flask_login import current_user
from app import application as al

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

@app.context_processor
def inject_defaults():
    api_key = al.common.get_api_key(current_user.level) if current_user.is_active else ""
    return dict(version=f'@ 2023 MB. {version}', title=app.config['HTML_TITLE'], current_user=current_user, api_key=api_key)

def send_alert_to_client(status, msg):
    al.socketio.send_to_client({"type": "alert-popup", "data": {"data": msg, "status": status}})


# get data from the database and send back to the client.  Or send a message...
def datatable_get_data(table_config, data):
    ret = al.datatables.datatable_get_data(table_config, data)
    if ret["status"]:
        al.socketio.send_to_client({"type": f"{table_config.view}-datatable-data", "data": ret["data"]})
        return json.dumps(ret["data"])
    else:
        send_alert_to_client("error", ret["msg"])
        return "[]"

# use only in context of a fetch call
def fetch_return_error(msg):
    return {"status": "error", "msg": msg}

# called in the context of a fetch call
def popup_assemble(params):
    try:
        if "id" in params:
            template = dl.settings.get_configuration_setting(params["id"])
            defaults = {}
            optional = {}
            if params["id"] == "popup-new-update-incident":
                students = dl.student.student_get_m()
                student_data = sorted([{"label": f"{s.naam} {s.voornaam} {s.klasgroep}", "data": s.leerlingnummer} for s in students], key=lambda x: x["label"])
                defaults = {"owner-name-id": student_data}
                optional = {"url": app.config["ENTRA_API_URL"], "key": app.config["ENTRA_API_KEY"]}
            elif params["id"] == "popup-new-update-user":
                if "user_id" in params:
                    user = dl.user.user_get(("id", "=", params["user_id"]))
                    defaults = {"user": user.to_dict()}
            return {"template": template, "defaults": defaults, "data": optional}
        return fetch_return_error(f"id was not specified")
    except KeyError as e:
        log.error(f'{sys._getframe().f_code.co_name}: Keyerror, popup-id not found, {e}')
        return fetch_return_error(f'Keyerror, popup-id not found, {e}')
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: Exception, {e}')
        return fetch_return_error(f'Exception, {e}')
