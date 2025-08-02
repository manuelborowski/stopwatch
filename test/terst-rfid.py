import logging.handlers, os, sys, requests, datetime, random, pickle
from time import sleep

import pandas as pd
from sqlalchemy import create_engine
from instance.config import SQLALCHEMY_DATABASE_URI, RFIDUSB_SERVER_URL, RFIDUSB_SERVER_KEY


engine = create_engine(SQLALCHEMY_DATABASE_URI)

log = logging.getLogger("rfid")
LOG_FILENAME = os.path.join(sys.path[0], f'rfid.log.txt')
log_level = getattr(logging, 'INFO')
log.setLevel(log_level)
log_handler = logging.handlers.RotatingFileHandler(LOG_FILENAME, maxBytes=16 * 1024 * 1024, backupCount=20)
log_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(name)s - %(message)s')
log_handler.setFormatter(log_formatter)
log.addHandler(log_handler)

log.info("START test-rfid")

def send_rfids_to_server(location="result", wait=1, nbr=1):
    try:
        log.info(f"START send_rfids_to_server, {location}, {wait}, {nbr}")
        try:
            with open("rfids.bin", "rb") as rf:
                rfids = pickle.load(rf)
        except:
            rfids = []
        if not rfids:
            persons_df = pd.read_sql_table("persons", con=engine)
            rfids = persons_df["rfid"].to_list()
            random.shuffle(rfids)
        idx = nbr
        while idx and rfids:
            idx -= 1
            rfid = rfids.pop(0)
            timestamp = datetime.datetime.now().isoformat()[:23]
            requests.post(f"{RFIDUSB_SERVER_URL}/api/registration/add", headers={'x-api-key': RFIDUSB_SERVER_KEY}, json={"location_key": location, "badge_code": rfid, "timestamp": timestamp})
            sleep(wait)
        with open("rfids.bin", "wb") as rf:
            pickle.dump(rfids, rf)
    except Exception as e:
        log.error(f'{sys._getframe().f_code.co_name}: {e}')

send_rfids_to_server(wait=0.2, nbr=1500)

log.info("STOP test-rfid")
