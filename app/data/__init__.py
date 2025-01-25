__all__ = ["user", "models", "settings", "datatables", "incident", "student", "staff", "spare", "lisbadge", "history", "entra", "smartschool", "m4s"]

import app.data.user
import app.data.models
import app.data.settings
import app.data.datatables
import app.data.incident
import app.data.student
import app.data.staff
import app.data.spare
import app.data.lisbadge
import app.data.history
import app.data.entra
import app.data.smartschool
import app.data.m4s

from app import login_manager
@login_manager.user_loader
def load_user(user_id):
    return app.data.user.load_user(user_id)
