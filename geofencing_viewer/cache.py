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
from typing import Dict, Any

from geofencing_service_client.models import UASZonesFilter


""" Holds the subscription ids in memory in order to be passed in front-end upon message reception"""
SUBSCRIPTIONS: Dict[str, str] = {}

""" Holds the messages coming from the broker until they are picked up upon front-end polling"""
MESSAGE_QUEUE = []


def _get_hashable_uas_zones_filter(uas_zones_filter: UASZonesFilter) -> str:
    return json.dumps(uas_zones_filter.to_json())


def get_subscription(uas_zones_filter: UASZonesFilter) -> str:
    return SUBSCRIPTIONS[_get_hashable_uas_zones_filter(uas_zones_filter)]


def save_subscription(uas_zones_filter: UASZonesFilter, subscription_id: str) -> None:
    SUBSCRIPTIONS[_get_hashable_uas_zones_filter(uas_zones_filter)] = subscription_id


def delete_subscription(subscription_id: str) -> None:
    for uas_zones_filter, sub_id in SUBSCRIPTIONS.items():
        if sub_id == subscription_id:
            del SUBSCRIPTIONS[uas_zones_filter]
            break


def add_queue_message(message: Dict[str, Any]) -> None:
    MESSAGE_QUEUE.append(message)


def remove_queue_message() -> Dict[str, Any]:
    try:
        message = MESSAGE_QUEUE.pop(0)
    except IndexError:
        message = {}

    return message
