__all__ = ["api", "auth", "user", "incident"]

import json, sys, pathlib
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
    return dict(version=f'@ 2023 MB. {version}', title=app.config['HTML_TITLE'], current_user=current_user)

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
