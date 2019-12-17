
"use strict"




var socket = io.connect('http://localhost:5000');

socket.on('uas_zones_updates', function (event) {

});

socket.on('uas_zones', function(event) {
    initUASZones(event.uas_zones)
});

socket.on('subscribed', function(event) {
    finalizeSubscription(event.response)
})
