# Sistema de Ruteo Seguro CDMX - Aplicación Web

Aplicación web completa que presenta el proyecto de análisis de accidentes de tránsito en la Ciudad de México, integrando visualizaciones interactivas, resultados y un sistema de ruteo seguro.

---

## Tabla de Contenido

- [Tecnologías](#tecnologías)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Uso](#uso)

---

## Tecnologías

### Frontend
- **React 18** - Biblioteca UI
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS** - Framework de estilos utility-first
- **Framer Motion** - Librería de animaciones
- **Recharts** - Gráficos responsivos
- **React Icons** - Iconos modernos
- **Axios** - Cliente HTTP

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Helmet** - Seguridad HTTP headers
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - HTTP request logger
- **Compression** - Gzip compression

---

## Estructura del Proyecto

```
WebPage/
│
├── frontend/                   # Aplicación React
│   ├── public/                 # Archivos estáticos
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   │   ├── Navbar.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Methodology.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── Demo.jsx
│   │   │   ├── Conclusions.jsx
│   │   │   └── Footer.jsx
│   │   ├── App.jsx             # Componente principal
│   │   ├── main.jsx            # Punto de entrada
│   │   └── index.css           # Estilos globales
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── backend/                    # Servidor Node.js
    ├── controllers/            # Lógica de negocio
    │   ├── projectController.js
    │   ├── dataController.js
    │   └── routingController.js
    ├── routes/                 # Definición de rutas
    │   ├── projectRoutes.js
    │   ├── dataRoutes.js
    │   └── routingRoutes.js
    ├── data/                   # Datos mock (opcional)
    ├── server.js               # Servidor Express
    ├── package.json
    └── .env.example            # Variables de entorno
```

---

## Instalación

### Prerrequisitos

- **Node.js** >= 16.x
- **npm** >= 8.x (recomendado: npm)
- **Python** >= 3.8 (requerido para el servicio ML del backend)

### 1. Clonar el Repositorio

```bash
cd "Proyecto Final Minería/WebPage"
```

### 2. Instalar Dependencias del Frontend

```bash
cd frontend
npm install
```

### 3. Instalar Dependencias del Backend

```bash
cd ../backend
npm install
```

### 4. Configurar Variables de Entorno

Crea un archivo `.env` en la carpeta `backend`:

```bash
cp .env.example .env
```

Edita el archivo `.env`:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# HERE Routing API  tiempos de viaje con tráfico real
# Obtener gratis en: https://platform.here.com  (250,000 req/mes gratis)
HERE_API_KEY=tu_api_key_aqui

# Google Maps Directions API  mostrar ruta de Google Maps en la demo (opcional)
# Obtener en: https://console.cloud.google.com  APIs  Directions API
# Requiere facturación activada (tiene capa gratuita de $200/mes)
GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

> Las APIs son opcionales. Sin HERE, el tiempo se calcula con velocidad libre (subestimado). Sin Google Maps, la ruta de referencia simplemente no aparece en el mapa.

---

## Uso

### Modo Desarrollo

#### Opción 1: Ejecutar Frontend y Backend por Separado

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Server running on http://localhost:5000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# App running on http://localhost:3000
```


---

## Agradecimientos

- **C5 CDMX** - Datos abiertos de accidentes
- **OpenStreetMap** - Red vial
- **React**, **Tailwind CSS**, **Express** - Tecnologías open source

---

**DEMO LIVE:** Abre `http://localhost:3000` después de ejecutar `npm run dev`
