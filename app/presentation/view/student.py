from flask import Blueprint, request
from flask_login import login_required
from app import data as dl, application as al
import json, sys
from . import fetch_return_error

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

bp_student = Blueprint('student', __name__)

@bp_student.route('/student/', methods=['GET'])
@login_required
def student():
    try:
        ret = al.models.get(dl.student.Student, request.args)
        return json.dumps(ret)
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return fetch_return_error()

# Try to find students based on not completely correct name, firstname, class...
@bp_student.route('/student/fuzzy', methods=['GET'])
@login_required
def fuzzy():
    try:
        ret = al.student.fuzzy(request.args)
        return json.dumps(ret)
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return fetch_return_error()

