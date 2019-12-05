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

POLYGONS = {
    "basilique_polygon":  [
        [[50.863648, 4.329385],
         [50.865348, 4.328055],
         [50.868470, 4.317369],
         [50.867671, 4.314826],
         [50.865873, 4.315920],
         [50.862792, 4.326508],
         [50.863648, 4.329385]]
    ],
    "parc_royal": [
        [[50.846844, 4.362334],
         [50.843125, 4.360553],
         [50.842244, 4.364823],
         [50.845977, 4.366797],
         [50.846844, 4.362334]]
    ],
    "parc_du_cinquantenaire": [
        [[50.844065, 4.387284],
         [50.842222, 4.395417],
         [50.839485, 4.397841],
         [50.838055, 4.392970],
         [50.839681, 4.384977],
         [50.844065, 4.387284]]
    ],
    "bois_de_la_cambre": [
        [[50.814009, 4.367825],
         [50.815210, 4.376479],
         [50.795249, 4.400072],
         [50.788147, 4.381311],
         [50.805531, 4.376037],
         [50.805314, 4.372529],
         [50.814009, 4.367825]]
    ]
}


def _get_polygon(coords):
    return [{"LAT": lat, "LON": lon} for lat, lon in coords[0]]


def on_connect(sio):
    # uas_zones = geofencing_service.get_uas_zones()
    uas_zones = [
        {
            "airspaceVolume": {
                "polygon": _get_polygon(POLYGONS['basilique_polygon'])
            }
        },
        {
            "airspaceVolume": {
                "polygon": _get_polygon(POLYGONS['parc_royal'])
            }
        },
        {
            "airspaceVolume": {
                "polygon": _get_polygon(POLYGONS['parc_du_cinquantenaire'])
            }
        },
        {
            "airspaceVolume": {
                "polygon": _get_polygon(POLYGONS['bois_de_la_cambre'])
            }
        }
    ]
    sio.emit('uas_zones', {'uas_zones': uas_zones})
