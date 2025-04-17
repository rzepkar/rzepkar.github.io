// 1️⃣ Leaflet-Karte initialisieren
let map = L.map('map', {
    center: [50.161505, 8.528824],  // Frankfurt am Main
    zoom: 14,
    minZoom: 10,
    maxZoom: 19,
    scrollWheelZoom: true,
    smoothWheelZoom: false,
    smoothSensitivity: 1.3
});

// basemap 
let cartoVoyagerNoLabels = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CartoDB, OpenStreetMap contributors',
    maxZoom: 20
});
cartoVoyagerNoLabels.addTo(map);


let rasterTiles = L.tileLayer('https://rzepkar.github.io/tiles/{z}/{x}/{y}.png', {
    tileSize: 256,
    maxZoom: 17,
    minZoom: 10,
    attribution: '© HVGB'
}).addTo(map);



/* // 3️⃣ OSMBuildings-Instanz erstellen (nur einmal!)
let osmb = new OSMBuildings(map).date(new Date());
console.log("🛠 OSMBuildings initialisiert:", osmb); */

// 4️⃣ **Funktion: Gebäude laden & anzeigen**
/* function loadBuildings(initialLoad = false) {
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
});*/

// Features
let featuresLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
		layer.bindPopup(`
			<div style="font-family: sans-serif; font-size: 14px;">
				<h4 style="margin-bottom: 6px;">${props.name}</h4>
				<table>
					<tr><td><strong>Typ:</strong></td><td>${props.anlage}</td></tr>
					<tr><td><strong>Leistung:</strong></td><td>${props.leistung} kW</td></tr>
					<tr><td><strong>Träger:</strong></td><td>${props.energietraeger}</td></tr>
				</table>
			</div>
`);

fetch('https://fastapi-heatbox.onrender.com/get_data')
  .then(response => response.json())
  .then(data => {
      featuresLayer.addData(data).addTo(map);
  });

// Energieanlagen
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
        layer.bindPopup(`<b>${feature.properties.name}</b><br>Typ: ${feature.properties.anlage}`);
    }
});

function getUnicodeSymbol(anlage) {
    switch (anlage) {
        case "Freiflächen-Solaranlagen": return "☀️";
        case "Windenergieanlagen": return "🌬️";
        case "Wasserkraftwerke": return "💧";
        case "Geothermische Anlage": return "🌋";
        case "Bioenergieanlagen": return "🌱";
        case "Klär- und Deponiegasanlagen": return "🧪";
        case "Abfallverbrennungsanlagen": return "🗑️";
        case "Fossiles Heizkraftwerk": return "🏭";
        case "Fossile Kraftwerke": return "🛢️";
        case "Fossile Heizwerke": return "🔥";
        case "Sonstige fossile Feuerungsanlagen": return "⛽";
        case "Blockheizkraftwerk": return "⚙️";
        default: return "❓";
    }
}

fetch('https://fastapi-heatbox.onrender.com/get_energieanlagen')
  .then(response => response.json())
  .then(data => {
      energieanlagenLayer.addData(data).addTo(map);
  });


 
// Kommunen
let kommunenLayer = L.geoJSON(null, {
	style: function(feature) {
		return{
			color: "#666",
			weight: 1,
			fillColor: "#dddddd",
			fillOpacity: 0.3
		};
	},
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

/* let buildingsVectorTiles = L.vectorGrid.protobuf(
  'https://fastapi-heatbox.onrender.com/mvt/buildings/{z}/{x}/{y}', {
    vectorTileLayerStyles: {
      buildings_layer: {
        fill: true,
        fillColor: '#ff6600',
        fillOpacity: 0.7,
        color: '#cc3300',
        weight: 1
      }
    },
    interactive: true,
    getFeatureId: function(f) {
      return f.properties.id;
    }
  }
); 

// Direkt zur Karte hinzufügen oder in die Layer-Control integrieren:
buildingsVectorTiles.addTo(map);
// Ende VectorTiles
*/

// 8️⃣ **Layer-Control für Overlay-Layer**
let overlayMaps = {
    "<strong> Thematische Layergruppe</strong>": {},
	"Features": featuresLayer,
    "Energieanlagen": energieanlagenLayer,
	"Kommunen": kommunenLayer
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
