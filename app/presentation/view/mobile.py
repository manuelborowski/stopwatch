from flask import Blueprint, render_template, request
from flask_login import login_required
from app import application as al
import json

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())
bp_mobile = Blueprint('mobile', __name__)

@bp_mobile.route('/scan', methods=['GET', 'POST'])
@login_required
def show_scan():
    return render_template("m/scan.html")

@bp_mobile.route('/scan/add', methods=['POST'])
@login_required
def scan(*args, **kwargs):
    data = json.loads(request.data)
    code = data["badge_code"] if "badge_code" in data else None
    leerlingnummer = data["leerlingnummer"] if "leerlingnummer" in data else None
    type = data["type"]
    timestamp = data["timestamp"] if "timestamp" in data else None
    ret = al.person.registration_add(type, timestamp, leerlingnummer, code)
    for item in ret:
        if item["to"] == "mobile":
            return json.dumps(item)
        elif item["to"] == "location":
            al.socketio.send_to_room(item, type)

    return json.dumps({"to": "mobile", "data": "Onbekende fout"})


