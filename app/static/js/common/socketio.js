import "https://cdnjs.cloudflare.com/ajax/libs/socket.io/3.0.4/socket.io.js"

import {TimedPopup} from "./popup.js";

class Socketio {
    receive_cbs = {}
    timer_id = null;

    constructor() {
        this.socket = io();
    }

    init = () => {
        this.socket.on('send_to_client', (msg, cb) => {
            if (msg.type in this.receive_cbs) {
                this.receive_cbs[msg.type](msg.type, msg.data);
            }
            if (cb) cb();
        });
        this.subscribe_on_receive("alert-popup", (type, data) => new TimedPopup(data.status, data.data));
    }

    send_to_server(type, data) {
        this.socket.emit('send_to_server', {type: type, data: data});
        return false;
    }

    subscribe_on_receive(type, receive_cb) {
        this.receive_cbs[type] = receive_cb;
    }

    subscribe_to_room(room_code) {
        this.socket.emit('subscribe_to_room', {room: room_code});
    }

    unsubscribe_from_room(room_code) {
        this.socket.emit('unsubscribe_from_room', {room: room_code});
    }

}

export const socketio = new Socketio();