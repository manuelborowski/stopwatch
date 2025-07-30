from app import app

def get_rfidudb_configuration():
    return {
        "api_url": app.config["RFIDUSB_API_URL"],
        "server_url": app.config["RFIDUSB_SERVER_URL"],
        "server_key": app.config["RFIDUSB_SERVER_KEY"],
        "resolution": app.config["RFIDUSB_RESOLUTION"]
    }

