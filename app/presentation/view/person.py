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
bp_person = Blueprint('person', __name__)

@bp_person.route('/person', methods=["GET"])
@login_required
def person():
    ret = {}
    if request.method == "GET":
        ret = al.models.get(dl.person.Person, request.args)
    return json.dumps(ret)
