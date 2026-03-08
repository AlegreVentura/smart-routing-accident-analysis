# Documentación de Datos

Estructura de carpetas de datos del proyecto de Ruteo Seguro para CDMX.

---

## Estructura general

```
ProyectoMineria/
├── Datos raw/              ← Fuente original (en git)
├── Datos limpios/          ← Generado por notebook 01 (no en git)
├── Datos combinados CDMX/  ← Generados por notebooks 01 y 02 (en git)
└── Documentos/             ← PDFs del proyecto (en git)
```

> `Datos combinados/` (datos nacionales intermedios) no está en git — se genera automáticamente al correr el notebook 01.

---

## 1. Datos raw/

Archivos CSV descargados del INEGI — Registro Administrativo de Accidentes de Tránsito Terrestre (RAAT), base georreferenciada municipal.

```
Datos raw/
├── 2019/  BASE MUNICIPAL_ACCIDENTES DE TRANSITO GEORREFERENCIADOS_2019.csv
├── 2020/  BASE MUNICIPAL_ACCIDENTES DE TRANSITO GEORREFERENCIADOS_2020.csv
├── 2021/  BASE MUNICIPAL_ACCIDENTES DE TRANSITO GEORREFERENCIADOS_2021.csv
├── 2022/  BASE MUNICIPAL_ACCIDENTES DE TRANSITO GEORREFERENCIADOS_2022.csv
├── 2023/  BASE MUNICIPAL_ACCIDENTES DE TRANSITO GEORREFERENCIADOS_2023.csv
└── documentacion/  Metadatos y diccionario de variables
```

**Contenido:** Accidentes de toda la república (no solo CDMX), ~29-45 MB por año.
**Problemas conocidos:** Nulos, coordenadas (0,0), duplicados — corregidos por notebook 01.
**Fuente:** https://www.inegi.org.mx/programas/accidentes/

---

## 2. Datos limpios/

Generado por `01_preparacion_datos.ipynb`. Un CSV por año con limpieza básica aplicada.

```
Datos limpios/
├── 2019/  ACCIDENTES_LIMPIO_2019.csv
├── 2020/  ACCIDENTES_LIMPIO_2020.csv
├── 2021/  ACCIDENTES_LIMPIO_2021.csv
├── 2022/  ACCIDENTES_LIMPIO_2022.csv
└── 2023/  ACCIDENTES_LIMPIO_2023.csv
```

**Limpieza aplicada:** Eliminación de nulos, coordenadas inválidas, duplicados exactos.
**Nota:** No está en git (es intermedio regenerable). Se genera al correr notebook 01.

---

## 3. Datos combinados CDMX/

Archivos principales del proyecto — filtrados exclusivamente para Ciudad de México, con feature engineering y análisis espacial/ML completos.

### Generados por `01_preparacion_datos.ipynb`

**`ACCIDENTES_COMBINADO_CDMX_2019_2023.csv`**
- ~78,366 registros, solo CDMX (edo == 9)
- Features añadidas: `franja_horaria`, `es_fin_de_semana`, `es_hora_pico`, `gravedad`

**`ACCIDENTES_CON_TRAMOS_2019_2023.csv`**
- ~32,139 accidentes con matching a la red vial OSM
- Columnas nuevas: `edge_u`, `edge_v`, `edge_key`, `distancia_edge`

### Generados por `02_analisis_y_modelado.ipynb`

**`ACCIDENTES_CON_CLUSTERING.csv`**
- ~32,139 puntos con resultado DBSCAN
- Columnas: `cluster_dbscan` (ID, -1 = ruido), `riesgo_cluster` (0-100)
- 299 clusters identificados, 17,178 puntos agrupados (53.4%)

**`GRID_HOTSPOTS.csv`**
- 755 celdas de 0.01° (~1.1 km) con análisis Getis-Ord Gi*
- Columnas: `centroid_lat`, `centroid_lon`, `n_accidentes`, `gi_score`, `hot_spot`, `riesgo_hotspot`
- Distribución: 725 no significativas / 17 hot spots 95% / 13 hot spots 99%

**`EDGE_RISK_SCORES.csv`**
- Riesgo compuesto asignado por arista del grafo vial
- Columnas: `u`, `v`, `key`, `riesgo_compuesto`
- Usado por el backend para precalcular pesos del grafo

**`SCORING_RIESGO_COMPUESTO.csv`**
- ~72,131 puntos con índice de riesgo final
- Columnas: `latitud`, `longitud`, `riesgo_cluster`, `riesgo_ml`, `indice_riesgo_compuesto`
- Fórmula: `riesgo_compuesto = 0.6 × riesgo_histórico + 0.1 × riesgo_cluster + 0.3 × riesgo_ml`

---

## 4. Documentos/

PDFs del proyecto (no son datos de análisis).

```
Documentos/
├── plan de trabajo.pdf          ← Planificación inicial
├── Reporte_minería.pdf          ← Reporte final
└── Presentación Exposición.pdf  ← Presentación (81 MB)
```

---

## Flujo de datos

```
Datos raw/ (INEGI, 5 años)
      │
      ▼ notebook 01
Datos limpios/ + Datos combinados CDMX/
      │ (ACCIDENTES_COMBINADO_CDMX, ACCIDENTES_CON_TRAMOS, red_vial_cdmx.graphml)
      │
      ▼ notebook 02
ACCIDENTES_CON_CLUSTERING.csv
GRID_HOTSPOTS.csv
EDGE_RISK_SCORES.csv
SCORING_RIESGO_COMPUESTO.csv
modelos/
      │
      ▼ notebook 03
Red vial/red_vial_con_riesgo.pkl
mapas/
```

---

## Archivos clave para el backend

El backend (`WebPage/backend/`) lee directamente estos archivos al arrancar:

| Archivo | Usado para |
|---------|-----------|
| `ACCIDENTES_CON_CLUSTERING.csv` | KDTree para features de cluster (ml_service.py) |
| `GRID_HOTSPOTS.csv` | Endpoint `/api/data/hotspots` |
| `ACCIDENTES_COMBINADO_CDMX_2019_2023.csv` | Estadísticas generales |
| `Red vial/red_vial_con_riesgo.pkl` | Grafo para Dijkstra (ml_service.py) |

---

## Notas

- No modifiques los archivos en `Datos raw/` — son la fuente original
- Los archivos en `Datos combinados CDMX/` son regenerables ejecutando los notebooks en orden
- Si falta algún archivo, revisa [README_NOTEBOOKS.md](README_NOTEBOOKS.md) para saber qué notebook lo genera
