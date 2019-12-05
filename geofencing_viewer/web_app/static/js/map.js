
"use strict"

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


function geojson_coordinates_from_point_list(point_list) {
    var coords = []
    for (let i in point_list) {
        coords.push([point_list[i]['LAT'], point_list[i]['LON']])
    }
    return coords
}

var Polygons = []
var SubscriptionPolygons = []

var UASZoneIcon = L.icon({
    iconUrl: '/img/geofence.png',
    iconSize: [20, 20],
});

var subscriptionCoords = [
    [50.861086, 4.343248],
    [50.832482, 4.339726],
    [50.828472, 4.389035],
    [50.846001, 4.421129],

]

function init_uas_zones(uas_zones) {
    uas_zones.forEach(function(uas_zone) {

        var coords = geojson_coordinates_from_point_list(uas_zone['airspaceVolume']['polygon'])
        var poly = L.polygon(coords).addTo(map);
        poly.bindPopup("<p>UASZone</p>")
        poly.setStyle({fillColor: "red", color: "red"})

        Polygons.push(poly)
    })

    // set subscription
    var subPoly = L.polygon(subscriptionCoords).addTo(map);
    subPoly.bindPopup("<p>Subscription</p>")
    subPoly.bringToBack()
    SubscriptionPolygons.push(subPoly)

}



var editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);
var drawPluginOptions = {
  position: 'topright',
  draw: {
    polygon: {
      allowIntersection: false, // Restricts shapes to simple polygons
      drawError: {
        color: '#e1e100', // Color the shape will turn when intersects
        message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
      },
      shapeOptions: {
        color: '#97009c'
      }
    },
    // disable toolbar item by setting it to false
    polyline: false,
    circle: false, // Turns off this drawing tool
    rectangle: false,
    marker: false,
    },
  edit: {
    featureGroup: editableLayers, //REQUIRED!!
    remove: false
  }
};

// Initialise the draw control and pass it the FeatureGroup of editable layers
var drawControl = new L.Control.Draw(drawPluginOptions);
map.addControl(drawControl);

var editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);

map.on('draw:created', function(e) {
  var type = e.layerType,
    layer = e.layer;

  if (type === 'marker') {
    layer.bindPopup('A popup!');
  }

  editableLayers.addLayer(layer);
});

