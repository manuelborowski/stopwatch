from flask import request, Blueprint
from app import log, data as dl, application as al
import json, sys, html
from functools import wraps

bp_api = Blueprint('api', __name__)

def api_core(api_level, func, *args, **kwargs):
    try:
        header_key = request.headers.get('x-api-key')
        key_info = dl.settings.get_configuration_setting('api-keys')[header_key]
        if request.headers.get("X-Forwarded-For"):
            remote_ip = request.headers.get("X-Forwarded-For")
        else:
            remote_ip = request.remote_addr
        if key_info["active"]:
            if key_info["level"] >= api_level:
                log.info(f"API access by '{key_info["label"]}', from {remote_ip}, URI {request.url}")
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    log.error(f'{func.__name__}: {e}')
                    return json.dumps({"status": False, "data": f'API-EXCEPTION {func.__name__}: {html.escape(str(e))}'})
            log.error(f'{func.__name__}: level of request too low')
        log.error(f'{func.__name__}: key not active')
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return json.dumps({"status": False, "data": html.escape(str(e))})
    log.error(f"API, API key not valid, {header_key}, from {remote_ip} , URI {request.url}")
    return json.dumps({"status": False, "data": f'API key not valid'})


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

@bp_api.route('/api/retour', methods=['POST'])
@level_1
def retour():
    try:
        din = json.loads(request.data)
        log.info(din)
        dout = {"info": f'{din["naam"]}+{din["voornaam"]}+{din["klas"]}+{din["laptop"]}+{din["telefoon"]}+{din["email"]}',
                "category": "return",
                "incident_type": din["naar"],
                "incident_state": "prepared",
                "location": din["locatie"],
                "incident_owner": "admin",
                "event": "prepared"
                }
        ret = al.incident.add(dout)
        return("ok")
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return "Deze velden zijn verplicht: naam, voornaam, klas, laptop, telefoon, email"
