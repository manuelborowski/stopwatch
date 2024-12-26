from flask import Blueprint, render_template, request
from flask_login import login_required
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data
import json

incident = Blueprint('incident', __name__)

@incident.route('/incident', methods=['GET', 'POST'])
@login_required
def show():
    return render_template("incident.html", table_config=table_configuration.create_table_config())

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("incident-datatable-data", lambda type, data: datatable_get_data(table_configuration, data))

@incident.route('/incident/badge/lis/get', methods=['GET'])
@login_required
def get_lis_badge_id():
    code = request.args.get('code').lower()
    lis_rfids = dl.settings.get_configuration_setting("lis-badge-rfid")
    if code in lis_rfids:
        ret = {"data": lis_rfids[code]}
    else:
        ret = {"status": "warning", "msg": f"RFID code, {code.upper()} is niet gevonden in database"}
    return json.dumps(ret)



class UserConfig(DatatableConfig):
    def pre_sql_query(self):
        return dl.incident.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.incident.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.incident.pre_sql_search(search)

    def format_data(self, l, total_count, filtered_count):
        return al.incident.format_data(l, total_count, filtered_count)

table_configuration = UserConfig("incident", "Incidenten")

