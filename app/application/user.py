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
            return {"status": False, "data": f'Fout, gebruiker {user.username} bestaat al'}
        user = dl.user.user_add(data)
        if 'confirm_password' in data:
            del data['confirm_password']
        if 'password' in data:
            del data['password']
        log.info(f"Add user: {data}")
        return {"status": True, "data": {'id': user.id}}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": False, "data": {str(e)}}


def user_update(data):
    try:
        user = dl.user.get_first_user(('id', "=", data['id']))
        if user:
            del data['id']
            user = dl.user.user_update(user, data)
            if user:
                if 'confirm_password' in data:
                    del data['confirm_password']
                if 'password' in data:
                    del data['password']
                log.info(f"Update user: {data}")
                return {"status": True, "data": {'id': user.id}}
        return {"status": False, "data": f"Gebruiker met id {data['id']} bestaat niet"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": False, "data": {str(e)}}


def user_delete(data):
    try:
        dl.user.user_delete(data)
        return {"status": True, "data": "Gebruikers zijn verwijderd"}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        return {"status": False, "data": {str(e)}}


def user_get(data):
    try:
        user = dl.user.user_get(('id', "=", data['id']))
        return {"status": True, "data": user.to_dict()}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {data}, {e}')
        return {"status": False, "data": {str(e)}}


############## formio forms #############
def prepare_add_registration_form():
    try:
        template = msettings.get_configuration_setting('popup-new-update-user')
        return {'template': template,
                'defaults': {'new_password': True}}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        raise e


def prepare_edit_registration_form(id):
    try:
        user = user.get_first_user({"id": id})
        template = msettings.get_configuration_setting('popup-new-update-user')
        template = app.application.student.form_prepare_for_edit(template, user.to_dict())
        return {'template': template,
                'defaults': user.to_dict()}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')
        raise e


############ user overview list #########
def format_data(db_list, total_count=None, filtered_count=None):
    out = []
    for i in db_list:
        em = i.to_dict()
        em.update({"row_action": i.id, "DT_RowId": i.id})
        out.append(em)
    return  total_count, filtered_count, out

