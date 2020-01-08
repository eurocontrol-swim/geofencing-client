
"use strict"

function finalizeSubscription(response) {
//    var subscription = subscriptionsList.getByPolygon(response.uas_zones_filter.airspaceVolume.polygon)
    var subscription = subscriptionUnderConstruction;

    if (response.status == 'NOK') {
//        subscriptionsList.remove(subscription);

        map.removeLayer(subscription.polygonLayer);

        showError(response.error);
    } else {
        subscription.finalize(response.subscriptionID, response.publicationLocation);
        map.addLayer(subscription.polygonLayer);
        subscription.polygonLayer.bringToBack();

        subscriptionsList.add(subscription);
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
