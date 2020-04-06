FROM swim-base

LABEL maintainer="SWIM EUROCONTROL <http://www.eurocontrol.int>"

ENV PATH="/opt/conda/bin:$PATH"

RUN mkdir -p /app
WORKDIR /app

COPY requirements_pip.txt requirements_pip.txt
RUN pip3 install -r requirements_pip.txt

COPY geofencing_viewer ./geofencing_viewer

COPY . /source/
RUN set -x \
    && pip3 install /source \
    && rm -rf /source

RUN groupadd -r geofencing && useradd --no-log-init -md /home/geofencing -r -g geofencing geofencing

RUN chown -R geofencing:geofencing /app

USER geofencing

CMD ["python", "/app/geofencing_viewer/app.py"]
