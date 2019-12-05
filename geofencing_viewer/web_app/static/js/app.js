
"use strict"

class UASZone {
}

class Subscription {
    constructor(id, topic) {
        this.id = id;
        this.topic = topic;
        this.paused = false;
        this.loading = true;
        this.uas_zones = [];
    }

}

var socket = io.connect('http://localhost:5000');

socket.on('uas_zones_updates', function (event) {

});

socket.on('uas_zones', function(event) {
    init_uas_zones(event.uas_zones)
});

