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

import logging
from functools import partial, wraps
from typing import List

import proton
from flask import current_app
from geofencing_service_client.geofencing_service import GeofencingServiceClient
from geofencing_service_client.models import UASZonesFilter, UASZoneSubscriptionReplyObject, UASZone
from pubsub_facades.geofencing_pubsub import GeofencingSubscriber
from rest_client.errors import APIError
from swim_backend.local import AppContextProxy

from geofencing_viewer import cache

_logger = logging.getLogger(__name__)


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


def handle_geofencing_service_response(f):
    @wraps(f)
    def decorator(*args, **kwargs):
        try:
            response = f(*args, **kwargs)

            if response is None:
                response = {}

            response['status'] = 'OK'
        except APIError as e:
            _logger.error(str(e))
            response = {
                'status': 'NOK',
                'error': e.detail
            }
        return response
    return decorator


def get_initial_uas_zones_filter():
    """
    Loads the initial uas zones filter from config which will be used to load the initial uas zones from geofencing
    service
    :return:
    """
    try:
        _logger.info(current_app.config['INITIAL_UAS_ZONES_FILTER'])
        return UASZonesFilter.from_json(current_app.config['INITIAL_UAS_ZONES_FILTER'])
    except Exception as e:
        _logger.exception(str(e))
        raise APIError(detail=str(e), status_code=500)


def get_subscriptions() -> List[UASZoneSubscriptionReplyObject]:
    uas_zone_subscriptions_reply = gs_client.get_subscriptions()

    return uas_zone_subscriptions_reply.subscriptions


def get_subscription(subscription_id: str) -> UASZoneSubscriptionReplyObject:
    return gs_client.get_subscription_by_id(subscription_id).subscription


def get_uas_zones(uas_zones_filter: UASZonesFilter) -> List[UASZone]:
    gs_reply = gs_client.filter_uas_zones(uas_zones_filter=uas_zones_filter)

    return gs_reply.uas_zone_list


def geofencing_subscriber_message_consumer(message: proton.Message, uas_zones_filter: UASZonesFilter):
    _logger.info(f"Received message: {message.body}")
    cache.add_queue_message({'data': message.body, 'subscription_id': cache.get_subscription(uas_zones_filter)})


def preload_geofencing_subscriber(subscriber: GeofencingSubscriber):
    """
    Fetches the existing subscriptions and creates the necessary AMQP1.0 receivers on their queues
    NOTE: to be used upon app initialization
    :param subscriber:
    """
    subscriptions_reply = gs_client.get_subscriptions()

    for subscription in subscriptions_reply.subscriptions:

        # keep the subscription id in memory
        cache.save_subscription(subscription.uas_zones_filter, subscription.subscription_id)

        subscriber.preload_queue_message_consumer(
            queue=subscription.publication_location,
            message_consumer=partial(geofencing_subscriber_message_consumer,
                                     uas_zones_filter=subscription.uas_zones_filter)
        )

        _logger.info(f'Added message_consumer for queue {subscription.publication_location}')

