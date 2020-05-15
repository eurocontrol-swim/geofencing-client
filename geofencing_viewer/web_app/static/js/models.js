
"use strict"

class UASZone {
    constructor(data) {
        this.data = this.processDates(data);

        this.polygonLayer = this.setUpPolygonLayer()
    }

    processDates(data) {
        // ApplicableTimePeriod
        data.applicability.startDateTime = removeTimeZoneInfo(data.applicability.startDateTime);
        data.applicability.endDateTime = removeTimeZoneInfo(data.applicability.endDateTime);

        // Daily Schedules
        for(var i = 0; i < data.applicability.schedule.length; i++) {
            data.applicability.schedule[i].startTime = removeTimeZoneInfo(data.applicability.schedule[i].startTime);
            data.applicability.schedule[i].endTime = removeTimeZoneInfo(data.applicability.schedule[i].endTime);
        }

        return data;
    }

    setUpPolygonLayer() {
        // TODO: check circle
        // TODO: check multiple layers
        const coordsLonLat = polygonLatLonToLonLat(this.data.geometry[0].horizontalProjection.coordinates);
        var polygonLayer = L.polygon(coordsLonLat).addTo(map);
        polygonLayer.setStyle({color: "red"})
        polygonLayer.bringToFront();

        return polygonLayer;
    }
}


class Subscription {
    constructor(id, publication_location, active, uasZonesFilter) {
        this.id = id;
        this.publication_location = publication_location;
        this.active = active;
        this.intersectingUASZonesIdentifiers = [];
        this.uasZonesFilter = this.processDates(uasZonesFilter);
        this.polygonLayer = this.setUpPolygonLayer();
    }

    processDates(uasZonesFilter) {
        uasZonesFilter.startDateTime = removeTimeZoneInfo(uasZonesFilter.startDateTime);
        uasZonesFilter.endDateTime = removeTimeZoneInfo(uasZonesFilter.endDateTime);

        return uasZonesFilter
    }

    setUpPolygonLayer() {
        // TODO: check circle
        const coordsLonLat = polygonLatLonToLonLat(this.uasZonesFilter.airspaceVolume.horizontalProjection.coordinates)
        var polygonLayer = L.polygon(coordsLonLat).addTo(map);
        polygonLayer.bringToBack();
        if (this.active) {
            polygonLayer.setStyle({color: "blue"});
        }
        else {
            polygonLayer.setStyle({color: "black"});
        }

        return polygonLayer;
    }
}


var UASZonesList = new Vue({
    el: '#uaszones-modals-list',
    data: {
        uaszones: []
    },
    methods: {
        add: function(data){
            if (this.getByIdentifier(data.identifier) == undefined) {
                var uaszone = new UASZone(data);
                uaszone.polygonLayer.addEventListener('click', function(event) {
                    getModalForUASZone(uaszone).modal('toggle');
                });
                this.uaszones.push(uaszone);
            }
        },
        remove: function(uaszone) {
            if (uaszone != undefined) {
                map.removeLayer(uaszone.polygonLayer);
                this.uaszones.splice(this.uaszones.indexOf(uaszone), 1);
            }
        },
        getByIdentifier(identifier) {
            return this.uaszones.filter((zone) => zone.data.identifier == identifier)[0];
        },
        updateUASZones(uasZonesData, subscription) {
            self=this;
            uasZonesData.forEach(function(data) {
                self.add(data);
                subscription.intersectingUASZonesIdentifiers.push(data.identifier);
            });

            var updatedIdentifiers = uasZonesData.map((zone) => zone.identifier);
            var zonesIdentifiersToDelete = subscription.intersectingUASZonesIdentifiers.filter((id) => updatedIdentifiers.indexOf(id) < 0);

            zonesIdentifiersToDelete.forEach(function(id) {
                self.remove(self.getByIdentifier(id));
            });
        }
    }
});


Vue.component('uaszone-modal-item', {
  props: ['uaszone'],
  computed: {
    reasonStr: function() {
        return this.uaszone.data.reason.join();
    },
//    applicabilityStartDateTime: function() {
//        return removeTimeZoneInfo(this.uaszone.data.applicability.startDateTime);
//    },
//    applicabilityEndDateTime: function() {
//        return removeTimeZoneInfo(this.uaszone.data.applicability.endDateTime);
//    },
//    scheduleStartTime: function(index) {
//        return removeTimeZoneInfo(this.uaszone.data.applicability.schedule[index].startTime);
//    }
  },
  // TODO: check multiple geometry objects
  template: `
        <div class="modal fade uaszone-modal" tabindex="-1" role="dialog" aria-hidden="true">
            <span hidden>{{ uaszone.data.identifier }}</span>
		  <div class="modal-dialog  modal-lg" role="document">
			<div class="modal-content">
			  <div class="modal-header">
				<h5 class="modal-title" >UAS Zone | {{ uaszone.data.name }} ({{ uaszone.data.country }}{{ uaszone.data.identifier }})</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
				  <span aria-hidden="true">&times;</span>
				</button>
			  </div>
			<form v-on:submit.prevent="subscribe">
			    <fieldset disabled>
			  <div class="modal-body">

			  <h5>Geometry</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Upper Limit (meters)</label>
					<input type="text" v-model="uaszone.data.geometry[0].upperLimit" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Upper Limit Reference</label>
					<input type="text" v-model="uaszone.data.geometry[0].upperVerticalReference" class="form-control" required>
				  </div>
				</div>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Lower Limit (meters)</label>
					<input type="text" v-model="uaszone.data.geometry[0].lowerLimit" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Lower Limit Reference</label>
					<input type="text" v-model="uaszone.data.geometry[0].lowerVerticalReference" class="form-control" required>
				  </div>
			  </div>
			  <hr>

			  <h5>Applicability</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">

					<label class="col-form-label">Start Date Time</label>
					<input v-model="uaszone.data.applicability.startDateTime" type="datetime-local" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">End Date Time</label>
					<input v-model="uaszone.data.applicability.endDateTime" type="datetime-local" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Permanent</label>
					<input v-model="uaszone.data.applicability.permanent" class="form-control">
				  </div>
			  </div>

              <h6>Schedule</h6>
			  <div class="form-row form-group" v-for="(daily, index) in uaszone.data.applicability.schedule">
				  <div class="col-md-4 mb-3">
					<label v-if="index == 0" class="col-form-label">Day</label>
					<input v-model="daily.day" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label v-if="index == 0" class="col-form-label">Start Time</label>
					<input v-model="daily.startTime" type="time" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label v-if="index == 0" class="col-form-label">End Time</label>
					<input v-model="daily.endTime" type="time" class="form-control">
				  </div>
			  </div>
			  <hr>

			  <h5>Authority</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Name</label>
					<input v-model="uaszone.data.zoneAuthority.name" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Contact name</label>
					<input v-model="uaszone.data.zoneAuthority.contactName" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Service</label>
					<input v-model="uaszone.data.zoneAuthority.service" class="form-control">
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Email</label>
					<input v-model="uaszone.data.zoneAuthority.email" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Site URL</label>
					<input v-model="uaszone.data.zoneAuthority.siteURL" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Phone</label>
					<input v-model="uaszone.data.zoneAuthority.phone" class="form-control">
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Purpose</label>
					<input v-model="uaszone.data.zoneAuthority.purpose" class="form-control">
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Interval before</label>
					<input v-model="uaszone.data.zoneAuthority.intervalBefore" class="form-control">
				  </div>
			  </div>

			  <h5>Misc</h5>
                  <div class="form-row form-group">
                      <div class="col-md-4 mb-3">

                        <label class="col-form-label">Type</label>
                        <input v-model="uaszone.data.type" class="form-control" required>
                      </div>
                      <div class="col-md-4 mb-3">
                        <label class="col-form-label">Reason</label>
                        <input v-model="uaszone.data.reasonStr" class="form-control" required>
                      </div>
                      <div class="col-md-4 mb-3">
                        <label class="col-form-label">Other reason info</label>
                        <input v-model="uaszone.data.otherReasonInfo" class="form-control" required>
                      </div>
                      <div class="col-md-4 mb-3">
                        <label class="col-form-label">Regulation exemption</label>
                        <input v-model="uaszone.data.regulationExemption" class="form-control">
                      </div>
                  </div>

                  <div class="form-row form-group">
                      <div class="col-md-4 mb-6">

                        <label class="col-form-label">Restriction</label>
                        <input v-model="uaszone.data.restriction" class="form-control" required>
                      </div>
                      <div class="col-md-4 mb-6">
                        <label class="col-form-label">Restriction Conditions</label>
                        <input v-model="uaszone.data.restrictionConditions" class="form-control" required>
                      </div>
                  </div>

                  <div class="form-row form-group">
                      <div class="col-md-4 mb-6">

                        <label class="col-form-label">U Space Class</label>
                        <input v-model="uaszone.data.uSpaceClass" class="form-control" required>
                      </div>
                      <div class="col-md-4 mb-6">
                        <label class="col-form-label">Region</label>
                        <input v-model="uaszone.data.region" class="form-control" required>
                      </div>
                  </div>

			  </div>
			  </fieldset>
			</form>
			</div>
		  </div>
		</div>
    `
});


var subscriptionsList = new Vue({
    el: '#subscriptions-modals-list',
    data: {
        subscriptions: []
    },
    methods: {
        add: function(sub_data){
            if (this.getById(sub_data.subscriptionID) == undefined) {
                var subscription = new Subscription(
                    sub_data.subscriptionID,
                    sub_data.publicationLocation,
                    sub_data.active,
                    sub_data.UASZonesFilter
                );
                subscription.polygonLayer.addEventListener('click', function(event) {
                    getModalForSubscription(subscription).modal('toggle');
                });
                this.subscriptions.push(subscription)
            }
        },
        getById(id) {
            return this.subscriptions.filter((sub) => sub.id == id)[0];
        },
//        getByPolygon: function(polygon) {
//            return this.subscriptions.filter((sub) => JSON.stringify(sub.uasZonesFilter.airspaceVolume.polygon) == JSON.stringify(polygon))[0];
//        },
        remove: function(subscription) {
            this.subscriptions.splice(this.subscriptions.indexOf(subscription), 1)
        }
    }
})

Vue.component('subscription-modal-item', {
  props: ['subscription'],
  template: `
        <div class="modal fade subscription-modal" tabindex="-1" role="dialog" aria-hidden="true">
            <span hidden>{{ subscription.id }}</span>
		  <div class="modal-dialog  modal-lg" role="document">
			<div class="modal-content">
			  <div class="modal-header">
				<h5 class="modal-title" id="exampleModalLabel">Subscription to UAS Zones updates - {{ subscription.id }}</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Close">
				  <span aria-hidden="true">&times;</span>
				</button>
			  </div>
			<form v-on:submit.prevent="subscribe">
			    <fieldset disabled>
			  <div class="modal-body">

			  <h5>Airspace Volume</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Upper Limit (meters)</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.upperLimit" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Upper Limit Reference</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.upperVerticalReference" class="form-control" required>
				  </div>
				</div>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Lower Limit (meters)</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.lowerLimit" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Lower Limit Reference</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.lowerVerticalReference" class="form-control" required>
				  </div>
			  </div>
			  <hr>

			  <h5>Time period</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">

					<label class="col-form-label">Start Date Time</label>
					<input v-model="subscription.uasZonesFilter.startDateTime" type="datetime-local" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">End Date Time</label>
					<input v-model="subscription.uasZonesFilter.endDateTime" type="datetime-local" class="form-control" required>
				  </div>
			  </div>
			  <hr>

			  <h5>Misc</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Regions</label>
					<input v-model="subscription.uasZonesFilter.regions" type="text" class="form-control">
				  </div>
			  </div>
			  </div>
			  </fieldset>
			</form>
			  <div class="modal-footer">
				<button v-if="subscription.active" type="submit" class="btn btn-primary" v-on:click="pauseResume(subscription)" ref="pauseResume">Pause</button>
				<button v-else="subscription.active" type="submit" class="btn btn-primary" v-on:click="pauseResume(subscription)" ref="pauseResume">Resume</button>
        		<button type="button" class="btn btn-danger" data-dismiss="modal" v-on:click="unsubscribe(subscription)">Unsubscribe</button>
			  </div>
			</div>
		  </div>
		</div>
        `,
    methods: {
        unsubscribe: function(subscription) {

            $.ajax({
                type: "GET",
                url: "/unsubscribe/" + subscription.id,
                dataType : "json",
                contentType: "application/json; charset=utf-8",
                success : function(result) {
                    if (result.status == 'NOK') {
                        console.log(result.error)
                        showError("Failed to unsubscribe");
                    }
                },
            });

            map.removeLayer(subscription.polygonLayer);
            subscriptionsList.remove(subscription);
            getModalForSubscription(subscription).modal('hide');

        },
        pauseResume: function(subscription) {
            self=this;
            if (subscription.active) {
                $.ajax({
                    type: "GET",
                    url: "/pause/" + subscription.id,
                    dataType : "json",
                    contentType: "application/json; charset=utf-8",
                    success : function(result) {
                        if (result.status == 'NOK') {
                            console.log(result.error)
                            showError("Failed to pause subscription");
                        }
                        subscription.active = false;
                        self.$refs.pauseResume.innerHTML = 'Resume';
                        subscription.polygonLayer.setStyle({color: "black"});
                    },
                });

            }
            else {
                $.ajax({
                    type: "GET",
                    url: "/resume/" + subscription.id,
                    dataType : "json",
                    contentType: "application/json; charset=utf-8",
                    success : function(result) {
                        if (result.status == 'NOK') {
                            console.log(result.error)
                            showError("Failed to resume subscription");
                        }

                        subscription.active = true;
                        self.$refs.pauseResume.innerHTML = 'Pause';
                        subscription.polygonLayer.setStyle({color: "blue"});

                        UASZonesList.updateUASZones(result.uas_zones, subscription);
                    },
                });

            }
            getModalForSubscription(subscription).modal('hide');
        }
    }
})



function getModalForUASZone(uaszone) {
    return $(".uaszone-modal").filter(function(index){
        return $(this).find('span').html() == uaszone.data.identifier;
    })
}

function getModalForSubscription(subscription) {
    return $(".subscription-modal").filter(function(index){
        return $(this).find('span').html() == subscription.id;
    })
}
