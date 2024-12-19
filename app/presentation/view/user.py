from flask import Blueprint, render_template
from flask_login import login_required
from app import admin_required
from app.data.datatables import DatatableConfig
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

def value_update(type, data):
    user = dl.user.user_get(("id", "=", data["id"]))
    dl.user.user_update(user, {data["column"]: data["value"]})

# invoked when a single cell in the table is updated
al.socketio.subscribe_on_type("cell-update", value_update)


class UserConfig(DatatableConfig):
    def pre_sql_query(self):
        return dl.user.pre_sql_query()

    def pre_sql_filter(self, q, filters):
        return dl.user.pre_sql_filter(q, filters)

    def pre_sql_search(self, search):
        return dl.user.pre_sql_search(search)

    def format_data(self, l, total_count, filtered_count):
        return al.user.format_data(l, total_count, filtered_count)

table_configuration = UserConfig("user", "Gebruikers")

