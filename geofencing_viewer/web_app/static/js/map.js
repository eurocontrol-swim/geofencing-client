
"use strict"

////////////
// Map setup
////////////
var map = L.map('map');
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

var center = [50.824713, 4.514118]
map.setView(center, 12);
map.scrollWheelZoom.disable();

////////////////////
// Map draw controls
////////////////////
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
    },
    // disable toolbar item by setting it to false
    polyline: false,
    marker: false,
    circlemarker: false,
    rectangle: false
  },
  edit: {
    featureGroup: editableLayers, //REQUIRED!!
    edit: false,
    remove: false
  }
};

// Initialise the draw control and pass it the FeatureGroup of editable layers
var drawControl = new L.Control.Draw(drawPluginOptions);
map.addControl(drawControl);

var subscriptionUnderConstruction;

map.on('draw:created', function(e) {
    var type = e.layerType,
        layer = e.layer;
    editableLayers.addLayer(layer);

    subscriptionForm.init(layer);
});

