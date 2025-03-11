from fastapi import FastAPI
import psycopg2
import json
from fastapi.middleware.cors import CORSMiddleware

# FastAPI-Instanz erstellen
app = FastAPI()

# CORS erlauben, damit Leaflet auf die API zugreifen kann
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Erlaubt Zugriff von allen Quellen
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Verbindung zur PostgreSQL-Datenbank
def get_db_connection():
    return psycopg2.connect(os.getenv("postgresql://user:QER9UOMQkwDqcRcZFfX5izL7eFtlNG1o@dpg-cv7vjjtds78s73cquj8g-a/heatbox")) 
    )

# GET: Tabelle features (erster Test, später löschen!)
@app.get("/get_data")
def get_data():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Daten aus PostGIS abrufen und als GeoJSON umwandeln
    cur.execute("SELECT id, name, info, ST_AsGeoJSON(geom) FROM features;")
    features = []
    
    for row in cur.fetchall():
        feature = {
            "type": "Feature",
            "properties": {"id": row[0], "name": row[1], "info": row[2]},
            "geometry": json.loads(row[3])
        }
        features.append(feature)
    
    cur.close()
    conn.close()
    
    return {"type": "FeatureCollection", "features": features}
    
# GET: Tabelle Kommunen mit Case-Sensitivity
@app.get("/get_kommunen")
def get_kommunen():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Anführungszeichen und Großbuchstaben beachten
        cur.execute("""
            SELECT 
                id, objid, ags, gen, bez, nuts, population, konvoi, verfahren, 
                ST_AsGeoJSON(geom) 
            FROM "Kommunen";
        """)
        features = []
        
        for row in cur.fetchall():
            feature = {
                "type": "Feature",
                "properties": {
                    "id": row[0], 
                    "objid": row[1], 
                    "ags": row[2], 
                    "gen": row[3], 
                    "bez": row[4], 
                    "nuts": row[5], 
                    "population": row[6], 
                    "konvoi": row[7], 
                    "verfahren": row[8]
                },
                "geometry": json.loads(row[9])
            }
            features.append(feature)
        
        cur.close()
        conn.close()
        
        return {"type": "FeatureCollection", "features": features}
    
    except Exception as e:
        print("Fehler in /get_kommunen:", e)
        return {"error": str(e)}


# GET: Tabelle Windenergieanlagen mit Case-Sensitivity
@app.get("/get_windenergieanlagen")
def get_windenergieanlagen():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Anführungszeichen und Großbuchstaben beachten
        cur.execute("""
            SELECT 
                id, name, leistung, ST_AsGeoJSON(geom) 
            FROM "Windenergieanlagen";
        """)
        features = []
        
        for row in cur.fetchall():
            feature = {
                "type": "Feature",
                "properties": {
                    "id": row[0], 
                    "name": row[1], 
                    "leistung": row[2], 
                },
                "geometry": json.loads(row[3])
            }
            features.append(feature)
        
        cur.close()
        conn.close()
        
        return {"type": "FeatureCollection", "features": features}
    
    except Exception as e:
        print("Fehler in /get_windenergieanlagen:", e)
        return {"error": str(e)}
        
        