
"use strict"

$(document).ready(function(){
    $.ajax({
        type: "GET",
        url: "/all",
        dataType : "json",
        contentType: "application/json; charset=utf-8",
        success : function(result) {
            if (result.status == 'NOK') {
                console.log(result.error)
                showError("Failed to load UASZones and Subscriptions");
            }
            else {
                result.subscriptions.forEach(function(sub_result) {
                    subscriptionsList.add(sub_result);
                });

                result.uas_zones.forEach(function(uas_zone_data) {
                    UASZonesList.add(uas_zone_data);
                });
            }
        },
    });

    setInterval(
        function(){
            $.ajax({
                type: "GET",
                url: "/poll",
                dataType : "json",
                contentType: "application/json; charset=utf-8",
                success : function(result) {
                    if (!(Object.keys(result).length === 0 && result.constructor === Object)) {
                        console.log(result);
                        if (result.data.message_type == 'UAS_ZONE_CREATION') {
                            UASZonesList.add(result.data.uas_zone);

                            var subscription = subscriptionsList.getById(result.subscription_id);
                            subscription.intersectingUASZonesIdentifiers.push(result.data.uas_zone.identifier)
                        }
                        else if (result.data.message_type == 'UAS_ZONE_DELETION') {
                            UASZonesList.remove(UASZonesList.getByIdentifier(result.data.uas_zone_identifier));

                            subscription = subscriptionsList.getById(result.data.subscription_id);
                            subscription.intersectingUASZonesIdentifiers = subscription.intersectingUASZonesIdentifiers.filter((id) => id != result.data.uas_zone_identifier);
                        }
                    }
                },
            });
        },
        1000
    );
});


function showError(errorText) {
    $("#errorModal").find(".modal-body").html("<p>" + errorText + "</p>");
    $("#errorModal").modal('toggle');
}
