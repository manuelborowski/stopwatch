from flask import Blueprint, render_template, request
from flask_login import login_required
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data, level_2_required
import json, sys

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())
bp_spare = Blueprint('spare', __name__)

@bp_spare.route('/spareshow', methods=['GET', 'POST'])
@level_2_required
@login_required
def show():
    return render_template("spare.html", table_config=config.create_table_config())

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("spare-datatable-data", lambda type, data: datatable_get_data(config, data))

@bp_spare.route('/spare', methods=["POST", "DELETE", "GET"])
@level_2_required
@login_required
def spare():
    if request.method == "POST":
        data = json.loads(request.data)
        ret = al.spare.add(data)
    elif request.method == "DELETE":
        ret = al.spare.delete(request.args["ids"].split(","))
    else: # GET
        ret = al.models.get(dl.spare.Spare, request.args)
    return json.dumps(ret)


class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.spare.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.spare.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.spare.pre_sql_search(search)

    def format_data(self, db_list, total_count=None, filtered_count=None):
        return al.spare.format_data(db_list, total_count, filtered_count)

config = Config("spare", "Reserve badges")

