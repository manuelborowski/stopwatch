from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data
import json

bp_spare = Blueprint('spare', __name__)

@bp_spare.route('/spareoverview', methods=['GET', "POST"])
@login_required
def show():
    if request.method == "GET":
        return render_template("spare.html", table_config=config.create_table_config())

@bp_spare.route('/spare', methods=["POST", "UPDATE"])
@login_required
def spare():
    if request.method == "UPDATE":
        data = json.loads(request.data)
        ret = al.spare.update(data)
    elif request.method == "POST":
        data = json.loads(request.data)
        ret = al.spare.add(data)
    return json.dumps(ret)

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("spare-datatable-data", lambda type, data: datatable_get_data(config, data))

class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.spare.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.spare.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.spare.pre_sql_search(search)

    def format_data(self, l, total_count, filtered_count):
        return al.spare.format_data(l, total_count, filtered_count)

config = Config("spare", "Reserve laptops")

