from fastapi import FastAPI
import psycopg2
import json
import os
import urllib.parse
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



def get_db_connection():
    DATABASE_URL = os.getenv("DATABASE_URL")

    if not DATABASE_URL:
        raise ValueError("❌ ERROR: DATABASE_URL ist nicht gesetzt!")

    print(f"📌 DATABASE_URL: {DATABASE_URL}")  # Debugging-Log

    url = urllib.parse.urlparse(DATABASE_URL)

    return psycopg2.connect(
        dbname=url.path[1:],  # Entfernt das führende '/'
        user=url.username,
        password=url.password,
        host=url.hostname,
        port=url.port
    )

@app.get("/test_db")
def test_db():
    try:
        conn = get_db_connection()
        return {"status": "✅ Verbindung erfolgreich!"}
    except Exception as e:
        return {"status": "❌ Verbindung fehlgeschlagen!", "error": str(e)}



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
        
        