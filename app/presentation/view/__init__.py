__all__ = ["api", "auth", "user"]

import json
from app import app, version, application as al
from flask_login import current_user
from app import application as al

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
        al.socketio.send_to_client({"type": "datatable-data", "data": ret["data"]})
        return json.dumps(ret["data"])
    else:
        send_alert_to_client("error", ret["msg"])
        return "[]"

