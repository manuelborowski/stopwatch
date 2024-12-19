from errno import ECHILD

from app import data as dl
import sys

#logging on file level
import logging
from app import MyLogFilter, top_log_handle
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

def set_setting_topic(settings):
    try:
        for _, container in settings.items():
            if 'submit' in container and container['submit']:
                for k, v in container.items():
                    if k in update_setting_cbs:
                        if update_setting_cbs[k]['cb'](k, v, update_setting_cbs[k]['opaque']):
                            dl.settings.set_configuration_setting(k, v)
                    else:
                        dl.settings.set_configuration_setting(k, v)
            for k, v in button_clicked_cbs.items():
                if k in container and container[k]:
                    v['cb'](k, v['opaque'])
        return {"status": True}
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {str(e)}')
        return {"status": False, "data": str(e)}


update_setting_cbs = {}
def subscribe_handle_update_setting(topic, cb, opaque):
    update_setting_cbs[topic] = {'cb': cb, 'opaque': opaque}


button_clicked_cbs = {}
def subscribe_handle_button_clicked(topic, cb, opaque):
    button_clicked_cbs[topic] = {'cb': cb, 'opaque': opaque}
