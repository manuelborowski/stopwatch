from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data, fetch_return_error
import json, pathlib, sys

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

bp_history = Blueprint('history', __name__)

@bp_history.route('/historyshow', methods=['GET', "POST"])
@login_required
def show():
    if request.method == "GET":
        return render_template("history.html", table_config=config.create_table_config())

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("incident-history-datatable-data", lambda type, data: datatable_get_data(config, data))

@bp_history.route('/incident/option', methods=["GET"])
@login_required
def incident_option():
    incidents = al.incident.get()
    options = [{"label": i["id"], "value": i["id"]} for i in incidents["data"]]
    options.insert(0, {"label": "Alles", "value": "all"})
    ret = {"type": "select", "options": options, "default": "all"}
    return json.dumps(ret)

class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.history.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.history.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.history.pre_sql_search(search)

config = Config("incident-history", "Incident Historiek")

