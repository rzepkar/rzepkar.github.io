// 1️⃣ Leaflet-Karte initialisieren
let map = L.map('map', {
    center: [50.161505, 8.528824],  // Frankfurt am Main
    zoom: 14,
    minZoom: 10,
    maxZoom: 17,
    scrollWheelZoom: true,
    smoothWheelZoom: false,
    smoothSensitivity: 1.3
});

// Basemaps
let cartoVoyagerNoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB, OpenStreetMap contributors',
    maxZoom: 20
});

let darkNoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB, OpenStreetMap contributors',
    maxZoom: 20
});

let rasterTiles = L.tileLayer('https://rzepkar.github.io/tiles/{z}/{x}/{y}.png', {
    tileSize: 256,
    maxZoom: 17,
    minZoom: 10,
    attribution: '© HVGB'
}).addTo(map);

// --- Features Layer
let featuresLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4 style="margin-bottom: 6px;">${props.name}</h4>
                <p>${props.info || ""}</p>
            </div>
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_data')
  .then(response => response.json())
  .then(data => {
      featuresLayer.addData(data).addTo(map);
  });

// --- Energieanlagen Layer
let energieanlagenLayer = L.geoJSON(null, {
    pointToLayer: function (feature, latlng) {
        return L.marker(latlng, {
            icon: L.divIcon({
                html: `
                    <div style="
                        width: 32px;
                        height: 32px;
                        background: white;
                        border-radius: 50%;
                        border: 1.5px solid #444;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                    ">
                        ${getUnicodeSymbol(feature.properties.anlage)}
                    </div>
                `,
                className: '',
                iconSize: [32, 32]
            })
        });
    },
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4>${props.name}</h4>
                <table>
                    <tr><td><strong>Typ:</strong></td><td>${props.anlage || ""}</td></tr>
                    <tr><td><strong>Leistung:</strong></td><td>${props.leistung || ""}</td></tr>
                    <tr><td><strong>Träger:</strong></td><td>${props.energietraeger || ""}</td></tr>
                </table>
            </div>
        `);
    }
});

function getUnicodeSymbol(anlage) {
    switch (anlage) {
        case "Freiflächen-Solaranlage": return "☀️";
        case "Windenergieanlagn": return "🌬️";
        case "Wasserkraftwerk": return "💧";
        case "Geothermische Anlage": return "🌋";
        case "Bioenergieanlage": return "🌱";
        case "Klär- oder Deponiegasanlage": return "🧪";
        case "Abfallverbrennungsanlage": return "🗑️";
        case "Fossiles Heizkraftwerk": return "🏣";
        case "Fossiles Kraftwerk": return "📂";
        case "Fossiles Heizwerk": return "🔥";
        case "Sonstige fossile Feuerungsanlage": return "⛽";
        case "Blockheizkraftwerk": return "⚙️";
        default: return "❓";
    }
}

fetch('https://fastapi-heatbox.onrender.com/get_energieanlagen')
  .then(response => response.json())
  .then(data => {
      energieanlagenLayer.addData(data).addTo(map);
  });

// --- Kommunen Layer
let kommunenLayer = L.geoJSON(null, {
    style: function(feature) {
        return{
            color: "#3366cc",
            weight: 2,
            fillColor: "#3366cc",
            fillOpacity: 0
        };
    },
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4>${props.gen}</h4>
                <table>
                    <tr><td><strong>Bezirk:</strong></td><td>${props.bez || ""}</td></tr>
                    <tr><td><strong>AGS:</strong></td><td>${props.ags || ""}</td></tr>
                    <tr><td><strong>Bevölkerung:</strong></td><td>${props.population || ""}</td></tr>
                    <tr><td><strong>Verfahren:</strong></td><td>${props.verfahren || ""}</td></tr>
                </table>
            </div>
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_kommunen')
  .then(response => response.json())
  .then(data => {
      kommunenLayer.addData(data).addTo(map);
  });

// --- Windenergieanlagen Layer
let windenergieLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4>${props.name}</h4>
                <table>
                    <tr><td><strong>Leistung:</strong></td><td>${props.leistung || ""}</td></tr>
                </table>
            </div>
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_windenergieanlagen')
  .then(response => response.json())
  .then(data => {
      windenergieLayer.addData(data).addTo(map);
  });

// 8️⃣ Layer-Control (gefixt für groupedLayerControl)
let baseLayers = {
    "Helle Karte": cartoVoyagerNoLabels,
    "Helle Karte mit Bebauung": rasterTiles,
    "Dunkle Karte": darkNoLabels
};

let groupedOverlays = {
    "Thematische Daten": {
        "Features": featuresLayer,
        "Energieanlagen": energieanlagenLayer
    },
    "Verwaltungsgrenzen": {
        "Kommunen": kommunenLayer
    }
};

// Fix: group layers kommt als erstes Argument, base layers als zweites!
L.control.groupedLayers(baseLayers, groupedOverlays, { collapsed: false }).addTo(map);

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
