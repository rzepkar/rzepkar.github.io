# Basis-Image für FastAPI und Uvicorn
FROM tiangolo/uvicorn-gunicorn-fastapi:python3.9

# Arbeitsverzeichnis festlegen
WORKDIR /app

# Abhängigkeiten kopieren und installieren
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Source Code kopieren
COPY . /app

# Exponieren des Ports 8000
EXPOSE 8000

# Starten von FastAPI mit Uvicorn
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
