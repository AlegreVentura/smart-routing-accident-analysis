#!/usr/bin/env python3
"""
Microservicio HTTP para predicciones del modelo Random Forest de riesgo vial.
No requiere dependencias externas más allá de scikit-learn, numpy y pandas
(ya instalados por el entorno del proyecto).

Uso:
    python ml_service.py              # puerto 5001 por defecto
    python ml_service.py --port 5001

Endpoints:
    GET  /health           — estado del servicio
    POST /predict          — predicción para un punto (lat, lng, hora, ...)
    POST /predict-route    — predicción promedio para una lista de puntos
"""

import sys
import json
import warnings
import pickle
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

import numpy as np
import pandas as pd
import joblib

warnings.filterwarnings("ignore")  # silenciar advertencias de versión de sklearn

# ── Rutas ─────────────────────────────────────────────────────────────────────
_HERE      = Path(__file__).parent
MODEL_DIR  = (_HERE / "../../ProyectoMineria/modelos").resolve()
DATA_DIR   = (_HERE / "../../ProyectoMineria/Datos combinados CDMX").resolve()
GRAPH_DIR  = (_HERE / "../../ProyectoMineria/Red vial").resolve()

# ── Carga de modelos (al inicio, una sola vez) ────────────────────────────────
print("[ml_service] Cargando modelos...", file=sys.stderr)
_model         = joblib.load(MODEL_DIR / "modelo_riesgo_rf.pkl")
_scaler        = joblib.load(MODEL_DIR / "scaler.pkl")
_feature_names = list(joblib.load(MODEL_DIR / "feature_names.pkl"))
print(f"[ml_service] Modelo listo: {type(_model).__name__}", file=sys.stderr)
print(f"[ml_service] Features: {_feature_names}", file=sys.stderr)

# ── Datos de clustering espacial (DBSCAN) ────────────────────────────────────

_cluster_kdtree  = None
_cluster_riesgos = None


def _load_cluster_data():
    """
    Carga los puntos que pertenecen a algún cluster DBSCAN desde el CSV generado
    en el notebook 02. Construye un KDTree para hacer búsqueda espacial rápida:
    dado un punto (lat, lng), encuentra el cluster más cercano dentro de 300m.
    """
    global _cluster_kdtree, _cluster_riesgos
    try:
        from scipy.spatial import KDTree
    except ImportError:
        return

    cluster_path = DATA_DIR / "ACCIDENTES_CON_CLUSTERING.csv"
    if not cluster_path.exists():
        print("[ml_service] ACCIDENTES_CON_CLUSTERING.csv no encontrado — en_cluster usará 0",
              file=sys.stderr)
        return

    df = pd.read_csv(cluster_path)
    # Solo los puntos asignados a un cluster (ruido tiene cluster_dbscan == -1)
    clustered = df[df["cluster_dbscan"] != -1][["latitud", "longitud", "riesgo_cluster"]].dropna()

    if len(clustered) == 0:
        return

    _cluster_kdtree  = KDTree(clustered[["latitud", "longitud"]].values)
    _cluster_riesgos = clustered["riesgo_cluster"].values
    print(f"[ml_service] Clustering listo: {len(clustered):,} puntos en zona de riesgo",
          file=sys.stderr)


def _get_cluster_features(lat: float, lng: float) -> dict:
    """
    Devuelve {en_cluster, riesgo_cluster} para la coordenada dada.
    Busca el punto de cluster más cercano dentro de ~300m (0.0027 grados).
    Si no hay ninguno, el punto está fuera de toda zona de alta densidad de accidentes.
    """
    if _cluster_kdtree is None:
        return {"en_cluster": 0, "riesgo_cluster": 0.0}

    dist, idx = _cluster_kdtree.query([lat, lng])
    if dist <= 0.0027:  # ≈ 300 m a la latitud de CDMX
        return {"en_cluster": 1, "riesgo_cluster": float(_cluster_riesgos[idx])}
    return {"en_cluster": 0, "riesgo_cluster": 0.0}


# ── Grafo vial con pesos de riesgo (cargado si existen los archivos) ──────────

_graph       = None
_node_ids    = None
_node_kdtree = None


def _load_graph():
    global _graph, _node_ids, _node_kdtree
    try:
        from scipy.spatial import KDTree
        import networkx as nx
    except ImportError:
        print("[ml_service] networkx o scipy no instalados — /route no disponible", file=sys.stderr)
        return

    pickle_path = GRAPH_DIR / "red_vial_con_riesgo.pkl"
    graphml_path = GRAPH_DIR / "red_vial_cdmx.graphml"
    weights_path = DATA_DIR / "EDGE_RISK_SCORES.csv"

    if pickle_path.exists():
        print("[ml_service] Cargando grafo desde pickle...", file=sys.stderr)
        with open(pickle_path, "rb") as f:
            G = pickle.load(f)
        print(f"[ml_service] Grafo listo: {G.number_of_nodes():,} nodos, {G.number_of_edges():,} aristas", file=sys.stderr)
    elif graphml_path.exists() and weights_path.exists():
        print("[ml_service] Cargando grafo desde GraphML (puede tardar ~60s)...", file=sys.stderr)
        G = nx.read_graphml(str(graphml_path))
        df = pd.read_csv(weights_path, dtype={"u": str, "v": str})
        lookup = {(r["u"], r["v"], int(r["key"])): r for _, r in df.iterrows()}
        for u, v, key, data in G.edges(keys=True, data=True):
            row = lookup.get((str(u), str(v), int(key)))
            length = float(data.get("length", 100))
            if row is not None:
                G[u][v][key]["peso_distancia"] = float(row["peso_distancia"])
                G[u][v][key]["peso_balanceado"] = float(row["peso_balanceado"])
                G[u][v][key]["peso_seguro"]     = float(row["peso_seguro"])
            else:
                G[u][v][key]["peso_distancia"] = length
                G[u][v][key]["peso_balanceado"] = length * 1.15
                G[u][v][key]["peso_seguro"]     = length * 1.30
        print(f"[ml_service] Grafo listo: {G.number_of_nodes():,} nodos, {G.number_of_edges():,} aristas", file=sys.stderr)
    else:
        print("[ml_service] Archivos del grafo no encontrados — ejecuta el notebook 03 primero", file=sys.stderr)
        return

    node_ids = list(G.nodes())
    coords   = np.array([[float(G.nodes[n]["y"]), float(G.nodes[n]["x"])] for n in node_ids])
    _graph       = G
    _node_ids    = node_ids
    _node_kdtree = KDTree(coords)


def _compute_routes(data: dict) -> dict:
    import networkx as nx
    origin      = data.get("origin", {})
    destination = data.get("destination", {})

    _, si = _node_kdtree.query([origin["lat"],      origin["lng"]])
    _, di = _node_kdtree.query([destination["lat"], destination["lng"]])
    src, dst = _node_ids[si], _node_ids[di]

    configs = [
        ("short",    "Más Corta",  "#3b82f6", "peso_distancia"),
        ("balanced", "Balanceada", "#f59e0b", "peso_balanceado"),
        ("safe",     "Más Segura", "#10b981", "peso_seguro"),
    ]

    routes = []
    for route_type, name, color, weight_key in configs:
        try:
            path   = nx.shortest_path(_graph, src, dst, weight=weight_key)
            coords = [[float(_graph.nodes[n]["y"]), float(_graph.nodes[n]["x"])] for n in path]
            dist_m = sum(
                float(list(_graph[path[i]][path[i+1]].values())[0].get("length", 0))
                for i in range(len(path) - 1)
            )
            routes.append({
                "type":        route_type,
                "name":        name,
                "color":       color,
                "coordinates": coords,
                "distance":    str(round(dist_m / 1000, 2)),
            })
        except Exception as e:
            print(f"[ml_service] Ruta {route_type} fallida: {e}", file=sys.stderr)

    return {"routes": routes}


# Valores por defecto (mediana/moda del dataset de entrenamiento)
_DEFAULTS = {
    "clase":          2,
    "aliento":        0,
    "automovil":      1,
    "longitud":       -99.15,
    "camioneta":      0,
    "cinturon":       9,
    "hora":           12,
    "sexo":           2,
    "caparod":        1,
    "distancia_edge": 50.0,
    "latitud":        19.42,
    "tipaccid":       10,
    "campasaj":       0,
    "motociclet":     0,
}


# ── Lógica de predicción ──────────────────────────────────────────────────────

def _predict_point(data: dict) -> dict:
    """
    Predice la probabilidad de accidente grave para un punto.
    Los campos que falten se rellenan con _DEFAULTS. Los features de clustering
    (en_cluster, riesgo_cluster) se calculan automáticamente desde las coordenadas.
    """
    lat = data.get("latitud", _DEFAULTS["latitud"])
    lng = data.get("longitud", _DEFAULTS["longitud"])
    cluster_feats = _get_cluster_features(lat, lng)

    # Prioridad: datos explícitos > cluster calculado > defaults
    base     = {**_DEFAULTS, **cluster_feats}
    features = {**base, **{k: v for k, v in data.items() if k in base}}
    x = pd.DataFrame([features])[_feature_names]
    xs = _scaler.transform(x)
    prob = _model.predict_proba(xs)[0]  # [P(leve), P(grave)]

    prob_grave = float(prob[1])
    riesgo_ml  = round(prob_grave * 100, 2)

    return {
        "riesgo_ml":  riesgo_ml,
        "prob_grave": round(prob_grave, 4),
        "prob_leve":  round(float(prob[0]), 4),
        "prediction": "grave" if prob_grave > 0.5 else "leve",
    }


def _predict_route(data: dict) -> dict:
    """
    Predice el riesgo promedio para una lista de puntos de ruta.

    Entrada:
      {
        "hora":     int,                                 # hora de salida (0-23)
        "vehiculo": "automovil" | "camioneta" | "motociclet",
        "points":   [{"lat": float, "lng": float}, ...]
      }
    Salida: { "avg_risk_ml": float, "max_risk_ml": float }
    """
    hora     = data.get("hora", 12)
    vehiculo = data.get("vehiculo", "automovil")
    points   = data.get("points", [])

    if not points:
        return {"avg_risk_ml": 0.0, "max_risk_ml": 0.0}

    vehiculo_feats = {
        "automovil":  1 if vehiculo == "automovil"  else 0,
        "camioneta":  1 if vehiculo == "camioneta"  else 0,
        "motociclet": 1 if vehiculo == "motociclet" else 0,
    }

    risks = [
        _predict_point({
            "hora":      hora,
            "latitud":   p.get("lat", _DEFAULTS["latitud"]),
            "longitud":  p.get("lng", _DEFAULTS["longitud"]),
            **vehiculo_feats,
        })["riesgo_ml"]
        for p in points
    ]

    return {
        "avg_risk_ml": round(sum(risks) / len(risks), 2),
        "max_risk_ml": round(max(risks), 2),
    }


# ── Handler HTTP ──────────────────────────────────────────────────────────────

class _MLHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # suprimir logs de acceso para no mezclar con la consola del backend

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {
                "status":   "ok",
                "model":    type(_model).__name__,
                "features": _feature_names,
            })
        else:
            self._json(404, {"error": "Endpoint no encontrado"})

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body   = self.rfile.read(length)
            data   = json.loads(body) if body else {}
        except Exception as e:
            self._json(400, {"error": f"JSON inválido: {e}"})
            return

        if self.path == "/predict":
            self._json(200, _predict_point(data))
        elif self.path == "/predict-route":
            self._json(200, _predict_route(data))
        elif self.path == "/route":
            if _graph is None:
                self._json(503, {"error": "Red vial no cargada — ejecuta el notebook 03 primero"})
            else:
                self._json(200, _compute_routes(data))
        else:
            self._json(404, {"error": "Endpoint no encontrado"})

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin",  "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type",   "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)


# ── Punto de entrada ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = 5001
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])

    _load_cluster_data()
    _load_graph()

    server = HTTPServer(("localhost", port), _MLHandler)
    print(f"[ml_service] Corriendo en http://localhost:{port}", file=sys.stderr)
    print(f"   GET  /health         — estado del servicio",            file=sys.stderr)
    print(f"   POST /predict        — prediccion de un punto",         file=sys.stderr)
    print(f"   POST /predict-route  — prediccion para una ruta",       file=sys.stderr)
    print(f"   POST /route          — ruteo Dijkstra con pesos de riesgo", file=sys.stderr)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ml_service] Detenido.", file=sys.stderr)
        server.server_close()
