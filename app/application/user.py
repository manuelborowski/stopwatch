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
        return {"status": "ok", "data": f"Gebruiker, {user.username} toegevoegd."}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "data": str(e)}


def user_update(data):
    try:
        user = dl.user.user_get(('id', "=", data['id']))
        if user:
            del data['id']
            user = dl.user.user_update(user, data)
            if user:
                data = {k: v for k, v in data.items() if k not in ('username', 'password', 'password_hash')}
                log.info(f"Update user: {data}")
                return {"status": "ok", "data": f"Gebruiker, {user.username} aangepast."}
        return {"status": "warning", "data": f"Gebruiker met id {data['id']} bestaat niet"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "data": str(e)}


def user_delete(data):
    try:
        dl.user.user_delete(data)
        return {"status": "ok", "data": "Gebruikers zijn verwijderd"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": "error", "data": str(e)}


def user_get(data):
    try:
        user = dl.user.user_get(('id', "=", data['id']))
        return {"status": True, "data": user.to_dict()}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": False, "data": {str(e)}}


############ user overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        out.append(em)
    return  total_count, filtered_count, out

