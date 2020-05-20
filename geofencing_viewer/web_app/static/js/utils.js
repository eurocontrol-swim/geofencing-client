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

function removeTimeZoneInfo(dateString) {
    var [date, time] = dateString.split('T')

    if (time == undefined) {
        return dateString
    }

    time = time.split('+')[0].split('-')[0]

    return [date, time].join('T')
}


function latLonFromLonLat(coordinates) {
    return [coordinates[1], coordinates[0]]
}

function polygonLatLonFromLonLat(coordinates) {
    return coordinates.map((coord) => coord.map(latLonFromLonLat))
}

function isNullObject(obj) {
    return (Object.entries(obj).length === 0 && obj.constructor === Object)
}
