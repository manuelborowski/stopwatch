__all__ = ["user", "models", "settings", "datatables", "person", "list", "rfid"]

import app.data.user
import app.data.models
import app.data.settings
import app.data.datatables
import app.data.person
import app.data.list
import app.data.rfid

from app import login_manager
@login_manager.user_loader
def load_user(user_id):
    return app.data.user.load_user(user_id)
