
"use strict"

class UASZone {
    constructor(data) {
        this.data = this.processDates(data);

        this.coords = geojsonCoordinatesFromPointList(this.data.airspaceVolume.polygon)
        this.polygonLayer = this.setUpPolygonLayer()
    }

    processDates(data) {
        // ApplicableTimePeriod
        data.applicableTimePeriod.startDateTime = removeTimeZoneInfo(data.applicableTimePeriod.startDateTime);
        data.applicableTimePeriod.endDateTime = removeTimeZoneInfo(data.applicableTimePeriod.endDateTime);

        // Daily Schedules
        for(var i = 0; i < data.applicableTimePeriod.dailySchedule.length; i++) {
            data.applicableTimePeriod.dailySchedule[i].startTime = removeTimeZoneInfo(data.applicableTimePeriod.dailySchedule[i].startTime);
            data.applicableTimePeriod.dailySchedule[i].endTime = removeTimeZoneInfo(data.applicableTimePeriod.dailySchedule[i].endTime);
        }

        // Data Source
        data.dataSource.creationDateTime = removeTimeZoneInfo(data.dataSource.creationDateTime);
        data.dataSource.updateDateTime = removeTimeZoneInfo(data.dataSource.updateDateTime);

        return data;
    }

    setUpPolygonLayer() {
        var polygonLayer = L.polygon(this.coords).addTo(map);
        polygonLayer.bringToBack();
        polygonLayer.setStyle({color: "red"})

        return polygonLayer;
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
        this.requestID = "";
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
        this.location = "";
        this.topic_name = "";
        this.active = false;
        this.intersectingUASZones = [];
        this.uasZonesFilter = isNullObject(polygonLayer) ? new UASZonesFilter({}) : new UASZonesFilter(polygonLayer.toGeoJSON());
    }

    finalize(id, location) {
        this.id = id;
        this.location = location
        this.active = true;
    }
}


var UASZonesList = new Vue({
    el: '#uaszones-modals-list',
    data: {
        uaszones: []
    },
    methods: {
        add: function(uaszone){

            if (!this.uasZoneExists(uaszone.data.identifier)){
                uaszone.polygonLayer.addEventListener('click', function(event) {
                    getModalForUASZone(uaszone).modal('toggle');
                });
                this.uaszones.push(uaszone);
            }
        },
        getByPolygon: function(polygon) {
            return this.uaszones.filter((uaszone) => JSON.stringify(uaszone.data.airspaceVolume.polygon) == JSON.stringify(polygon))[0];
        },
        remove: function(uaszone) {
            this.uaszones.splice(this.uaszones.indexOf(uaszone), 1)
        },
        uasZoneExists(identifier) {
            return this.uaszones.filter((uaszone) => uaszone.data.identifier == identifier).length > 0;
        }
    }
});


Vue.component('uaszone-modal-item', {
  props: ['uaszone'],
  computed: {
    reasonStr: function() {
        return this.uaszone.data.reason.join();
    },
    applicableTimePeriodStartDateTime: function() {
        return removeTimeZoneInfo(this.uaszone.data.applicableTimePeriod.startDateTime);
    },
    applicableTimePeriodEndDateTime: function() {
        return removeTimeZoneInfo(this.uaszone.data.applicableTimePeriod.endDateTime);
    },
    dailyScheduleStartTime: function(index) {
        return removeTimeZoneInfo(this.uaszone.data.applicableTimePeriod.dailySchedule[index].startTime);
    }
  },
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

			  <h5>Airspace Volume</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Upper Limit (meters)</label>
					<input type="text" v-model="uaszone.data.airspaceVolume.upperLimit" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Upper Limit Reference</label>
					<input type="text" v-model="uaszone.data.airspaceVolume.upperVerticalReference" class="form-control" required>
				  </div>
				</div>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Lower Limit (meters)</label>
					<input type="text" v-model="uaszone.data.airspaceVolume.lowerLimit" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label class="col-form-label">Lower Limit Reference</label>
					<input type="text" v-model="uaszone.data.airspaceVolume.lowerVerticalReference" class="form-control" required>
				  </div>
			  </div>
			  <hr>

			  <h5>Applicable time period</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">

					<label class="col-form-label">Start Date Time</label>
					<input v-model="uaszone.data.applicableTimePeriod.startDateTime" type="datetime-local" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">End Date Time</label>
					<input v-model="uaszone.data.applicableTimePeriod.endDateTime" type="datetime-local" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Permanent</label>
					<input v-model="uaszone.data.applicableTimePeriod.permanent" class="form-control">
				  </div>
			  </div>

              <h6>Daily Schedule</h6>
			  <div class="form-row form-group" v-for="(daily, index) in uaszone.data.applicableTimePeriod.dailySchedule">
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

			  <h5>Data Source</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">

					<label class="col-form-label">Creation Time</label>
					<input v-model="uaszone.data.dataSource.creationDateTime" type="datetime-local" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Update Time</label>
					<input v-model="uaszone.data.dataSource.updateDateTime" type="datetime-local" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Author</label>
					<input v-model="uaszone.data.dataSource.author" class="form-control">
				  </div>
			  </div>
			  <hr>

			  <h5>Authority</h5>
			  <h6>Requires notification to:</h6>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Name</label>
					<input v-model="uaszone.data.authority.requiresNotificationTo.authority.name" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Contact name</label>
					<input v-model="uaszone.data.authority.requiresNotificationTo.authority.contactName" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Service</label>
					<input v-model="uaszone.data.authority.requiresNotificationTo.authority.service" class="form-control">
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Email</label>
					<input v-model="uaszone.data.authority.requiresNotificationTo.authority.email" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Site URL</label>
					<input v-model="uaszone.data.authority.requiresNotificationTo.authority.siteURL" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Phone</label>
					<input v-model="uaszone.data.authority.requiresNotificationTo.authority.phone" class="form-control">
				  </div>
			  </div>
			  <h6>Requires authorization from:</h6>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Name</label>
					<input v-model="uaszone.data.authority.requiresAuthorizationFrom.authority.name" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Contact name</label>
					<input v-model="uaszone.data.authority.requiresAuthorizationFrom.authority.contactName" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Service</label>
					<input v-model="uaszone.data.authority.requiresAuthorizationFrom.authority.service" class="form-control">
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Email</label>
					<input v-model="uaszone.data.authority.requiresAuthorizationFrom.authority.email" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Site URL</label>
					<input v-model="uaszone.data.authority.requiresAuthorizationFrom.authority.siteURL" class="form-control" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label class="col-form-label">Phone</label>
					<input v-model="uaszone.data.authority.requiresAuthorizationFrom.authority.phone" class="form-control">
				  </div>
			  </div>
			  <hr>

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
                        <label class="col-form-label">Data Capture Prohibition</label>
                        <input v-model="uaszone.data.dataCaptureProhibition" class="form-control">
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
        add: function(subscription){
            subscription.polygonLayer.addEventListener('click', function(event) {
                getModalForSubscription(subscription).modal('toggle');
            });
            this.subscriptions.push(subscription)
        },
        getByPolygon: function(polygon) {
            return this.subscriptions.filter((sub) => JSON.stringify(sub.uasZonesFilter.airspaceVolume.polygon) == JSON.stringify(polygon))[0];
        },
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
			<form id="subscription-modal" v-on:submit.prevent="subscribe">
			    <fieldset disabled>
			  <div class="modal-body">

			  <h5>Airspace Volume</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label for="upperLimit" class="col-form-label">Upper Limit (meters)</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.upperLimit" class="form-control" id="upperLimit" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label for="upperVerticalRerefence" class="col-form-label">Upper Limit Reference</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.upperVerticalReference" class="form-control" id="upperVerticalReference" required>
				  </div>
				</div>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label for="lowerLimit" class="col-form-label">Lower Limit (meters)</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.lowerLimit" class="form-control" id="lowerLimit" required>
				  </div>
				  <div class="col-md-4 mb-6">
					<label for="lowerLimitReference" class="col-form-label">Lower Limit Reference</label>
					<input type="text" v-model="subscription.uasZonesFilter.airspaceVolume.lowerVerticalReference" class="form-control" id="lowerVerticalReference" required>
				  </div>
			  </div>
			  <hr>

			  <h5>Applicable time period</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-3">

					<label for="startDateTime" class="col-form-label">Start Date Time</label>
					<input v-model="subscription.uasZonesFilter.startDateTime" type="datetime-local" class="form-control" id="startDateTime" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label for="endDateTime" class="col-form-label">End Date Time</label>
					<input v-model="subscription.uasZonesFilter.endDateTime" type="datetime-local" class="form-control" id="endDateTime" required>
				  </div>
				  <div class="col-md-4 mb-3">
					<label for="updatedAfterDateTime" class="col-form-label">Updated After Date Time</label>
					<input v-model="subscription.uasZonesFilter.updatedAfterDateTime" type="datetime-local" class="form-control" id="updatedAfterDateTime">
				  </div>
			  </div>
			  <hr>

			  <h5>Misc</h5>
			  <div class="form-row form-group">
				  <div class="col-md-4 mb-6">
					<label for="startDateTime" class="col-form-label">Regions</label>
					<input v-model="subscription.uasZonesFilter.regions" type="text" class="form-control" id="regions">
				  </div>
				  <div class="col-md-4 mb-6">
					<label for="startDateTime" class="col-form-label">Request ID</label>
					<input v-model="subscription.uasZonesFilter.requestID" type="text" class="form-control" id="requestID">
				  </div>
			  </div>
			  </div>
			  </fieldset>
			</form>
			  <div class="modal-footer">
				<button type="submit" class="btn btn-primary" v-on:click="pauseResume(subscription)" ref="pauseResume">Pause</button>
        		<button type="button" class="btn btn-danger" data-dismiss="modal" v-on:click="unsubscribe(subscription)">Unsubscribe</button>
			  </div>
			</div>
		  </div>
		</div>
        `,
    methods: {
        unsubscribe: function(subscription) {
            socket.emit('unsubscribe', {subscriptionID: subscription.id})

            map.removeLayer(subscription.polygonLayer);
            subscriptionsList.remove(subscription);
            getModalForSubscription(subscription).modal('hide');

        },
        pauseResume: function(subscription) {
            if (subscription.active) {
                socket.emit('pause', {subscriptionID: subscription.id})

                subscription.active = false;
                this.$refs.pauseResume.innerHTML = 'Resume';
                subscription.polygonLayer.setStyle({color: "black"});
            }
            else {

                socket.emit('resume', {subscriptionID: subscription.id})
                subscription.active = true;
                this.$refs.pauseResume.innerHTML = 'Pause';
                subscription.polygonLayer.setStyle({color: "rgb(51, 136, 255)"});

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
