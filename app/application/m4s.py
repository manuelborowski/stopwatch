from app import app, data as dl
import sys, requests, datetime, json

#logging on file level
import logging
from app import MyLogFilter, top_log_handle, app
log = logging.getLogger(f"{top_log_handle}.{__name__}")
log.addFilter(MyLogFilter())

class M4S:

    def init_bearer(self):
        try:
            self.bearer_token = dl.settings.get_configuration_setting("m4s_bearer_token")
            expires_in = dl.settings.get_configuration_setting("m4s_bearer_expires_in")
            renew_token = False
            if expires_in != "":
                expire_time = datetime.datetime.strptime(expires_in, "%Y-%m-%d %H:%M:%S")
                current_time = datetime.datetime.now()
                if current_time > expire_time or (expire_time - current_time).seconds < 60:
                    renew_token = True
            if renew_token or self.bearer_token == "":
                body = {
                "client_id": app.config["M4S_ID"],
                "client_secret": app.config["M4S_SECRET"],
                "scope": "openid",
                "resource": "management_portal:api",
                "grant_type": "client_credentials",
                }
                resp = requests.post(app.config["M4S_BEARER_URL"], headers={"Content-Type": "application/x-www-form-urlencoded"},  data=body)
                if resp.status_code == 200:
                    resp = json.loads(resp.text)
                    expire_time = (datetime.datetime.now() + datetime.timedelta(seconds=resp["expires_in"])).replace(microsecond=0)
                    dl.settings.set_configuration_setting("m4s_bearer_token", resp["access_token"])
                    dl.settings.set_configuration_setting("m4s_bearer_expires_in", expire_time)
                    self.bearer_token = resp["access_token"]
                    log.info(f'{sys._getframe().f_code.co_name}: new bearer token, expires at {str(expire_time)}')
                else:
                    self.bearer_token = None
                    log.error(f'{sys._getframe().f_code.co_name}: request for bearer returned status {resp.status_code}')
        except Exception as e:
            log.error(f'{sys._getframe().f_code.co_name}: {e}')

    def cases_get(self):
        try:
            self.init_bearer()
            url = app.config["M4S_API_URL"]
            headers = {"Authorization": f"Bearer {self.bearer_token}"}
            resp = requests.get(f'{url}/field-service/cases', headers=headers)
            if resp.status_code == 200:
                resp = json.loads(resp.text)
                log.info(resp)
        except Exception as e:
            log.error(f'{sys._getframe().f_code.co_name}: {e}')


# with app.app_context():
#     m4s = M4S()
#     m4s.cases_get()