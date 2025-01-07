__all__ = ["user", "socketio", "datatables", "common", "formio", "settings", "incident", "student", "cron", "staff", "spare", "lisbadge", "history", "models"]

import app.application.user
import app.application.socketio
import app.application.datatables
import app.application.common
import app.application.formio
import app.application.settings
import app.application.incident
import app.application.student
import app.application.staff
import app.application.spare
import app.application.lisbadge
import app.application.history
import app.application.models

from app.application.student import student_cron_load_from_sdh, student_cron_post_processing
from app.application.staff import staff_cron_load_from_sdh, staff_cron_post_processing

# tag, cront-task, label, help
cron_table = [
    ('SDH-STUDENT-UPDATE', student_cron_load_from_sdh, 'VAN SDH, upload student', ''),
    ('SDH-STAFF-UPDATE', staff_cron_load_from_sdh, 'VAN SDH, upload staff', ''),
    ('SDH-STUDENT-POST-PROCESSING', student_cron_post_processing, 'Studenten: reset vlaggen', ''),
    ('SDH-STAFF-POST-PROCESSING', staff_cron_post_processing, 'Personeel: reset vlaggen', ''),
]

import app.application.cron