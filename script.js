// 1️⃣ Leaflet-Karte initialisieren
let map = L.map('map', {
    center: [50.228320, 8.674393],  // Frankfurt am Main
    zoom: 13,
    minZoom: 10,
    maxZoom: 19,
    scrollWheelZoom: true,
    smoothWheelZoom: false,
    smoothSensitivity: 1.3
});

// basemap 
let customBasemap = L.esri.Vector.vectorTileLayer("12580bec1ef54ffb902256376df0a268", {
});
customBasemap.addTo(map);








// 3️⃣ OSMBuildings-Instanz erstellen (nur einmal!)
let osmb = new OSMBuildings(map).date(new Date());
console.log("🛠 OSMBuildings initialisiert:", osmb);

// 4️⃣ **Funktion: Gebäude laden & anzeigen**
function loadBuildings(initialLoad = false) {
    fetch('https://fastapi-heatbox.onrender.com/get_buildings')
        .then(response => response.json())
        .then(data => {
            console.log("✅ Gebäude-Daten erfolgreich empfangen:", data);

            if (!data.features || data.features.length === 0) {
                console.warn("⚠️ Keine Gebäude-Daten vorhanden!");
                return;
            }

            // **Höhenwerte prüfen**
            let heights = data.features.map(f => f.properties.height);
            console.log("🏗 Gebäudehöhen:", heights);

            // Gebäude aktualisieren
            osmb.set(data);
            console.log("🏗 Gebäude aktualisiert.");

            // **Nur beim ersten Laden die Karte auf das erste Gebäude setzen**
            if (initialLoad && data.features.length > 0) {
                let firstBuilding = data.features[0].geometry.coordinates[0][0];
                if (firstBuilding) {
                    console.log("📍 Zentriere Karte auf:", firstBuilding);
                    map.setView([firstBuilding[1], firstBuilding[0]], map.getZoom(), { animate: false });
                }
            }
        })
        .catch(error => console.error('❌ Fehler beim Laden der Gebäudedaten:', error));
}

// 5️⃣ **👀 Gebäude einmal initial laden (mit Zentrierung)**
document.addEventListener("DOMContentLoaded", function() {
    console.log("🚀 Initialisiere Karte & lade Gebäude...");
    loadBuildings(true);
});

// 6️⃣ **🔄 Gebäude bei Zoom-Änderung aktualisieren (ohne Zentrierung)**
map.on('zoomend', function() {
    console.log("🔍 Zoom geändert. Gebäude werden neu geladen...");
    loadBuildings(false);
});

// 7️⃣ **Layer für andere Geodaten laden**
let featuresLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`<b>${props.name}</b><br>Info: ${props.info}`);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_data')
  .then(response => response.json())
  .then(data => {
      featuresLayer.addData(data).addTo(map);
  });

let kommunenLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <b>${props.gen}</b><br>
            Bezirk: ${props.bez}<br>
            AGS: ${props.ags}<br>
            Bevölkerung: ${props.population}<br>
            Verfahren: ${props.verfahren}
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_kommunen')
  .then(response => response.json())
  .then(data => {
      kommunenLayer.addData(data).addTo(map);
  });

let windenergieLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <b>${props.name}</b><br>
            Name: ${props.name}<br>
            Leistung: ${props.leistung}
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_windenergieanlagen')
  .then(response => response.json())
  .then(data => {
      windenergieLayer.addData(data).addTo(map);
  });

// 8️⃣ **Layer-Control für Overlay-Layer**
let overlayMaps = {
    "Features": featuresLayer,
    "Kommunen": kommunenLayer,
    "Windenergieanlagen": windenergieLayer
};

L.control.layers(null, overlayMaps, { collapsed: false }).addTo(map);

// 9️⃣ **Simulationsfunktionen**
let tempLayer = L.layerGroup().addTo(map);

map.on('click', function (e) {
    let newFeature = L.circleMarker(e.latlng, { color: 'red', radius: 8 }).addTo(tempLayer);
    simulateEffect(e.latlng);
});

function simulateEffect(position) {
    map.eachLayer(layer => {
        if (layer.feature && layer.feature.properties) {
            let distance = layer.getLatLng().distanceTo(position);
            if (distance < 100) {
                layer.feature.properties.attribute += 1;
                layer.bindPopup(`<b>${layer.feature.properties.name}</b><br>Attribute: ${layer.feature.properties.attribute}`).openPopup();
            }
        }
    });
}

// 🔄 Reset-Button
let resetButton = L.control({ position: "topright" });
resetButton.onAdd = function () {
    let div = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-custom");
    div.innerHTML = '<button style="background:white; padding:5px; border:1px solid black;">Reset</button>';
    div.onclick = function () {
        tempLayer.clearLayers();
        map.eachLayer(layer => {
            if (layer.feature && layer.feature.properties) {
                layer.feature.properties.attribute = 10;
                layer.bindPopup(`<b>${layer.feature.properties.name}</b><br>Attribute: ${layer.feature.properties.attribute}`);
            }
        });
    };
    return div;
};
resetButton.addTo(map);
