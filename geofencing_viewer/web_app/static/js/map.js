
"use strict"

class UASZone {
    constructor(data) {
        this.data = data;
        this.coords = geojsonCoordinatesFromPointList(data['airspaceVolume']['polygon'])
        this.polygonLayer = this.setUpPolygonLayer()
    }

    setUpPolygonLayer() {
        var polygonLayer = L.polygon(this.coords).addTo(map);

        polygonLayer.bindPopup(this.getPopUpContent())
        polygonLayer.setStyle({fillColor: "red", color: "red"})

        return polygonLayer
    }

    getPopUpContent() {
        return "<p>UASZone: " + this.data['name'] + "</p>"
    }
}

class UASZonesFilter {
    constructor(geoJSONPolygon) {
        this.airspaceVolume = {
            upperLimit: "10000",
            lowerLimit: "0",
            upperVerticalReference: "WGS84",
            lowerVerticalReference: "WGS84",
        };
        if (isNullObject(geoJSONPolygon)) {
            this.airspaceVolume.polygon = {};
        }
        else {
            this.airspaceVolume.polygon = pointListFromGeoJSONCoordinates(geoJSONPolygon.geometry.coordinates[0]);
        }
        this.startDateTime = getDateString(getCurrentDate(0))
        this.endDateTime = getDateString(getCurrentDate(1))
        this.updatedAfterDateTime = "";
        this.regions = "";
        this.requestID = "1";
    }

    toJSON() {
        return {
            airspaceVolume: {
                polygon: this.airspaceVolume.polygon,
                upperLimit: parseInt(this.airspaceVolume.upperLimit),
                lowerLimit: parseInt(this.airspaceVolume.lowerLimit),
                upperVerticalReference: this.airspaceVolume.upperVerticalReference,
                lowerVerticalReference: this.airspaceVolume.lowerVerticalReference,
            },
            startDateTime: this.startDateTime + getCurrentTimezoneString(),
            endDateTime: this.endDateTime + getCurrentTimezoneString(),
            updatedAfterDateTime: this.updatedAfterDateTime,
            regions: this.regions === "" ? [] : this.regions.split(",").map(x => parseInt(x)),
            requestID: this.requestID
        }
    }

}

class Subscription {
    constructor(polygonLayer) {
        this.polygonLayer = polygonLayer;
        this.id = "";
        this.location = ""
        this.topic_name = "";
        this.active = false;
        this.intersectingUASZones = [];
        this.uasZonesFilter = isNullObject(polygonLayer) ? new UASZonesFilter({}) : new UASZonesFilter(polygonLayer.toGeoJSON());
    }

    getPopupContent() {
        return `
            <table class="table">
              <tbody>
              <thead class="thead-dark">
                <tr>
                  <th scope="col">Subscription</th>
                  <th scope="col">` + this.id + `</th>
                </tr>
              </thead>
                <tr>
                  <th scope="row"></th>
                  <td></td>
                </tr>
                <tr class="table-secondary">
                  <th scope="row">Airspace Volume</th>
                  <td></td>
                </tr>
                <tr>
                  <th scope="row">Upper limit </th>
                  <td>` + this.uasZonesFilter.airspaceVolume.upperLimit + `m (` + this.uasZonesFilter.airspaceVolume.upperVerticalReference + `)</td>
                </tr>
                <tr>
                  <th scope="row">Lower limit </th>
                  <td>` + this.uasZonesFilter.airspaceVolume.lowerLimit + `m (` + this.uasZonesFilter.airspaceVolume.lowerVerticalReference +`)</td>
                </tr>
                <tr class="table-secondary">
                  <th scope="row">Applicable Time Period</th>
                  <td></td>
                </tr>
                <tr>
                  <th scope="row">Start</th>
                  <td>` + this.uasZonesFilter.startDateTime + `</td>
                </tr>
                <tr>
                  <th scope="row">End</th>
                  <td>` + this.uasZonesFilter.endDateTime + `</td>
                </tr>
                <tr>
                  <th scope="row">Updated after</th>
                  <td>` + this.uasZonesFilter.updatedAfterDateTime + `</td>
                </tr>
              </tbody>
            </table>
            <button type="button" class="btn btn-primary btn-sm" data-dismiss="modal">Pause</button>
            `;
        }
}




var map = L.map('mapid');

map.createPane('labels');

// This pane is above markers but below popups
map.getPane('labels').style.zIndex = 650;

// Layers in this pane are non-interactive and do not obscure mouse/touch events
map.getPane('labels').style.pointerEvents = 'none';


var cartodbAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';

var positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
    attribution: cartodbAttribution
}).addTo(map);

var positronLabels = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}.png', {
    attribution: cartodbAttribution,
    pane: 'labels'
}).addTo(map);

var center = [50.8385427, 4.3445355]
map.setView(center, 13);
map.scrollWheelZoom.disable();



var UASZones = []
var Subscriptions = {}

function initUASZones(UASZones) {
    UASZones.forEach(function(UASZoneData) {
        UASZones.push(new UASZone(UASZoneData))
    })
}



var editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);
var drawPluginOptions = {
  position: 'topleft',
  draw: {
    polygon: {
      allowIntersection: true, // Restricts shapes to simple polygons
      drawError: {
        color: '#e1e100', // Color the shape will turn when intersects
        message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
      }
//      shapeOptions: {
//        color: '#97009c'
//      }
    },
    // disable toolbar item by setting it to false
    polyline: false,
    circle: false, // Turns off this drawing tool
    marker: false,
    circlemarker: false,
    rectangle: false
  },
  edit: {
    featureGroup: editableLayers, //REQUIRED!!
    edit: false
  }
};

// Initialise the draw control and pass it the FeatureGroup of editable layers
var drawControl = new L.Control.Draw(drawPluginOptions);
map.addControl(drawControl);


map.on('draw:created', function(e) {
    var type = e.layerType,
        layer = e.layer;
    editableLayers.addLayer(layer);

    var subscription = new Subscription(layer)

    Subscriptions[subscription.uasZonesFilter.airspaceVolume.polygon] = subscription

    subscriptionForm.init(subscription)

});

function finalizeSubscription(response) {
    var subscription = Subscriptions[response.uas_zones_filter.airspaceVolume.polygon]

    if (response.status == 'NOK') {
        $("#errorModal").find(".modal-body").html("<p>" + response.error + "</p>");
        $("#errorModal").modal('toggle');

        map.removeLayer(subscription.polygonLayer);
    } else {
        subscription.id = response.subscriptionID;
        subscription.location = response.publicationLocation;
        map.addLayer(subscription.polygonLayer);
        subscription.polygonLayer.bringToBack();
        subscription.polygonLayer.bindPopup(subscription.getPopupContent());
    }
}

var subscriptionForm = new Vue({
    el: '#subscriptionForm',
    data: {
        subscription: new Subscription({}),
        limitReferenceOptions: [
            { text: 'WGS84', value: 'WGS84' },
            { text: 'AGL', value: 'AGL' },
            { text: 'AMSL', value: 'AMSL' }
        ]
    },
    methods: {
        init: function(subscription) {
            this.subscription = subscription;
            $('#subscriptionFormModal').modal('toggle');
        },
        subscribe: function() {

            socket.emit('subscribe', {uasZonesFilter: this.subscription.uasZonesFilter.toJSON()});

            $('#subscriptionFormModal').modal('hide');

        },
        cancel: function() {
            map.removeLayer(this.subscription.polygonLayer);
        }
    }
})
