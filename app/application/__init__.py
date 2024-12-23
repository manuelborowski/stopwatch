__all__ = ["user", "socketio", "datatables", "common", "formio", "settings", "incident", "student", "cron"]

import app.application.user
import app.application.socketio
import app.application.datatables
import app.application.common
import app.application.formio
import app.application.settings
import app.application.incident
import app.application.student

from app.application.student import student_cron_load_from_sdh, student_cron_post_processing

# tag, cront-task, label, help
cron_table = [
    ('SDH-STUDENT-UPDATE', student_cron_load_from_sdh, 'VAN SDH, upload student', ''),
    ('SDH-STUDENT-POST-PROCESSING', student_cron_post_processing, 'Studenten: reset vlaggen', ''),
]

import app.application.cron