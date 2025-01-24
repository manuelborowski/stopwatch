from flask import Blueprint, render_template, request
from flask_login import login_required, current_user
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data, fetch_return_error
import json, sys, pathlib

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

bp_lisbadge = Blueprint('lisbadge', __name__)

@bp_lisbadge.route('/lisbadgeshow', methods=['GET', "POST"])
@login_required
def show():
    if request.method == "GET":
        return render_template("lisbadge.html", table_config=config.create_table_config())

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("lis-badge-datatable-data", lambda type, data: datatable_get_data(config, data))

@bp_lisbadge.route('/lisbadge', methods=["POST", "UPDATE", "GET"])
@login_required
def lisbadge():
    try:
        if request.method == "UPDATE":
            data = json.loads(request.data)
            ret = al.lisbadge.update(data)
            return json.dumps(ret)
        elif request.method == "POST":
            data = json.loads(request.data)
            ret = al.lisbadge.add(data)
            return json.dumps(ret)
        else:
            ret = al.models.get(dl.lisbadge.LisBadge, request.args)
            return json.dumps(ret)
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return fetch_return_error()

@bp_lisbadge.route('/lisbadge/form', methods=['GET'])
@login_required
def form():
    try:
        if request.method == "GET":
            template = open(pathlib.Path("app/presentation/template/forms/lis_badge.html")).read()
            return {"template": template}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: Exception, {e}')
        return fetch_return_error(f'Exception, {e}')

class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.lisbadge.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.lisbadge.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.lisbadge.pre_sql_search(search)

config = Config("lis-badge", "LIS badges")

