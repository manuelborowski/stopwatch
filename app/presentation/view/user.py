from flask import redirect, url_for, Blueprint, render_template
from flask_login import login_required
from app import admin_required, data
from app.application import user as muser
from app.data.datatables import DatatableConfig
import app.data.user
import app.application.user
from app import data as dl, application as al
from app.presentation.view import datatable_get_data

user = Blueprint('user', __name__)

@user.route('/user', methods=['GET', 'POST'])
@admin_required
@login_required
def show():
    popups = {"user_password_form": dl.settings.get_configuration_setting("popup-new-update-user")}
    return render_template("user/user.html", table_config=table_configuration.create_table_config(), popups=popups)

# invoked when the client requests data from the database
al.socketio.subscribe_on_type("datatable-data", lambda type, data: datatable_get_data(table_configuration, data))


class UserConfig(DatatableConfig):
    def pre_sql_query(self):
        return app.data.user.pre_sql_query()

    def pre_sql_search(self, search):
        return data.user.pre_sql_search(search)

    def pre_sql_order(self, q, on, direction):
        return self.pre_sql_standard_order(q, on, direction)

    def format_data(self, l, total_count, filtered_count):
        return app.application.user.format_data(l, total_count, filtered_count)


table_configuration = UserConfig("user", "Gebruikers")

