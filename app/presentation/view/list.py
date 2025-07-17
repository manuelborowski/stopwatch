from flask import Blueprint, render_template, request, redirect, url_for
from app import data as dl, application as al
import json, datetime

# logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
from flask_login import login_required, current_user
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

bp_list = Blueprint('list', __name__)

@bp_list.route('/listshow', methods=['GET'])
@login_required
def show():
    return render_template("list.html")

@bp_list.route('/list', methods=['GET', "POST", "DELETE", "UPDATE"])
@login_required
def list():
    ret = []
    if request.method == "GET":
        lists = dl.list.get_m()
        return json.dumps([l.to_dict() for l in lists])
    if request.method == "POST":
        data = json.loads(request.data)
        dl.list.add_m(data)
    if request.method == "UPDATE":
        data = json.loads(request.data)
        al.list.update_m(data)
    if request.method == "DELETE":
        data = request.args.get("ids").split(",")
        dl.list.delete_m(ids=data)
    return ret

@bp_list.route('/staff', methods=["UPDATE"])
@login_required
def staff():
    if request.method == "UPDATE":
        data = json.loads(request.data)
        dl.staff.update(data)
    return {}

@bp_list.route('/list/meta', methods=['GET'])
def meta():
    list_colors = dl.settings.get_configuration_setting("list-colors")
    data = {
        "list_colors": list_colors
    }
    return json.dumps(data)

