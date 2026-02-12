

# Buscador de Leads - Scraper de Tiendas desde Google Maps

## Resumen

Crear una nueva herramienta dentro de la plataforma que permita al equipo comercial buscar tiendas fisicas por ciudad usando la API de Google Places. La herramienta mostrara resultados con nombre, telefono/WhatsApp, sitio web y direccion, permitiendo identificar clientes potenciales.

## Requisitos previos

Para usar la Google Places API necesitas:
1. Una cuenta de Google Cloud Platform con facturacion habilitada
2. Habilitar la API "Places API (New)" en tu proyecto de Google Cloud
3. Obtener una API Key desde la seccion de credenciales

El costo de Google Places API es aproximadamente $0.032 USD por busqueda (Text Search) y $0.005 por detalle de lugar. Con un uso moderado (100 busquedas/dia) el costo seria minimo.

## Arquitectura

```text
[Frontend: /leads]
       |
       v
[Supabase Edge Function: search-leads]
       |
       v
[Google Places API (Text Search + Place Details)]
       |
       v
[Resultados filtrados con telefono/web]
```

## Plan de implementacion

### Paso 1: Configurar el secreto de Google Places API Key
- Almacenar la API Key de Google como secreto en Supabase/Cloud para uso seguro en edge functions

### Paso 2: Crear Edge Function `search-leads`
- Recibir parametros: `city` (ciudad) y `query` (tipo de negocio, ej: "tiendas de ropa")
- Llamar a Google Places API (Text Search) con la consulta combinada
- Para cada resultado con telefono o sitio web, obtener detalles adicionales via Place Details API
- Retornar datos filtrados: nombre, direccion, telefono, sitio web, rating, estado (abierto/cerrado)

### Paso 3: Crear pagina `/leads` con la interfaz de busqueda
- Formulario con campos:
  - Ciudad (input de texto)
  - Tipo de negocio (ej: "tiendas de ropa", "boutiques", "zapaterias")
- Tabla de resultados mostrando:
  - Nombre de la tienda
  - Direccion
  - Telefono (con enlace directo a WhatsApp)
  - Sitio web (enlace clickeable)
  - Rating de Google
- Boton para exportar resultados a Excel

### Paso 4: Agregar navegacion
- Agregar boton "Leads" en el Header junto a Cards, Gantt y Calendario
- Agregar ruta `/leads` en App.tsx

## Seccion tecnica

### Edge Function: `supabase/functions/search-leads/index.ts`
- Usa `GOOGLE_PLACES_API_KEY` desde `Deno.env.get()`
- Endpoint: `https://places.googleapis.com/v1/places:searchText`
- Headers: `X-Goog-Api-Key`, `X-Goog-FieldMask`
- Filtra resultados que tengan `nationalPhoneNumber` o `websiteUri`

### Nuevo archivo: `src/pages/LeadsSearch.tsx`
- Formulario de busqueda con estado de carga
- Tabla de resultados con columnas compactas
- Enlace de WhatsApp generado como: `https://wa.me/{telefono_limpio}`
- Exportacion a Excel usando la libreria `xlsx` ya instalada

### Modificaciones existentes
- `src/App.tsx`: agregar ruta `/leads`
- `src/components/Header.tsx`: agregar boton de navegacion "Leads"

