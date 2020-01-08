"""
Copyright 2019 EUROCONTROL
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
from datetime import datetime, timezone
from functools import partial
from socket import SocketIO
from typing import Any

import proton
from flask import current_app
from geofencing_service_client.geofencing_service import GeofencingServiceClient
from geofencing_service_client.models import UASZonesFilter, AirspaceVolume, Point, CodeVerticalReferenceType
from pubsub_facades.geofencing_pubsub import GeofencingSubscriber
from rest_client.errors import APIError
from swim_backend.local import AppContextProxy

from geofencing_viewer.utils import handle_geofencing_service_response

_logger = logging.getLogger(__name__)

SUBSCRIPTIONS = {}


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


def _get_initial_uas_zones_filter():
    return UASZonesFilter(
        airspace_volume=AirspaceVolume(
            polygon=[
                Point(50.901767, 4.371125),
                Point(50.866953, 4.224330),
                Point(50.788595, 4.342881),
                Point(50.846430, 4.535647),
                Point(50.901767, 4.371125)
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


@handle_geofencing_service_response
def _get_initial_uas_zones():
    gs_reply = gs_client.filter_uas_zones(_get_initial_uas_zones_filter())

    return {'uas_zones': [uas_zone.to_json() for uas_zone in gs_reply.uas_zone_list]}


def message_consumer(message: proton.Message, sio: SocketIO):
    sio.emit('uas_zones_update', {'uas_zones': message.body['uas_zones']})


@handle_geofencing_service_response
def _subscribe(data: Any, sio: SocketIO, geofencing_subscriber: GeofencingSubscriber):
    uas_zones_filter = UASZonesFilter.from_json(data['uasZonesFilter'])

    subscription = geofencing_subscriber.subscribe(uas_zones_filter,
                                                   message_consumer=partial(message_consumer, sio=sio))

    _logger.info(f"Subscribed to queue: {subscription.queue}")
    SUBSCRIPTIONS[subscription.id] = subscription

    return {
        'subscriptionID': subscription.id,
        'publicationLocation': subscription.queue,
        'uas_zones_filter': data['uasZonesFilter']
    }


@handle_geofencing_service_response
def _pause(data: Any, geofencing_subscriber: GeofencingSubscriber):
    subscription = SUBSCRIPTIONS[data['subscriptionID']]
    geofencing_subscriber.pause(subscription)


@handle_geofencing_service_response
def _resume(data: Any, geofencing_subscriber: GeofencingSubscriber):
    subscription = SUBSCRIPTIONS[data['subscriptionID']]
    geofencing_subscriber.resume(subscription)


@handle_geofencing_service_response
def _unsubscribe(data: Any, geofencing_subscriber: GeofencingSubscriber):
    subscription = SUBSCRIPTIONS[data['subscriptionID']]
    geofencing_subscriber.unsubscribe(subscription)


###################
# SocketIO handlers
###################

def on_connect(sio):
    sio.emit('uas_zones', _get_initial_uas_zones())


def on_subscribe(data: Any, sio: SocketIO, geofencing_subscriber: GeofencingSubscriber):
    sio.emit('subscribe:response', {'response': _subscribe(data, sio, geofencing_subscriber)})


def on_pause(data: Any, sio: SocketIO, geofencing_subscriber: GeofencingSubscriber):
    sio.emit('pause:response', {'response': _pause(data, geofencing_subscriber)})


def on_resume(data: Any, sio: SocketIO, geofencing_subscriber: GeofencingSubscriber):
    sio.emit('resume:response', {'response': _resume(data, geofencing_subscriber)})


def on_unsubscribe(data: Any, sio: SocketIO, geofencing_subscriber: GeofencingSubscriber):
    sio.emit('unsubscribe:response', {'response': _unsubscribe(data, geofencing_subscriber)})
