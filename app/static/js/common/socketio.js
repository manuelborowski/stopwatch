export class Socketio {
    receive_cbs = {}
    constructor() {
        this.socket = io();
        this.subscribe_on_receive("its-me-received", this.handle_its_me_received)
    }

    start(on_connect_cb=null, opaque=null) {
        this.socket.on('send_to_client', (msg, cb) => {
            if (msg.type in this.receive_cbs) {
                this.receive_cbs[msg.type](msg.type, msg.data);
            }
            if (cb)
                cb();
        });

        this.socket.on('connect', () => {
            if (on_connect_cb) {
                on_connect_cb(opaque);
            }
        });
    }

    send_to_server(type, data) {
        this.socket.emit('send_to_server', {type: type, data: data});
        return false;
    }

    subscribe_on_receive(type, receive_cb) {
        this.receive_cbs[type] = receive_cb;
    }

    handle_its_me_received(type, data) {
        console.log("its-me-received: " + data);
    }

    subscribe_to_room(room_code) {
        this.socket.emit('subscribe_to_room', {room: room_code});
    }

    unsubscribe_from_room(room_code) {
        this.socket.emit('unsubscribe_from_room', {room: room_code});
    }
}

export const socketio = new Socketio();

