"""
Copyright 2020 EUROCONTROL
==========================================

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
   disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
   disclaimer in the documentation and/or other materials provided with the distribution.
3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products
   derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

==========================================

Editorial note: this license is an instance of the BSD license template as provided by the Open Source Initiative:
http://opensource.org/licenses/BSD-3-Clause

Details on EUROCONTROL: http://www.eurocontrol.int
"""
import logging
from functools import partial

from flask import Blueprint, send_from_directory, request, current_app

__author__ = "EUROCONTROL (SWIM)"

from geofencing_service_client.models import UASZonesFilter, UASZone

from geofencing_viewer.utils import handle_geofencing_service_response
from geofencing_viewer.web_app.helpers import get_subscriptions, get_uas_zones, get_initial_uas_zones_filter, \
    MESSAGE_QUEUE, SUBSCRIPTIONS, geofencing_subscriber_message_consumer, get_subscription, \
    get_hashable_uas_zones_filter

_logger = logging.getLogger(__name__)

geofencing_viewer_blueprint = Blueprint('geofencing_viewer',
                                        __name__,
                                        template_folder='templates',
                                        static_folder='static')

########
# STATIC
########


@geofencing_viewer_blueprint.route("/")
def index():
    return send_from_directory('web_app/templates/', "index.html")


@geofencing_viewer_blueprint.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('web_app/static/js', path)


@geofencing_viewer_blueprint.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('web_app/static/css', path)


@geofencing_viewer_blueprint.route('/img/<path:path>')
def send_img(path):
    return send_from_directory('web_app/static/img', path)


@geofencing_viewer_blueprint.route('/favicon.ico')
def favicon():
    return send_from_directory('web_app/static/img', 'geofence.png', mimetype='image/png')


#####
# API
#####

@geofencing_viewer_blueprint.route("/all")
@handle_geofencing_service_response
def all_data():
    subscriptions = get_subscriptions()

    uas_zones_dict = {
        zone.identifier: zone for zone in get_uas_zones(uas_zones_filter=get_initial_uas_zones_filter())
    }

    for subscription in subscriptions:
        sub_zones = get_uas_zones(uas_zones_filter=subscription.uas_zones_filter)
        for sub_zone in sub_zones:
            uas_zones_dict[sub_zone.identifier] = sub_zone

    return {
        'uas_zones': [zone.to_json() for zone in uas_zones_dict.values()],
        'subscriptions': [sub.to_json() for sub in subscriptions]
    }


@geofencing_viewer_blueprint.route("/subscribe", methods=['POST'])
@handle_geofencing_service_response
def subscribe():
    data = request.get_json()
    uas_zones_filter = UASZonesFilter.from_json(data['uasZonesFilter'])

    subscription = current_app.geofencing_subscriber.subscribe(
        uas_zones_filter, message_consumer=partial(geofencing_subscriber_message_consumer,
                                                   uas_zones_filter=uas_zones_filter))

    _logger.info(f"Subscribed to queue: {subscription.queue}")

    SUBSCRIPTIONS[get_hashable_uas_zones_filter(uas_zones_filter)] = subscription.id

    return {
        'subscriptionID': subscription.id,
        'publicationLocation': subscription.queue,
        'active': False,
        'UASZonesFilter': data['uasZonesFilter']
    }


@geofencing_viewer_blueprint.route("/unsubscribe/<subscription_id>")
@handle_geofencing_service_response
def unsubscribe(subscription_id):
    current_app.geofencing_subscriber.unsubscribe(subscription_id)
    return {}


@geofencing_viewer_blueprint.route("/pause/<subscription_id>")
@handle_geofencing_service_response
def pause(subscription_id):
    current_app.geofencing_subscriber.pause(subscription_id)
    return {}


@geofencing_viewer_blueprint.route("/resume/<subscription_id>")
@handle_geofencing_service_response
def resume(subscription_id):
    current_app.geofencing_subscriber.resume(subscription_id)
    subscription = get_subscription(subscription_id)
    uas_zones = get_uas_zones(subscription.uas_zones_filter)

    return {'uas_zones': [UASZone.to_json(zone) for zone in uas_zones]}


@geofencing_viewer_blueprint.route("/poll")
def poll():
    try:
        message = MESSAGE_QUEUE.pop(0)
    except IndexError:
        message = {}

    return message
