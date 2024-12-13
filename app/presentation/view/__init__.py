__all__ = ["api", "auth", "user"]

import json
from app import app, version, application as al
from flask_login import current_user
from flask import request

@app.context_processor
def inject_defaults():
    return dict(version=f'@ 2023 MB. {version}', title=app.config['HTML_TITLE'], site_name=app.config['SITE_NAME'], current_user=current_user)

# get data from the database and send back to the client.  Or send a message...
def datatable_get_data(table_config, data):
    ret = al.datatables.datatable_get_data(table_config, data)
    if ret["status"]:
        al.socketio.send_to_client({"type": "datatable-data", "data": ret["data"]})
        return json.dumps(ret["data"])
    else:
        al.socketio.send_to_client({"type": "alert-popup", "data": {"msg": ret["data"], "color": "red"}})
        return "[]"

