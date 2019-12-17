"use strict"

function getCurrentDate(monthsOffset) {
    var date = new Date();
    date.setMonth(date.getMonth() + monthsOffset)

    return date
}


function getDateString(date) {
    var isoDate = date.toISOString()
    var withoutTimezone = isoDate.split(".")[0]

    return withoutTimezone.slice(0, -3)
}


function getCurrentTimezoneString() {
    var timezone = new Date().getTimezoneOffset() / 60;
    var timezoneString = Math.abs(timezone).toString().padStart(2, "0")
    timezoneString = timezone < 0 ? "-" + timezoneString : "+" + timezoneString

    return timezoneString + ":00"
}


function pointListFromGeoJSONCoordinates(geoJSONCoordinates) {
    return geoJSONCoordinates.map(c => ({LAT: c[0], LON: c[1]}));
}


function geojsonCoordinatesFromPointList(pointList) {
    return pointList.map(p => [p['LAT'], p['LON']])
}

function isNullObject(obj) {
    return (Object.entries(obj).length === 0 && obj.constructor === Object)
}
