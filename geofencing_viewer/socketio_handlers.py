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
import uuid
from datetime import datetime, timezone
from functools import partial

import proton
from flask import current_app
from geofencing_service_client.geofencing_service import GeofencingServiceClient
from geofencing_service_client.models import UASZonesFilter, AirspaceVolume, Point, CodeVerticalReferenceType, \
    SubscribeToUASZonesUpdatesReply, GenericReply, RequestStatus, UASZone
from pubsub_facades.geofencing_pubsub import Subscription
from rest_client.errors import APIError
from swim_backend.local import AppContextProxy


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


def on_connect(sio):
    uas_zones_filter = _get_initial_uas_zones_filter()
    try:
        reply = gs_client.filter_uas_zones(uas_zones_filter)
        sio.emit('uas_zones', {'uas_zones': [uas_zone.to_json() for uas_zone in reply.uas_zone_list]})
    except APIError as e:
        _logger.error(f"Geofencing Service error: {str(e)}")


def message_consumer(message: proton.Message, sio):
    uas_zones_data = message.body

    sio.emit('uas_zones_update', uas_zones_data)


def on_subscribe(data, sio, subscriber):
    uas_zones_filter_json = data['uasZonesFilter']

    uas_zones_filter = UASZonesFilter.from_json(uas_zones_filter_json)

    try:
        subscription = subscriber.subscribe(uas_zones_filter, message_consumer=partial(message_consumer, sio=sio))

        # subscription = Subscription(id=uuid.uuid4().hex[:6], queue=uuid.uuid4().hex)

        socket_response = {
            'status': 'OK',
            'subscriptionID': subscription.id,
            'publicationLocation': subscription.queue
        }

        _logger.info(subscription.id, subscription.queue)
    except APIError as e:
        _logger.error(str(e))
        socket_response = {
            'status': 'NOK',
            'error': e.detail
        }

    socket_response['uas_zones_filter'] = uas_zones_filter_json

    sio.emit('subscribed', {'response': socket_response})
