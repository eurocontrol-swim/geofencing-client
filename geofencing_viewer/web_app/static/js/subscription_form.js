
"use strict"

//function finalizeSubscription(response) {
//    if (response.status == 'NOK') {
//        map.removeLayer(subscriptionUnderConstruction.polygonLayer);
//        showError(response.error);
//    } else {
//        var subscription = Subscription(response.subscriptionID,
//                                        response.publicationLocation,
//                                        response.active,
//                                        response.UASZonesFilter);
//
////        map.addLayer(subscriptionUnderConstruction.polygonLayer);
////        subscription.polygonLayer.bringToBack();
//
//        subscriptionsList.add(subscription);
//    }
//}

var subscriptionForm = new Vue({
    el: '#subscriptionForm',
    data: {
        polygonLayer: null,
        uasZonesFilter: {
            airspaceVolume: {
                upperLimit: "10000",
                lowerLimit: "0",
                upperVerticalReference: "WGS84",
                lowerVerticalReference: "WGS84",
                polygon: null
            },
            startDateTime: getDateString(getCurrentDate(0)),
            endDateTime: getDateString(getCurrentDate(1)),
            updatedAfterDateTime: "",
            regions: "",
            requestID: ""
        },
        limitReferenceOptions: [
            { text: 'WGS84', value: 'WGS84' },
            { text: 'AGL', value: 'AGL' },
            { text: 'AMSL', value: 'AMSL' }
        ]
    },
    methods: {
        init: function(polygonLayer) {
            this.polygonLayer = polygonLayer;
            this.uasZonesFilter.airspaceVolume.polygon = pointListFromGeoJSONCoordinates(polygonLayer.toGeoJSON().geometry.coordinates[0]);
            $('#subscriptionFormModal').modal('toggle');
        },
        subscribe: function() {

            socket.emit('subscribe', {uasZonesFilter: this.toJSON()});

            $('#subscriptionFormModal').modal('hide');

        },
        cancel: function() {
            map.removeLayer(this.subscription.polygonLayer);
        },
        toJSON: function() {
            return {
                airspaceVolume: {
                    polygon: this.uasZonesFilter.airspaceVolume.polygon,
                    upperLimit: parseInt(this.uasZonesFilter.airspaceVolume.upperLimit),
                    lowerLimit: parseInt(this.uasZonesFilter.airspaceVolume.lowerLimit),
                    upperVerticalReference: this.uasZonesFilter.airspaceVolume.upperVerticalReference,
                    lowerVerticalReference: this.uasZonesFilter.airspaceVolume.lowerVerticalReference,
                },
                startDateTime: this.uasZonesFilter.startDateTime + getCurrentTimezoneString(),
                endDateTime: this.uasZonesFilter.endDateTime + getCurrentTimezoneString(),
                updatedAfterDateTime: this.uasZonesFilter.updatedAfterDateTime,
                regions: this.uasZonesFilter.regions === "" ? [] : this.uasZonesFilter.regions.split(",").map(x => parseInt(x)),
                requestID: this.uasZonesFilter.requestID
            }
        },
        finalize(response) {
            map.removeLayer(this.polygonLayer);

            if (response.status == 'NOK') {
                showError(response.error);
            }
            else {
                subscriptionsList.add(response);
            }
        }
    }
})
