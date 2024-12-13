from app import data as dl

def get_api_key(level, tag="local"):
    api_keys = dl.settings.get_configuration_setting('api-keys')[level - 1]
    api_key = [k for k, v in api_keys.items() if v == tag][0]
    return api_key