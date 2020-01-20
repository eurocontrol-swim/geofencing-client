
"use strict"


function showError(errorText) {
    $("#errorModal").find(".modal-body").html("<p>" + errorText + "</p>");
    $("#errorModal").modal('toggle');
}

var socket = io.connect('http://localhost:3000');

socket.on('initial', function(event) {
    if (event.status == 'NOK') {
        console.log(event.error)
        showError("Failed to load UASZones and Subscriptions");
    }
    else {
        event.subscriptions.forEach(function(sub_data) {
            subscriptionsList.add(sub_data);
        });

        event.uas_zones.forEach(function(data) {
            UASZonesList.add(data);
        });

    }
});

socket.on('uas_zones_update', function(event) {
    if (event.message_type == 'INITIAL') {
        event.uas_zones.forEach(function(data) {
            UASZonesList.add(data);
        })
    }
    else if (event.message_type == 'UAS_ZONE_CREATION') {
        UASZonesList.add(event.uas_zone);
    }
    else if (event.message_type == 'UAS_ZONE_DELETION') {
        UASZonesList.remove(UASZonesList.getByIdentifier(event.uas_zone_identifier));
    }
});

socket.on('subscribe:response', function(event) {
    if (event.response.status == 'NOK') {
        console.log(event.response.error)
        showError("Failed to subscribe");
    } else {
        subscriptionForm.finalize(event.response);
    }
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

