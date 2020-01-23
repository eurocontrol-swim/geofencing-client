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

__author__ = "EUROCONTROL (SWIM)"

import json
import logging
from datetime import timezone, datetime
from functools import partial
from typing import List, Optional, Dict

import proton
from flask import current_app
from geofencing_service_client.geofencing_service import GeofencingServiceClient
from geofencing_service_client.models import UASZonesFilter, AirspaceVolume, Point, CodeVerticalReferenceType, \
    UASZoneSubscriptionReplyObject, UASZone
from pubsub_facades.geofencing_pubsub import GeofencingSubscriber
from swim_backend.local import AppContextProxy

_logger = logging.getLogger(__name__)


# keeps the subscription ids in memory in order to be passed in front-end upon message reception
SUBSCRIPTIONS: Dict[UASZonesFilter, str] = {}

# keeps the messages coming from the broker until they are picked up upon front-end polling
MESSAGE_QUEUE = []


def _get_geofencing_service_client():
    return GeofencingServiceClient.create(
        host=current_app.config['SUBSCRIPTION-MANAGER-API']['host'],
        https=current_app.config['SUBSCRIPTION-MANAGER-API']['https'],
        timeout=current_app.config['SUBSCRIPTION-MANAGER-API']['timeout'],
        verify=current_app.config['SUBSCRIPTION-MANAGER-API']['verify'],
        username=current_app.config['SUBSCRIPTION-MANAGER-API']['username'],
        password=current_app.config['SUBSCRIPTION-MANAGER-API']['password']
    )


gs_client = AppContextProxy(_get_geofencing_service_client)


def get_hashable_uas_zones_filter(uas_zones_filter: UASZonesFilter):
    return json.dumps(uas_zones_filter.to_json())


def get_initial_uas_zones_filter():
    return UASZonesFilter(
        airspace_volume=AirspaceVolume(
            polygon=[
                Point(lat=50.901767, lon=4.371125),
                Point(lat=50.866953, lon=4.224330),
                Point(lat=50.788595, lon=4.342881),
                Point(lat=50.846430, lon=4.535647),
                Point(lat=50.901767, lon=4.371125)
            ],
            lower_limit_in_m=0,
            upper_limit_in_m=100000,
            upper_vertical_reference=CodeVerticalReferenceType.AGL,
            lower_vertical_reference=CodeVerticalReferenceType.AGL
        ),
        start_date_time=datetime(2020, 1, 1, tzinfo=timezone.utc),
        end_date_time=datetime(2021, 1, 1, tzinfo=timezone.utc),
        regions=[1],
        request_id='1'
    )


def get_subscriptions() -> List[UASZoneSubscriptionReplyObject]:
    uas_zone_subscriptions_reply = gs_client.get_subscriptions()

    return uas_zone_subscriptions_reply.uas_zone_subscriptions


def get_subscription(subscription_id: str) -> UASZoneSubscriptionReplyObject:
    return gs_client.get_subscription_by_id(subscription_id).uas_zone_subscription


def get_uas_zones(uas_zones_filter: UASZonesFilter) -> List[UASZone]:
    gs_reply = gs_client.filter_uas_zones(uas_zones_filter=uas_zones_filter)

    return gs_reply.uas_zone_list


def geofencing_subscriber_message_consumer(message: proton.Message, uas_zones_filter: UASZonesFilter):
    _logger.info(f"Received message: {message.body}")
    MESSAGE_QUEUE.append({'data': message.body, 'subscription_id': SUBSCRIPTIONS[uas_zones_filter]})


def preload_geofencing_subscriber(subscriber: GeofencingSubscriber):
    subscriptions_reply = gs_client.get_subscriptions()

    for subscription in subscriptions_reply.uas_zone_subscriptions:

        # keep the subscription_id in memory
        SUBSCRIPTIONS[get_hashable_uas_zones_filter(subscription.uas_zones_filter)] = subscription.subscription_id

        subscriber.preload_queue_message_consumer(
            queue=subscription.publication_location,
            message_consumer=partial(geofencing_subscriber_message_consumer,
                                     uas_zones_filter=subscription.uas_zones_filter)
        )

        _logger.info(f'Added message_consumer for queue {subscription.publication_location}')
