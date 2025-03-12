// Leaflet-Karte initialisieren
let map = L.map('map', {
    center: [50.228320, 8.674393],  // Frankfurt am Main
    zoom: 13,
	maxZoom: 18,			//adjust
	scrollWheelZoom: false,	//default
	smoothWheelZoom: true,	//plugin
	smoothSensitivity: 1.2	//adjust
});

// Basis-Layer (Hintergrundkarte)
let positronLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    attribution: '© CartoDB',
    maxZoom: 18
});
positronLayer.addTo(map);

// Layer: Features aus FastAPI laden
let featuresLayer = L.geoJSON(null, {
    onEachFeature: function (feature, layer) {
        let props = feature.properties;
        layer.bindPopup(`<b>${props.name}</b><br>Info: ${props.info}`);
    }
});

fetch('https://fastapi-heatbox.onrender.com/get_data')
  .then(response => response.json())
  .then(data => {
      featuresLayer.addData(data).addTo(map);  // Hier: .addTo(map) hinzugefügt
  });

// Layer: Kommunen aus FastAPI laden
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
      kommunenLayer.addData(data).addTo(map);  // Hier: .addTo(map) hinzugefügt
  });

// Layer: Windenergieanlagen aus FastAPI laden
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
      windenergieLayer.addData(data).addTo(map);  // Hier: .addTo(map) hinzugefügt
  });



// hier neue Daten hinzufügen ##########


// Layer-Control für Overlay-Layer
let overlayMaps = {
    "Features": featuresLayer,
    "Kommunen": kommunenLayer,
    "Windenergieanlagen": windenergieLayer
};

// Layer-Control zur Karte hinzufügen
L.control.layers(null, overlayMaps, {
    collapsed: false  // Immer ausgeklappt
}).addTo(map);




// Funktionen ######################



// Layer für temporäre Features (X)
let tempLayer = L.layerGroup().addTo(map);

// Funktion zum Hinzufügen eines neuen temporären Features
map.on('click', function (e) {
    let newFeature = L.circleMarker(e.latlng, { color: 'red', radius: 8 }).addTo(tempLayer);
    simulateEffect(e.latlng); // Simulationsfunktion aufrufen
});

// Simulationsfunktion: Ändert Attribute der bestehenden Features
function simulateEffect(position) {
    map.eachLayer(layer => {
        if (layer.feature && layer.feature.properties) {
            let distance = layer.getLatLng().distanceTo(position);
            if (distance < 100) { // Falls innerhalb von 100m
                layer.feature.properties.attribute += 1; // Erhöhe Attribut
                layer.bindPopup(`<b>${layer.feature.properties.name}</b><br>Attribute: ${layer.feature.properties.attribute}`).openPopup();
            }
        }
    });
}

// Reset-Button für Simulation
let resetButton = L.control({ position: "topright" });
resetButton.onAdd = function () {
    let div = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-custom");
    div.innerHTML = '<button style="background:white; padding:5px; border:1px solid black;">Reset</button>';
    div.onclick = function () {
        tempLayer.clearLayers(); // Entfernt alle temporären Features
        map.eachLayer(layer => {
            if (layer.feature && layer.feature.properties) {
                layer.feature.properties.attribute = 10; // Zurücksetzen auf Ursprungswert
                layer.bindPopup(`<b>${layer.feature.properties.name}</b><br>Attribute: ${layer.feature.properties.attribute}`);
            }
        });
    };
    return div;
};
resetButton.addTo(map);
