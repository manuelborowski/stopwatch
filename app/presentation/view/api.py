from flask import request, Blueprint
from app import log, app, data as dl, application as al
import json, sys, html
from functools import wraps
from flask_login import login_user, logout_user

bp_api = Blueprint('api', __name__)

with app.app_context():
    user_api = dl.user.get(("username", "=", "api"))

def api_core(api_level, func, *args, **kwargs):
    try:
        header_key = request.headers.get('x-api-key')
        key_infos = dl.settings.get_configuration_setting('api-keys')
        if header_key in key_infos:
            key_info = key_infos[header_key]
            if request.headers.get("X-Forwarded-For"):
                remote_ip = request.headers.get("X-Forwarded-For")
            else:
                remote_ip = request.remote_addr
            if key_info["active"]:
                if key_info["level"] >= api_level:
                    log.info(f"API access by '{key_info["label"]}', from {remote_ip}, URI {request.url}")
                    try:
                        login_user(user_api)
                        kwargs["remote_ip"] = remote_ip
                        ret = func(*args, **kwargs)
                        logout_user()
                        return ret
                    except Exception as e:
                        log.error(f'{func.__name__}: {e}')
                        return json.dumps({"status": False, "data": f'API-EXCEPTION {func.__name__}: {html.escape(str(e))}'})
                log.error(f'{func.__name__}: level of request too low')
                return json.dumps({"status": False, "data": "wrong level"})
            log.error(f'{func.__name__}: key not active')
            return json.dumps({"status": False, "data": "key not active"})
        log.error(f'{func.__name__}: key not valid')
        return json.dumps({"status": False, "data": "key not valid"})
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return json.dumps({"status": False, "data": f"{html.escape(str(type(e)))}, {html.escape(str(e))}"})

def level_1(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return api_core(1, func, *args, **kwargs)
    return wrapper

def level_3(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return api_core(3, func, *args, **kwargs)
    return wrapper

def level_5(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        return api_core(5, func, *args, **kwargs)
    return wrapper

@bp_api.route('/api/registration/add', methods=['POST'])
@level_1
def registration_add(*args, **kwargs):
    client_ip = kwargs['remote_ip'] if 'remote_ip' in kwargs else None
    data = json.loads(request.data)
    rfid_code = data["badge_code"].upper() if "badge_code" in data else None
    leerlingnummer = data["leerlingnummer"] if "leerlingnummer" in data else None
    location = data["location_key"].replace("--SLASH--", "/")
    timestamp = data["timestamp"] if "timestamp" in data else None
    ret = al.person.registration_add(location, timestamp, leerlingnummer, rfid_code)
    for item in ret:
        if item["to"] == "ip" and client_ip:
            al.socketio.send_to_room(item, client_ip)
        elif item["to"] == "location":
            al.socketio.send_to_room(item, location)
        elif item["to"] == "broadcast":
            al.socketio.broadcast_message(item)
        else:
            log.error(f'{sys._getframe().f_code.co_name}: No valid "to" parameter: {item["to"]}')
            return json.dumps({"status": False, "data": f'No valid "to" parameter: {item["to"]}'})
    return json.dumps({"status": True})

@bp_api.route('/api/result/pdf', methods=['POST'])
@level_1
def result_to_pdf(*args, **kwargs):
    data = json.loads(request.data)
    klasgroep = data["klasgroep"] if "klasgroep" in data else None
    lijst = data["lijst"] if "lijst" in data else None
    ret = al.person.result_to_pdf(klasgroep, lijst)
    return json.dumps(ret)

