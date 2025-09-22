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
    if request.headers.get("X-Forwarded-For"):
        client_ip = request.headers.get("X-Forwarded-For")
    else:
        client_ip = request.remote_addr
    ret = al.person.registration_add(type, timestamp, leerlingnummer, code)
    for item in ret:
        if item["to"] == "location":
            al.socketio.send_to_room(item, type)
        elif item["to"] == "ip" and client_ip:
            al.socketio.send_to_room(item, client_ip)
    return json.dumps({"status": True})

@bp_mobile.route('/person', methods=["POST", "UPDATE", "DELETE", "GET"])
@login_required
def person():
    ret = {}
    if request.method == "UPDATE":
        data = json.loads(request.data)
        ret = al.person.update(data)
    return json.dumps(ret)



