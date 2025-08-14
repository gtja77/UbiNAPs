// Inicializar el mapa
var map = L.map('map').setView([7, -66], 6);

// Capas base
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


// var cartoDB = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
//     attribution:'CARTO',
//     minZoom: 6,
//     maxZoom:23,
// }).addTo(map);

var Stadia_AlidadeSatellite = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
	minZoom: 0,
	maxZoom: 23,
	attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
	ext: 'jpg'
});

// Capas de grupos de puntos
var group1_8 = L.markerClusterGroup();
var group1_16 = L.markerClusterGroup();
var allNAPs = []; // Almacena todos los marcadores para búsquedas

// Iconos personalizados
var icon1_8 = L.icon({
    iconUrl: '/icon/nap8.png',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [1, -34],
    // shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    shadowSize: [41, 41]
});

var icon1_16 = L.icon({
    iconUrl: '/icon/nap16.png',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [1, -34],
    /* shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', */
    shadowSize: [41, 41]
});

var iconHighlight = L.icon({
    iconUrl: '/icon/resultado.png',
    iconSize: [35, 35],
    iconAnchor: [12, 12],
    popupAnchor: [1, -34],
    // shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    shadowSize: [41, 41]
});

// Función para calcular la distancia entre dos puntos (fórmula de Haversine)
function getDistance(lat1, lon1, lat2, lon2) {
  var R = 6371e3; // Radio de la Tierra en metros
  var φ1 = lat1 * Math.PI/180;
  var φ2 = lat2 * Math.PI/180;
  var Δφ = (lat2-lat1) * Math.PI/180;
  var Δλ = (lon2-lon1) * Math.PI/180;

  var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distancia en metros
}

// Cargar el archivo GeoJSON
fetch('./json/naps_ISP_19052025.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo GeoJSON: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                var popupContent = "<h4>" + feature.properties.NOMBRE + "</h4>" +
                                   "<p><b>Puertos:</b> " + feature.properties.PUERTOS + "</p>" +
                                   "<p><b>Latitud:</b> " + feature.properties.LAT + "</p>" +
                                   "<p><b>Longitud:</b> " + feature.properties.LNG + "</p>" +
                                   "<p><b>Red:</b> " + feature.properties.RED + "</p>";
                
                var marker;
                if (feature.properties.PUERTOS === '8') {
                    marker = L.marker(latlng, {icon: icon1_8}).bindPopup(popupContent);
                    group1_8.addLayer(marker);
                } else if (feature.properties.PUERTOS === '16') {
                    marker = L.marker(latlng, {icon: icon1_16}).bindPopup(popupContent);
                    group1_16.addLayer(marker);
                }
                
                allNAPs.push(marker); // Guardar todos los marcadores en un array
                return marker;
            }
        });
        
        map.addLayer(group1_8);
        map.addLayer(group1_16);
    })
    .catch(error => {
        console.error('Error al cargar o procesar el GeoJSON:', error);
        alert('Hubo un error al cargar los datos del mapa. Por favor, revisa la consola para más detalles.');
    });

// Capas para el control de capas
var baseLayers = {
    "OpenStreetMap": osm,
    /* "cartoDB": cartoDB, */
    "Satalite": Stadia_AlidadeSatellite
};

var overlayMaps = {
    "Cajas NAP 1:8": group1_8,
    "Cajas NAP 1:16": group1_16
};

L.control.layers(baseLayers, overlayMaps).addTo(map);

// Buscador de coordenadas
L.Control.geocoder({
    defaultMarkGeocode: false,
    placeholder: 'Buscar dirección o coordenadas...',
    position: 'topright'
})
.on('markgeocode', function(e) {
    // Restaurar los iconos originales de todos los NAPs
    allNAPs.forEach(function(marker) {
        if (marker.options.icon.options.iconUrl === iconHighlight.options.iconUrl) {
            var originalIcon = marker.feature.properties.PUERTOS === '8' ? icon1_8 : icon1_16;
            marker.setIcon(originalIcon);
        }
    });

    var searchCoords = e.geocode.center;
    var searchMarker = L.marker(searchCoords).addTo(map).bindPopup("Ubicación Buscada").openPopup();
    map.setView(searchCoords, 19); // Zoom a la ubicación de búsqueda

    var nearbyNAPs = [];
    allNAPs.forEach(function(marker) {
        var markerCoords = marker.getLatLng();
        var distance = getDistance(searchCoords.lat, searchCoords.lng, markerCoords.lat, markerCoords.lng);
        if (distance <= 150) {
            nearbyNAPs.push({
                marker: marker,
                distance: distance
            });
        }
    });

    // Ordenar por distancia y tomar los 5 más cercanos
    nearbyNAPs.sort((a, b) => a.distance - b.distance);
    var top5NAPs = nearbyNAPs.slice(0, 5);

    // Resaltar los NAPs seleccionados
    top5NAPs.forEach(function(item) {
        item.marker.setIcon(iconHighlight);
        item.marker.openPopup();
    });
})
.addTo(map);