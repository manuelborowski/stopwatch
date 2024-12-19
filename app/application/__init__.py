__all__ = ["user", "socketio", "datatables", "common", "formio", "settings"]

import app.application.user
import app.application.socketio
import app.application.datatables
import app.application.common
import app.application.formio
import app.application.settings

# tag, cront-task, label, help
cron_table = [
    ('SDH-STUDENT-UPDATE', lambda x: print(x), 'NAAR SDH, test', 'test'),
]

