from flask import request, Blueprint
from app import log
import json, sys, html
from functools import wraps
from app import application as al
from . import popup_assemble

api = Blueprint('api', __name__)

def api_core(api_level, func, *args, **kwargs):
    try:
        return func(*args, **kwargs)

        # all_keys = msettings.get_configuration_setting('api-keys')
        # header_key = request.headers.get('x-api-key')
        # if request.headers.get("X-Forwarded-For"):
        #     remote_ip = request.headers.get("X-Forwarded-For")
        # else:
        #     remote_ip = request.remote_addr
        # for i, keys_per_level in  enumerate(all_keys[(api_level - 1)::]):
        #     if header_key in keys_per_level:
        #         key_level = api_level + i
        #         log.info(f"API access by '{keys_per_level[header_key]}', keylevel {key_level}, from {remote_ip}, URI {request.url}")
        #         try:
        #             kwargs["remote_ip"] = remote_ip
        #             return func(*args, **kwargs)
        #         except Exception as e:
        #             log.error(f'{func.__name__}: {e}')
        #             return json.dumps({"status": False, "data": f'API-EXCEPTION {func.__name__}: {html.escape(str(e))}'})
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return json.dumps({"status": False, "data": html.escape(str(e))})
    log.error(f"API, API key not valid, {header_key}, from {remote_ip} , URI {request.url}")
    return json.dumps({"status": False, "data": f'API key not valid'})


def user_key_required(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return api_core(1, func, *args, **kwargs)
        return wrapper


def supervisor_key_required(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return api_core(3, func, *args, **kwargs)
        return wrapper


def admin_key_required(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            return api_core(5, func, *args, **kwargs)
        return wrapper


@api.route('/api/user/add', methods=['POST'])
@admin_key_required
def user_add(**kwargs):
    data = json.loads(request.data)
    ret = al.user.user_add(data)
    return(json.dumps(ret))


@api.route('/api/user/update', methods=['POST'])
@admin_key_required
def user_update(**kwargs):
    data = json.loads(request.data)
    ret = al.user.user_update(data)
    return(json.dumps(ret))


@api.route('/api/user/delete', methods=['POST'])
@admin_key_required
def user_delete(**kwargs):
    data = json.loads(request.data)
    ret = al.user.user_delete(data)
    return(json.dumps(ret))


@api.route('/api/user/get', methods=['GET'])
@admin_key_required
def user_get(**kwargs):
    options = request.args
    ret = al.user.user_get(options)
    return(json.dumps(ret))

@api.route('/api/student/get', methods=['GET'])
@admin_key_required
def student_get(**kwargs):
    options = request.args
    ret = al.student.student_get(options)
    return(json.dumps(ret))

@api.route('/api/popup/get', methods=['GET'])
@admin_key_required
def popup_get(**kwargs):
    data = request.args
    ret = popup_assemble(data)
    return(json.dumps(ret))

