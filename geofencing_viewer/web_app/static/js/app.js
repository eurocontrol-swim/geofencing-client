
"use strict"

function initUASZones(UASZones) {
    UASZones.forEach(function(UASZoneData) {
        UASZones.push(new UASZone(UASZoneData))
    })
}

function showError(errorText) {
    $("#errorModal").find(".modal-body").html("<p>" + errorText + "</p>");
    $("#errorModal").modal('toggle');
}

var socket = io.connect('http://localhost:3000');

socket.on('uas_zones', function(event) {
    event.uas_zones.forEach(function(data) {
        UASZonesList.add(new UASZone(data));
    })
});

socket.on('uas_zones_update', function(event) {
    event.uas_zones.forEach(function(data) {
        UASZonesList.add(new UASZone(data));
    })
});

socket.on('subscribe:response', function(event) {
    finalizeSubscription(event.response);
})

socket.on('pause:response', function(event) {
    if (event.response.status == 'NOK') {
        console.log(event.response.error)
        showError("Failed to pause the subscription");
    }
})

socket.on('resume:response', function(event) {
    if (event.response.status == 'NOK') {
        console.log(event.response.error)
        showError("Failed to resume the subscription");
    }
})

socket.on('unsubscribe:response', function(event) {
    if (event.response.status == 'NOK') {
        console.log(event.response.error)
        showError("Failed to unsubscribe");
    }
})

