from flask import Blueprint, render_template, request
from flask_login import login_required
from app import admin_required
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data, fetch_return_error
import json, sys

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())
bp_user = Blueprint('user', __name__)

@bp_user.route('/usershow', methods=['GET', 'POST'])
@admin_required
@login_required
def show():
    return render_template("user.html", table_config=config.create_table_config())

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("user-datatable-data", lambda type, data: datatable_get_data(config, data))

@bp_user.route('/user', methods=["POST", "UPDATE", "DELETE", "GET"])
@login_required
def user():
    if request.method == "UPDATE":
        data = json.loads(request.data)
        ret = al.user.update(data)
    elif request.method == "POST":
        data = json.loads(request.data)
        ret = al.user.add(data)
    elif request.method == "DELETE":
        ret = al.user.delete(request.args["ids"].split(","))
    else: # GET
        ret = al.user.get(request.args)
    return json.dumps(ret)

@bp_user.route('/form', methods=["GET"])
@login_required
def form():
    try:
        params = request.args
        template = dl.settings.get_configuration_setting("popup-new-update-user")
        defaults = {}
        if "user_id" in params:
            user = dl.user.get(("id", "=", params["user_id"]))
            defaults = user.to_dict()
            defaults["level"] = {"default": defaults["level"]}
            defaults["user_type"] = {"default": defaults["user_type"]}
        return {"template": template, "defaults": defaults}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: Exception, {e}')
        return fetch_return_error(f'Exception, {e}')


def value_update(type, data):
    user = dl.user.get(("id", "=", data["id"]))
    dl.user.update(user, {data["column"]: data["value"]})

# invoked when a single cell in the table is updated
al.socketio.subscribe_on_type("cell-update", value_update)


class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.user.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.user.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.user.pre_sql_search(search)

    def format_data(self, l, total_count, filtered_count):
        return al.user.format_data(l, total_count, filtered_count)

config = Config("user", "Gebruikers")

