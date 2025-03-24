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
bp_category = Blueprint('category', __name__)

@bp_category.route('/categoryshow', methods=['GET', 'POST'])
@login_required
def show():
    return render_template("category.html", table_config=config.create_table_config())

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("category-datatable-data", lambda type, data: datatable_get_data(config, data))

@bp_category.route('/category', methods=["POST", "UPDATE", "DELETE", "GET"])
@login_required
def category():
    ret = {}
    if request.method == "UPDATE":
        data = json.loads(request.data)
        ret = al.category.upload2(data)
    elif request.method == "POST":
        ret = al.category.upload1(request.files, request.form)
    elif request.method == "DELETE":
        type = request.args.get("type")
        category = request.args.get("category")
        ret = al.category.delete(type, category)
        pass
    else: # GET
        pass
    return json.dumps(ret)

@bp_category.route('/category/meta', methods=['GET'])
@login_required
def meta():
    types = dl.settings.get_configuration_setting("tickoff-types")
    type_options = [{"label": v["label"], "value": k} for k, v in types.items()]
    default_type = type_options[0]["value"]
    categories = al.category.get()
    category_options = [{"label": c, "value": c} for c in categories[default_type]] if categories else []

    return json.dumps({
        "option": {"type": type_options, "category": category_options},
        "type": types,
        "category": categories,
        "default": {"type": default_type},
    })


class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.category.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.category.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.category.pre_sql_search(search)

    def format_data(self, l, total_count, filtered_count):
        return al.category.format_data(l, total_count, filtered_count)

config = Config("category", "categorieen")

