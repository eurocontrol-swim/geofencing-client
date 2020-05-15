
"use strict"

var subscriptionForm = new Vue({
    el: '#subscriptionForm',
    data: {
        polygonLayer: null,
        uasZonesFilter: {
            airspaceVolume: {
                upperLimit: "10000",
                lowerLimit: "0",
                upperVerticalReference: "AGL",
                lowerVerticalReference: "AGL",
                horizontalProjection: null
            },
            startDateTime: getDateString(getCurrentDate(0)),
            endDateTime: getDateString(getCurrentDate(1)),
            regions: "",
        },
        limitReferenceOptions: [
            { text: 'AGL', value: 'AGL' },
            { text: 'AMSL', value: 'AMSL' }
        ]
    },
    methods: {
        init: function(polygonLayer) {
            this.polygonLayer = polygonLayer;
            this.uasZonesFilter.airspaceVolume.horizontalProjection = polygonLayer.toGeoJSON().geometry.coordinates[0];
            $('#subscriptionFormModal').modal('toggle');
        },
        subscribe: function() {
            var self = this;
            $.ajax({
                type: "POST",
                url: "/subscribe",
                dataType : "json",
                contentType: "application/json; charset=utf-8",
                data : JSON.stringify({uasZonesFilter: this.toJSON()}),
                success : function(result) {
                    map.removeLayer(self.polygonLayer);

                    if (result.status == 'NOK') {
                        console.log(result.error)
                        showError("Failed to subscribe");
                    }
                    else {
                        subscriptionsList.add(result);
                    }
                },
            });

            $('#subscriptionFormModal').modal('hide');

        },
        cancel: function() {
            map.removeLayer(this.subscription.polygonLayer);
        },
        toJSON: function() {
            return {
                airspaceVolume: {
                    horizontalProjection: this.uasZonesFilter.airspaceVolume.horizontalProjection,
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
        }
    }
})
