// 1️⃣ Leaflet-Karte initialisieren
let map = L.map('map', {
    center: [50.161505, 8.528824],  // Frankfurt am Main
    zoom: 14,
    minZoom: 9,
    maxZoom: 16,
    scrollWheelZoom: true,
    smoothWheelZoom: false,
    smoothSensitivity: 1.3,
	zoomControl: false // kein standard plus minus element von leaflet
});

map.createPane('interaktivePotenzialPane');
map.getPane('interaktivePotenzialPane').style.zIndex = 650; // über allem außer Labels

let drawnItems = new L.FeatureGroup().addTo(map);

let drawControl = new L.Control.Draw({
    draw: {
        polygon: true,
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
    },
    edit: {
        featureGroup: drawnItems
    }
});
map.addControl(drawControl);

let drawPolygonTool = new L.Draw.Polygon(map, drawControl.options.draw.polygon);

document.getElementById('start-draw-button').addEventListener('click', () => {
    drawPolygonTool.enable();
});


map.on(L.Draw.Event.CREATED, function (e) {
    drawnItems.clearLayers(); // nur ein Polygon gleichzeitig
    let layer = e.layer;
    drawnItems.addLayer(layer);

    const polygon = layer.toGeoJSON(); // GeoJSON des gezeichneten Polygons

    auswertungFeaturesInPolygon(polygon); 
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
    maxZoom: 18,
    minZoom: 10,
    attribution: '© Datenlizenz DL‑DE‑Zero und fiktive Fachdaten.'
}).addTo(map);




fetch('https://fastapi-heatbox.onrender.com/get_data')
  .then(response => response.json())
  .then(data => {
      featuresLayer.addData(data).addTo(map);
  });

// --- Energieanlagen Layer
let energieanlagenLayer = L.geoJSON(null, {
	pane: 'interaktivePotenzialPane',
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
                    <tr><td><strong>Energieträger:</strong></td><td>${props.energietraeger || ""}</td></tr>
                </table>
            </div>
        `);
    }
});

function getUnicodeSymbol(anlage) {
    switch (anlage) {
        case "Freiflächen-Solaranlage": return "🔆️";
        case "Windenergieanlagn": return "🌬️";
        case "Wasserkraftwerk": return "💧";
        case "Geothermische Anlage": return "🛢️";
        case "Bioenergieanlage": return "♻️";
        case "Klär- oder Deponiegasanlage": return "🧪";
        case "Abfallverbrennungsanlage": return "🗑️";
        case "Fossiles Heizkraftwerk": return "🏣";
        case "Fossiles Kraftwerk": return "📂";
        case "Fossiles Heizwerk": return "🔥";
        case "Sonstige fossile Feuerungsanlage": return "⛽";
        case "Blockheizkraftwerk": return "🏭️";
        default: return "❓";
    }
}

fetch('https://fastapi-heatbox.onrender.com/get_energieanlagen')
  .then(response => response.json())
  .then(data => {
      energieanlagenLayer.addData(data).addTo(map);
  });

function resetKommunenHighlight() {
    kommunenLayer.eachLayer(function (layer) {
        kommunenLayer.resetStyle(layer);
    });
}


let kommunenLayer = L.geoJSON(null, {
    style: function(feature) {
        return {
            color: "#3366cc",
            weight: 2,
            fillColor: "#3366cc",
            fillOpacity: 0
        };
    },

    onEachFeature: function (feature, layer) {
        let props = feature.properties;

        // Popup mit Basisinformationen
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4>${props.gen}</h4>
                <table>
                    <tr><td><strong>Landkreis:</strong></td><td>${props.bez || ""}</td></tr>
                    <tr><td><strong>AGS:</strong></td><td>${props.ags || ""}</td></tr>
                    <tr><td><strong>Bevölkerung:</strong></td><td>${props.population || ""}</td></tr>
                </table>
            </div>
        `);

        // Klick + Hervorhebung + InfoBox
        layer.on('click', function (e) {
            resetKommunenHighlight();
            e.target.setStyle({
                weight: 3,
                color: '#ff6600',
                fillColor: '#ffcc00',
                fillOpacity: 0.4
            });
            e.target.bringToFront();

            // Daten vom API-Endpunkt holen
            const ags = feature.properties.ags;
            fetch(`https://fastapi-heatbox.onrender.com/api/kommunen/${ags}`)
                .then(res => res.json())
                .then(data => {
                    showInfoBox(data);
                });
        });
    }
}); 

fetch('https://fastapi-heatbox.onrender.com/get_kommunen')
  .then(response => response.json())
  .then(data => {
      kommunenLayer.addData(data).addTo(map);
  });

let waermenetzeLayer = L.geoJSON(null, {
	pane: 'interaktivePotenzialPane',
    style: {
        color: '#e67300',
        weight: 2,
        fillOpacity: 0.4
    },
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4>${props.name}</h4>
                <table>
                    <tr><td><strong>Art:</strong></td><td>${props.art || ""}</td></tr>
                    <tr><td><strong>Bemerkung:</strong></td><td>${props.bemerkung || ""}</td></tr>
                </table>
            </div>
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_waermenetze')
  .then(response => response.json())
  .then(data => {
      waermenetzeLayer.addData(data).addTo(map).bringToFront();
  });
 

let erzeugungspotenzialeLayer = L.geoJSON(null, {
	pane: 'interaktivePotenzialPane',
    style: {
        color: '#0080ff',
        weight: 2,
        fillOpacity: 0.4
    },
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4>${props.name}</h4>
                <table>
                    <tr><td><strong>Art:</strong></td><td>${props.art || ""}</td></tr>
                    <tr><td><strong>Erzeugung:</strong></td><td>${props.erzeugungs || ""}</td></tr>
                    <tr><td><strong>Bemerkung:</strong></td><td>${props.bemerkung || ""}</td></tr>
                </table>
            </div>
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_erzeugungspotenziale')
  .then(response => response.json())
  .then(data => {
      erzeugungspotenzialeLayer.addData(data).addTo(map).bringToFront();
  });
  
  
let eignungsgebieteLayer = L.geoJSON(null, {
	pane: 'interaktivePotenzialPane',
    style: {
        color: '#66bb6a',
        weight: 2,
        fillOpacity: 0.4
    },
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`
            <div style="font-family: sans-serif; font-size: 14px;">
                <h4>${props.name}</h4>
                <p><strong>Art:</strong> ${props.art || ""}</p>
            </div>
        `);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_eignungsgebiete')
  .then(response => response.json())
  .then(data => {
      eignungsgebieteLayer.addData(data).addTo(map).bringToFront();
  });



let baseLayers = {
    "Helle Karte": cartoVoyagerNoLabels,
    "Helle Karte mit Bebauung": rasterTiles,
    "Dunkle Karte": darkNoLabels
};

let groupedOverlays = {
    "Bestand": {
        "Energieanlagen": energieanlagenLayer,
        "🟧 Wärmenetze": waermenetzeLayer
    },
    "Potenzial": {
        "🟦 Erzeugungspotenzial": erzeugungspotenzialeLayer,
		"🟩 Eignungsgebiete": eignungsgebieteLayer
    }
};


// Fix: group layers kommt als erstes Argument, base layers als zweites!
L.control.groupedLayers(baseLayers, groupedOverlays, { collapsed: false }).addTo(map);


function auswertungFeaturesInPolygon(polygon) {
    const gruppenErgebnisse = {
        "Kommunen": [],
        "Energieanlagen": [],
        "Wärmenetze": [],
        "Erzeugungspotenzial": [],
        "Eignungsgebiete": []
    };

    kommunenLayer.eachLayer(layer => {
        if (layer.feature && turf.booleanIntersects(polygon, layer.toGeoJSON())) {
            const props = layer.feature.properties;
            const name = props.gen || props.name || "Unbenannt";
            gruppenErgebnisse["Kommunen"].push(name);
        }
    });

    [
        { layer: energieanlagenLayer, key: "Energieanlagen", nameKey: "name", typeKey: "anlage" },
        { layer: waermenetzeLayer, key: "Wärmenetze", nameKey: "name", typeKey: "art" },
        { layer: erzeugungspotenzialeLayer, key: "Erzeugungspotenzial", nameKey: "name", typeKey: "art" },
        { layer: eignungsgebieteLayer, key: "Eignungsgebiete", nameKey: "name", typeKey: "art" }
    ].forEach(({ layer, key, nameKey, typeKey }) => {
        layer.eachLayer(l => {
            if (l.feature && turf.booleanIntersects(polygon, l.toGeoJSON())) {
                const props = l.feature.properties;
                const name = props[nameKey] || "Unbenannt";
                const art = props[typeKey] ? ` (${props[typeKey]})` : "";
                gruppenErgebnisse[key].push(`${name}${art}`);
            }
        });
    });

    const ergebnisBox = document.getElementById("draw-result");
    let html = "";

    const hatErgebnisse = Object.values(gruppenErgebnisse).some(arr => arr.length > 0);

    if (hatErgebnisse) {
        for (const [gruppe, eintraege] of Object.entries(gruppenErgebnisse)) {
            if (eintraege.length > 0) {
                html += `<strong>${gruppe} (${eintraege.length}):</strong><ul>`;
                html += eintraege.map(e => `<li>${e}</li>`).join("");
                html += `</ul>`;
            }
        }
    } else {
        html = "<em>Keine Objekte enthalten.</em>";
    }

    ergebnisBox.innerHTML = html;
}


//  Info-Box, mit API-Daten aus Kommunen und HTML-block mit Chart.js

let chartInstance = null;

function showInfoBox(data) {
    document.getElementById("info-box").style.display = "block";
    document.getElementById("info-title").innerText = data.name;

    document.getElementById("info-status").innerHTML = `
        <span style="padding: 4px 8px; background: #eee; border-radius: 4px;">
            Status Kommunale Wärmeplanung: ${data.kwp_status}
        </span>
    `;

    const ctx = document.getElementById("energymixChart").getContext("2d");

    // Vorherigen Chart zerstören, falls vorhanden
    if (chartInstance) {
        chartInstance.destroy();
    }

    fetch(`https://fastapi-heatbox.onrender.com/api/energiemix/${data.ags}`)
        .then(res => res.json())
        .then(verlauf => {
            const labels = verlauf.map(e => e.jahr);
            const datasets = [
                {
                    label: 'Gas',
                    data: verlauf.map(e => e.Gas),
                    fill: true
                },
                {
                    label: 'Öl',
                    data: verlauf.map(e => e.Öl),
                    fill: true
                },
                {
                    label: 'Fernwärme',
                    data: verlauf.map(e => e.Fernwärme),
                    fill: true
                },
                {
                    label: 'Elektro',
                    data: verlauf.map(e => e.Elektro),
                    fill: true
                },
                {
                    label: 'Sonstiges',
                    data: verlauf.map(e => e.Sonstiges),
                    fill: true
                }
            ];

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    },
                    scales: {
                        y: {
                            stacked: true,
							min: 0, 
							max: 100,							
                            title: {
                                display: true,
                                text: 'Anteil (%)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Jahr'
                            }
                        }
                    }
                }
            });
        });
}

document.addEventListener('DOMContentLoaded', function () {
  const leftBox = document.getElementById('left-box');
  const leftToggleButton = document.getElementById('left-toggle-button');

  leftToggleButton.addEventListener('click', function () {
    leftBox.classList.toggle('expanded');
    leftToggleButton.textContent = leftBox.classList.contains('expanded') ? '◀' : '▶';
  });
});

function closeStartupHinweis() {
  const el = document.getElementById('startup-hinweis');
  if (el) el.style.display = 'none';
}
