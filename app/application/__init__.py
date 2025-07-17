__all__ = ["user", "socketio", "datatables", "common", "settings", "person", "cron", "models", "category", "tickoff", "list"]

import app.application.user
import app.application.socketio
import app.application.datatables
import app.application.common
import app.application.settings
import app.application.person
import app.application.models
import app.application.category
import app.application.tickoff
import app.application.list

from app.application.person import person_cron_load_from_sdh

# tag, cront-task, label, help
cron_table = [
    ('SDH-PERSON-UPDATE', person_cron_load_from_sdh, 'VAN SDH, upload studenten en personeel', ''),
]

import app.application.cron