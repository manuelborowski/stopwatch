import sys
from app import data as dl

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())


def user_add(data):
    try:
        user = dl.user.user_get(('username', "=", data['username']))
        if user:
            log.error(f'Error, user {user.username} already exists')
            return {"status": "warning", "data": f'Fout, gebruiker "{user.username}" bestaat al'}
        user = dl.user.user_add(data)
        data = {k: v for k, v in data.items() if k not in ('username', 'password', 'password_hash')}
        log.info(f"Add user: {data}")
        return {"status": "ok", "msg": f"Gebruiker, {user.username} toegevoegd."}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}


def user_update(data):
    try:
        user = dl.user.user_get(('id', "=", data['id']))
        if user:
            del data['id']
            user = dl.user.user_update(user, data)
            if user:
                data = {k: v for k, v in data.items() if k not in ('username', 'password', 'password_hash')}
                log.info(f"Update user: {data}")
                return {"status": "ok", "msg": f"Gebruiker, {user.username} aangepast."}
        return {"status": "warning", "msg": f"Gebruiker met id {data['id']} bestaat niet"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "data": str(e)}


def user_delete(data):
    try:
        dl.user.user_delete(data)
        return {"status": "ok", "msg": "Gebruikers zijn verwijderd"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "msg": str(e)}


def user_get(data):
    try:
        filter = None
        if "id" in data:
            filter = ("id", "=", data['id'])
        if "rfid" in data:
            filter = ("rfid", "=", data['rfid'])
        if filter:
            user = dl.user.user_get(filter)
            if user:
                return {"data": user.to_dict()}
            else:
                return {"status": "error", "msg": f"User not found, filter {filter}"}
        else:
            return {"status": "error", "msg": f"No valid data {data}"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": "error", "msg": {str(e)}}


############ user overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        if i.level == 5: em.update({"overwrite_row_color": "LemonChiffon"})
        if i.user_type == dl.user.User.USER_TYPE.OAUTH: em.update({"overwrite_cell_color": {"user_type": "lightgreen"}})
        out.append(em)
    return  total_count, filtered_count, out

