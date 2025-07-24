from flask import Blueprint, render_template, request
from flask_login import login_required
from app.data.datatables import DatatableConfig
from app import data as dl, application as al
from app.presentation.view import datatable_get_data, fetch_return_error
import json, sys

# logging on file level
import logging
from app import MyLogFilter, top_log_handle, app

log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())
bp_tickoff = Blueprint('tickoff', __name__)

@bp_tickoff.route('/tickoffshow', methods=['GET', 'POST'])
@login_required
def show():
    default_type = list(dl.settings.get_configuration_setting("tickoff-types").keys())[0]
    type = request.args.get("type", default_type)
    config.set_type(type)
    return render_template("tickoff.html", table_config=config.create_table_config())

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("tickoff-datatable-data", lambda type, data: datatable_get_data(config, data))

@bp_tickoff.route('/tickoff', methods=["POST", "UPDATE", "DELETE", "GET"])
@login_required
def tickoff():
    ret = {}
    if request.method == "POST":
        data = json.loads(request.data)
        ret = al.tickoff.add(data)
    elif request.method == "UPDATE":
        data = json.loads(request.data)
        ret = al.tickoff.update(data)
    elif request.method == "DELETE":
        data = dict(request.args)
        ret = al.tickoff.delete(data)
    return json.dumps(ret)

def value_update(type, data):
    category = dl.category.get(("id", "=", data["id"]))
    dl.category.update(category, {data["column"]: data["value"]})

# invoked when a single cell in the table is updated
al.socketio.subscribe_on_type("tickoff-cell-update", value_update)

@bp_tickoff.route('/tickoff/meta', methods=['GET'])
@login_required
def meta():
    types = dl.settings.get_configuration_setting("tickoff-types")
    type_options = [{"label": v["label"], "value": k} for k, v in types.items()]
    default_type = type_options[0]["value"]
    tickoffs = al.tickoff.get()
    categories = al.category.get()
    category_options = [{"label": c, "value": c} for c in categories[default_type]] if categories else []
    return json.dumps({
        "option": {"type": type_options, "category": category_options},
        "type": types,
        "tickoff": tickoffs,
        "default": {"type": default_type},
    })

class Config(DatatableConfig):
    def pre_sql_query(self):
        return dl.tickoff.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.tickoff.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.tickoff.pre_sql_search(search)

    @property
    def template(self):
        base = dl.settings.get_datatables_config(self.view)
        type = dl.settings.get_configuration_setting("tickoff-types")[self.type]
        fields = [k2 for k1 in type["import"] for k2 in (type["combine"][k1] if k1 in type["combine"] else [k1])]
        for field in fields:
            base.append({"name": field.capitalize(), "data": type["alias"][field] if field in type["alias"] else field, "orderable": True, "visible": "yes"})
        return base

    def set_type(self, type):
        self.type = type

config = Config("tickoff", "afvinken")
