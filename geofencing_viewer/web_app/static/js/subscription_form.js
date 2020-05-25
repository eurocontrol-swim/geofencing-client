
"use strict"

var subscriptionForm = new Vue({
    el: '#subscriptionForm',
    data: {
        mapLayer: null,
        uasZonesFilter: {
            airspaceVolume: {
                uomDimensions: "M",
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
        uomDimensionsOptions: [
            { text: 'METERS', value: 'M'},
            { text: 'FEET', value: 'FT'}
        ],
        limitReferenceOptions: [
            { text: 'AGL', value: 'AGL' },
            { text: 'AMSL', value: 'AMSL' }
        ]
    },
    methods: {
        init: function(mapLayer) {
            var layerGeoJson = mapLayer.toGeoJSON().geometry;

            if (layerGeoJson.type === 'Point') {
                var radius = mapLayer.getRadius();
                if (this.uasZonesFilter.airspaceVolume.uomDimensions === 'FT') {
                    radius *= METERS_TO_FEET_RATIO;
                }
                layerGeoJson = {
                    type: 'Circle',
                    radius: radius,
                    center: layerGeoJson.coordinates
                }
            }
            this.uasZonesFilter.airspaceVolume.horizontalProjection = layerGeoJson;

            this.mapLayer = mapLayer;
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
                    map.removeLayer(self.mapLayer);

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
            map.removeLayer(this.mapLayer);
        },
        toJSON: function() {
            return {
                airspaceVolume: {
                    uomDimensions: this.uasZonesFilter.airspaceVolume.uomDimensions,
                    horizontalProjection: this.uasZonesFilter.airspaceVolume.horizontalProjection,
                    upperLimit: parseInt(this.uasZonesFilter.airspaceVolume.upperLimit),
                    lowerLimit: parseInt(this.uasZonesFilter.airspaceVolume.lowerLimit),
                    upperVerticalReference: this.uasZonesFilter.airspaceVolume.upperVerticalReference,
                    lowerVerticalReference: this.uasZonesFilter.airspaceVolume.lowerVerticalReference,
                },
                startDateTime: this.uasZonesFilter.startDateTime + getCurrentTimezoneString(),
                endDateTime: this.uasZonesFilter.endDateTime + getCurrentTimezoneString(),
                regions: this.uasZonesFilter.regions === "" ? [] : this.uasZonesFilter.regions.split(",").map(x => parseInt(x)),
            }
        }
    }
})
