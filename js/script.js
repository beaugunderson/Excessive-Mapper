var baseUrl = false;

var map;

var initialLocation;
var browserSupportFlag = new Boolean();

var start = convertToRGB('#ff0000');
var end = convertToRGB('#00ff00');

var first;
var last;

var simpleMapStyle = [
  {
    featureType: "road.highway",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "road.arterial",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "road.local",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "landscape.natural",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "landscape.man_made",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "poi.park",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "administrative.locality",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "administrative.land_parcel",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "transit.line",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "transit.station",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "administrative.province",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "administrative.country",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "water",
    elementType: "labels",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "poi",
    stylers: [
      { visibility: "off" }
    ]
  },{
    featureType: "landscape",
    elementType: "geometry",
  }
];

$(document).ready(function() {
   if(baseUrl === false) window.alert("Couldn't find your locker, you might need to add a config.js (see https://me.singly.com/Me/devdocs/)");
});

$(function() {
   var url = baseUrl + '/Me/places/';

   $('#url').html('<a href="' + url + '">' + url + '</a>');

   /* Map setup */
   initialLocation = google.maps.LatLng(38.6, -98.0);

   var myOptions = {
      zoom: 10,
      center: initialLocation,
      mapTypeControlOptions: {
         mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'simple_map']
      }
   };

   var simpleMapType = new google.maps.StyledMapType(simpleMapStyle, {
      name: "Simple Map"
   });

   map = new google.maps.Map(document.getElementById("map"), myOptions);

   map.mapTypes.set('simple_map', simpleMapType);
   map.setMapTypeId('simple_map');

   /* Get the user's location */
   if (navigator.geolocation) {
      browserSupportFlag = true;

      navigator.geolocation.getCurrentPosition(function(position) {
         initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

         process_location_dependent_apis(initialLocation);
      }, function() {
         handleNoGeolocation(browserSupportFlag);
      });
   } else {
      browserSupportFlag = false;

      handleNoGeolocation(browserSupportFlag);
   }

   function handleNoGeolocation(errorFlag) {
      process_location_dependent_apis(initialLocation);

      //var swBound = new google.maps.LatLng(output.min_lat, output.min_lon);
      //var neBound = new google.maps.LatLng(output.max_lat, output.max_lon);

      //var bounds = new google.maps.LatLngBounds(swBound, neBound);

      //map.fitBounds(bounds);
   }

   $.getJSON(url, { 'limit': 1000, 'sort': 'at', 'order': 1 }, function(data) {
      first = data[0].at;
      last = data[data.length - 1].at;

      console.log(first, last);

      data = _.filter(data, function(item) {
         return item.me === true;
      });

      data = _.reject(data, function(item) {
         return item.lat === 0 &&
            item.lng === 0;
      });

      addLines(data);

      _.each(data, function(item, index, list) {
         add_marker(item);
      });
   });
});

function hex(c) {
   var s = "0123456789abcdef";
   var i = parseInt(c);

   if (i == 0 || isNaN(c))
      return "00";

   i = Math.round (Math.min (Math.max (0, i), 255));

   return s.charAt ((i - i % 16) / 16) + s.charAt (i % 16);
}

/* Convert an RGB triplet to a hex string */
function convertToHex (rgb) {
   return '#' + hex(rgb[0]) + hex(rgb[1]) + hex(rgb[2]);
}

/* Remove '#' in color hex string */
function trim (s) {
   return (s.charAt(0) == '#') ? s.substring(1, 7) : s;
}

/* Convert a hex string to an RGB triplet */
function convertToRGB(hex) {
   var color = [];

   color[0] = parseInt((trim(hex)).substring (0, 2), 16);
   color[1] = parseInt((trim(hex)).substring (2, 4), 16);
   color[2] = parseInt((trim(hex)).substring (4, 6), 16);

   return color;
}

function blendColor(percentage) {
   var c = [];

   c[0] = start[0] * percentage + (1 - percentage) * end[0];
   c[1] = start[1] * percentage + (1 - percentage) * end[1];
   c[2] = start[2] * percentage + (1 - percentage) * end[2];

   return convertToHex(c);
}

var lastCoordinate = null;

function addLines(data) {
   _.each(data, function(item, index, list) {
      var currentCoordinate = new google.maps.LatLng(item.lat, item.lng);

      console.log(currentCoordinate, item.lat, item.lng);

      if (lastCoordinate != null) {
         var coordinates = [
            lastCoordinate,
            currentCoordinate
         ];

         //console.log(coordinates);
         console.log(last - first, last - item.at);

         var userPath = new google.maps.Polyline({
            path: coordinates,
            strokeColor: blendColor((last - item.at) / (last - first)),
            strokeOpacity: 0.5,
            strokeWeight: 2,
            geodesic: true
         });

         userPath.setMap(map);
      }

      lastCoordinate = currentCoordinate;
   });
}

function process_location_dependent_apis(loc) {
   map.setCenter(loc);

   /* Last.fm */
   last_fm_events(loc);
}

function add_marker(item) {
   var point = new google.maps.LatLng(
      item.lat,
      item.lng);

   var at = new moment(item.at);

   var title = sprintf('%s - %s', item.title, at.fromNow());

   switch (item.network) {
      case 'twitter':
         title = sprintf('%s - %s - %s', item.text, item.title, at.fromNow());
         break;
      case 'foursquare':
         break;
      case 'facebook':
         break;
   }

   var marker = new google.maps.Marker({
      position: point,
      icon: sprintf("img/icons/%s-icon.png", item.network),
      title: title,
      map: map
   });
}

function last_fm_events(center) {
   var LAST_FM_API_KEY = "7c54e029ae58a00acb284990211777c7";

   $.ajax({
      url: "/last-fm/?method=geo.getEvents",
      data: {
         limit: 50,
         lat: center.lat(),
         long: center.lng(),
         format: 'json',
         api_key: LAST_FM_API_KEY
      },
      success: function (data, text_status, request) {
         //console.log("last_fm_events", data);

         data.events.event.forEach(function (e, a, i) {
            var lat = e.venue.location['geo:point']['geo:lat'];
            var lng = e.venue.location['geo:point']['geo:long'];

            var point = new google.maps.LatLng(lat, lng);

            var marker = new google.maps.Marker({
               position: point,
               icon: "icons/last-fm-icon.png",
               title: e.title + " at " + e.venue.name,
               map: map
            });
         });
      }
   });
}

function blockchalk_chalks(loc) {
   $.ajax({
      //url: "http://blockchalk.com/api/v0.6/chalks",
      url: "/blockchalk/chalks",
      dataType: "json",
      data: {
         lat: loc.lat(),
         long: loc.lng(),
         consumer: 'blockchalk-social-map',
         format: 'json'
      },
      success: function(data, text_status, request) {
         //console.log("blockchalk_chalks", data);

         data.forEach(function (e, a, i) {
            var point = new google.maps.LatLng(e.coordinates.lat, e.coordinates.long);

            var marker = new google.maps.Marker({
               position: point,
               icon: "icons/blockchalk-icon.png",
               title: e.contents,
               map: map
            });
         });
      },
      error: ajax_error
   });
}
