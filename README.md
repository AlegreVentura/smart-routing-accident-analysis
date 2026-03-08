# Sistema de Ruteo Seguro para CDMX

Proyecto de minería de datos para análisis integral de accidentes de tránsito en la Ciudad de México (2019-2023). Integra clustering espacial, machine learning y optimización de rutas Dijkstra en una aplicación web interactiva.

## Estructura

```
Proyecto Final Minería/
├── ProyectoMineria/    ← Notebooks, datos, modelos y documentación
└── WebPage/            ← Aplicación web (React + Node.js + Python)
```

## Documentación

- [ProyectoMineria/README.md](ProyectoMineria/README.md) — Descripción técnica completa, flujo de datos y cómo reproducir el análisis
- [WebPage/README.md](WebPage/README.md) — Instalación y uso de la aplicación web
- [ProyectoMineria/docs/README_NOTEBOOKS.md](ProyectoMineria/docs/README_NOTEBOOKS.md) — Detalle de cada notebook
- [ProyectoMineria/docs/README_DATOS.md](ProyectoMineria/docs/README_DATOS.md) — Explicación de los archivos de datos

## Resultados

- **78,366 accidentes** analizados en CDMX (2019-2023)
- **299 clusters** de alta densidad (DBSCAN)
- **13 hot spots** al 99% de confianza (Getis-Ord Gi*)
- **Moran's I = 0.6837** — clustering espacial significativo
- **F1 = 0.84** en predicción de gravedad (Stacking Ensemble con SMOTE, poniendo atención a los falsos negativos)
- Ruteo seguro con Dijkstra ponderado por riesgo compuesto
  
## Autores

- Alegre Ventura Roberto Jhoshua
- Ramírez Nava Alejandro Iram

Proyecto — Minería de Datos
