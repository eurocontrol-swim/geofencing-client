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
import os

from flask import Flask
from pkg_resources import resource_filename
from pubsub_facades.geofencing_pubsub import GeofencingSubscriber
from swim_backend.config import load_app_config
from geofencing_viewer.geofencing_service import preload_geofencing_subscriber
from geofencing_viewer.web_app.views import geofencing_viewer_blueprint

__author__ = "EUROCONTROL (SWIM)"


def _get_config_path():
    current_dir = os.path.dirname(os.path.realpath(__file__))
    return os.path.join(current_dir, 'config.yml')


# the web app that renders the frontend
app = Flask(__name__)
app.register_blueprint(geofencing_viewer_blueprint)

app_config = load_app_config(filename=resource_filename(__name__, 'config.yml'))
app.config.update(app_config)


# The subscriber that receives data from the broker and interacts with the geofencing service
# It is started in the background so it can be used later
with app.app_context():
    app.geofencing_subscriber = GeofencingSubscriber.create_from_config(_get_config_path())
    app.geofencing_subscriber.run(threaded=True)

    # preload the consumers (AMQP1.0 receivers) in the broker
    preload_geofencing_subscriber(subscriber=app.geofencing_subscriber)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=3000)
