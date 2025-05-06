from fastapi import FastAPI
import psycopg2
import json
import os
import urllib.parse
from fastapi.middleware.cors import CORSMiddleware
from functools import lru_cache
from starlette.responses import Response

# FastAPI-Instanz erstellen
app = FastAPI()

# CORS erlauben, damit Leaflet auf die API zugreifen kann
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://rzepkar.github.io"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    DATABASE_URL = os.getenv("DATABASE_URL")  # Render-Umgebungsvariable
    if DATABASE_URL is None:
        raise ValueError("DATABASE_URL ist nicht gesetzt!")

    # Parse DATABASE_URL
    url = urllib.parse.urlparse(DATABASE_URL)

    return psycopg2.connect(
        dbname=url.path[1:],  # Entfernt das führende "/"
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
    
    
from functools import lru_cache
from starlette.responses import Response

# Caching-Funktion
@lru_cache(maxsize=512)  # bis zu 512 Tiles im Cache
def get_cached_tile(z: int, x: int, y: int) -> bytes:
    conn = get_db_connection()
    cur = conn.cursor()

    sql = f"""
    WITH
    bounds AS (
        SELECT ST_TileEnvelope({z}, {x}, {y}) AS geom
    ),
    mvtgeom AS (
        SELECT
            id,
            name,
            height,
            ST_AsMVTGeom(
                b.geom_3857,
                bounds.geom,
                4096,
                0,
                true
            ) AS geom
        FROM buildings b, bounds
        WHERE ST_Intersects(b.geom_3857, bounds.geom)
    )
    SELECT ST_AsMVT(mvtgeom, 'buildings_layer', 4096, 'geom') FROM mvtgeom;
    """
    cur.execute(sql)
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row and row[0] else b''
    
    
@app.get("/mvt/buildings/{z}/{x}/{y}")
def get_mvt(z: int, x: int, y: int):
    tile = get_cached_tile(z, x, y)
    return Response(content=tile, media_type="application/x-protobuf")

    # Sicherstellen, dass ein valides Tile-Objekt geliefert wird
    return Response(content=row[0] if row and row[0] else b"", media_type="application/x-protobuf")


@app.get("/get_buildings")
def get_buildings():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT 
            id,
            name,
            height,
            ST_AsGeoJSON(ST_Transform((ST_Dump(geom)).geom, 4326)) 
        FROM buildings;
    """)

    features = []
    for row in cur.fetchall():
        feature = {
            "type": "Feature",
            "properties": {
                "id": row[0],
                "name": row[1],
                "height": float(row[2]) if row[2] is not None else 10.0
            },
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



# GET: Tabelle Energieanlagen mit Case-Sensitivity
@app.get("/get_energieanlagen")
def get_energieanlagen():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Anführungszeichen und Großbuchstaben beachten
        cur.execute("""
            SELECT 
                id, name, anlage, leistung, energietraeger, ST_AsGeoJSON(geom) 
            FROM "energieanlagen";
        """)
        features = []
        
        for row in cur.fetchall():
            feature = {
                "type": "Feature",
                "properties": {
                    "id": row[0], 
                    "name": row[1], 
                    "anlage": row[2], 
                    "leistung": row[3],
                    "energietraeger": row[4],
                },
                "geometry": json.loads(row[5])
            }
            features.append(feature)
        
        cur.close()
        conn.close()
        
        return {"type": "FeatureCollection", "features": features}
    
    except Exception as e:
        print("Fehler in /get_energieanlagen:", e)
        return {"error": str(e)}
        
        
        
        
# GET: Einzelne Kommune mit Waermebedarf + Status
@app.get("/api/kommunen/{ags}")
def get_kommune_info(ags: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT 
                ags, gen, kwp_status,
                waermebedarf_gasheizung,
                waermebedarf_oelheizung,
                waermebedarf_fernwaerme,
                waermebedarf_elektr_direktheizung
            FROM "Kommunen"
            WHERE ags = %s
        """, (ags,))
        
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return {"error": "Kommune nicht gefunden"}
        
        return {
            "ags": row[0],
            "name": row[1],
            "kwp_status": row[2],
            "energiemix": {
                "Gas": row[3],
                "Öl": row[4],
                "Fernwärme": row[5],
                "Elektro": row[6]
            }
        }

    except Exception as e:
        print("Fehler in /api/kommunen/{ags}:", e)
        return {"error": str(e)}
        

@app.get("/api/energiemix/{ags}")
def get_energiemix_verlauf(ags: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT jahr, gasheizung, oelheizung, elektr_direktheizung,
                   fernwaerme, sonstiges
            FROM energiemix_verlauf
            WHERE ags = %s
            ORDER BY jahr
        """, (ags,))
        
        rows = cur.fetchall()
        cur.close()
        conn.close()

        result = []
        for row in rows:
            result.append({
                "jahr": row[0],
                "Gas": row[1],
                "Öl": row[2],
                "Elektro": row[3],
                "Fernwärme": row[4],
                "Sonstiges": row[5]
            })

        return result

    except Exception as e:
        print("Fehler in /api/energiemix/{ags}:", e)
        return {"error": str(e)}

@app.get("/get_waermenetze")
def get_waermenetze():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT name, bemerkung, art, ST_AsGeoJSON(geom)
            FROM waermenetze;
        """)
        
        features = []
        for row in cur.fetchall():
            feature = {
                "type": "Feature",
                "properties": {
                    "name": row[0],
                    "bemerkung": row[1],
                    "art": row[2]
                },
                "geometry": json.loads(row[3])
            }
            features.append(feature)

        cur.close()
        conn.close()
        return {"type": "FeatureCollection", "features": features}
    
    except Exception as e:
        print("Fehler in /get_waermenetze:", e)
        return {"error": str(e)}

@app.get("/get_erzeugungspotenziale")
def get_erzeugungspotenziale():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT name, art, bemerkung, erzeugungs, ST_AsGeoJSON(geom)
            FROM erzeugungspotenziale;
        """)
        
        features = []
        for row in cur.fetchall():
            feature = {
                "type": "Feature",
                "properties": {
                    "name": row[0],
                    "art": row[1],
                    "bemerkung": row[2],
                    "erzeugungs": row[3]
                },
                "geometry": json.loads(row[4])
            }
            features.append(feature)

        cur.close()
        conn.close()
        return {"type": "FeatureCollection", "features": features}
    
    except Exception as e:
        print("Fehler in /get_erzeugungspotenziale:", e)
        return {"error": str(e)}
        
@app.get("/get_eignungsgebiete")
def get_eignungsgebiete():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT name, art, ST_AsGeoJSON(geom)
            FROM eignungsgebiete;
        """)
        
        features = []
        for row in cur.fetchall():
            feature = {
                "type": "Feature",
                "properties": {
                    "name": row[0],
                    "art": row[1]
                },
                "geometry": json.loads(row[2])
            }
            features.append(feature)

        cur.close()
        conn.close()
        return {"type": "FeatureCollection", "features": features}
    
    except Exception as e:
        print("Fehler in /get_eignungsgebiete:", e)
        return {"error": str(e)}

