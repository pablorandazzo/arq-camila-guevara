# Portfolio de arquitectura

Sitio estático en Astro con contenido editable desde Sveltia CMS. Todo el contenido vive en JSON versionado; el HTML se genera en el build y no hay backend, base de datos ni API.

## Camino rápido

1. `npm install`
2. `npm run dev` y abrir `http://localhost:4321/`
3. Antes de publicar: `npm run check`, `npm test`, `npm run build`
4. `npm run preview` para revisar la salida de `dist/`

Requiere Node.js 22.22 o superior.

## Arquitectura

### Stack

| Pieza | Rol |
| --- | --- |
| Astro 7 | Generación estática y sistema de componentes `.astro` |
| Zod (`astro/zod`) | Validación de todo el contenido en tiempo de build |
| Sharp | Optimización de imágenes en un paso previo al build |
| Sveltia CMS | Edición del contenido JSON desde el navegador |
| `node:test` | Suite de tests sin dependencias extra |

La única dependencia de producción es Astro. Sharp, TypeScript, el checker de Astro y YAML son de desarrollo.

### Mapa del proyecto

| Ruta | Contenido |
| --- | --- |
| `src/content/site.json` | Fuente única del sitio: marca, menú, portada, perfil y contacto |
| `src/content/projects/*.json` | Un archivo por proyecto |
| `src/content.config.ts` | Colección `projects` con su esquema |
| `src/lib/site-schema.ts`, `sections.ts` | Esquemas Zod de las secciones y del sitio |
| `src/lib/site.ts` | Carga y valida `site.json` en build |
| `src/lib/images.ts`, `image-manifest.json` | Acceso al manifiesto de imágenes optimizadas |
| `src/layouts/SiteLayout.astro` | HTML base, encabezado, menú, transiciones |
| `src/components/` | Render de secciones, listados y fichas de proyecto |
| `src/pages/` | Rutas: portada, perfil, proyectos, contacto |
| `src/scripts/project-transitions.js` | Precarga y transición hacia las fichas |
| `scripts/prepare-images.mjs` | Pipeline de imágenes |
| `assets/` | Medios originales; se publican en `/assets/...` |
| `public/admin/` | CMS Sveltia y su configuración |
| `tests/` | Verificación de contenido, rutas y comportamiento |

### Flujo de datos

```
site.json / projects/*.json
        │
        ├─→ prepare-images.mjs ─→ image-manifest.json + assets/images/optimized/
        │
        └─→ Zod (site.ts / content.config.ts) ─→ componentes .astro ─→ dist/
```

El contenido se valida dos veces: en la colección de proyectos y al cargar `site.json`. Si un campo no cumple el esquema, el build falla con el motivo concreto en lugar de publicar una página rota.

### Rutas

| URL | Origen |
| --- | --- |
| `/` | `src/pages/index.astro` |
| `/perfil/` | `src/pages/perfil.astro` |
| `/projects/` | Listado completo |
| `src/content/projects/*.json` | Un proyecto por archivo, publicado en `/projects/<id>/`. El campo `category` referencia una categoría administrada en Sveltia. |
| `src/content/categories/*.json` | Categorías de proyectos; Sveltia permite crearlas, cambiar su nombre y orden. Se generan filtros y páginas `/projects/categories/<id>/`; se conservan las rutas históricas `/projects/resorts/` y `/projects/commercial/`. |
| `/projects/<archivo>/` | Una ruta por archivo de `src/content/projects/` |
| `/contact/` | `src/pages/contact.astro` |

Las entradas heredadas `/projects.html`, `/contact.html` y `/project.html?id=<id>` se emiten como HTML mínimo que redirige del lado del cliente: las dos primeras a su ruta canónica y la tercera al proyecto correspondiente, o a un mensaje de proyecto inexistente si el `id` no existe. Necesitan JavaScript; las rutas canónicas no.

### Pipeline de imágenes

`npm run prepare:images` corre automáticamente antes de `dev` y de `build`. Recorre el JSON de contenido, detecta cada ruta `/assets/images/...` y por cada una:

- Genera variantes WebP de 640, 800, 1280, 1600 y 2400 px con nombre `<archivo>-<hash>-<ancho>.webp`, salteando las que ya existen.
- Guarda en `image-manifest.json` el ancho, el alto y la lista de `srcset` para que los componentes no calculen nada.
- Para las imágenes de portada, además recorta y codifica en AVIF una versión vertical pensada para el hero a pantalla completa en móvil, y la descarta si pesa más que el WebP equivalente.
- Los SVG se conservan como vectores, sin rasterizar.

El hash del contenido permite reutilizar variantes entre builds sin servir archivos viejos.

### Estilos e interacción

CSS y JavaScript globales viven en `assets/` y no pasan por el bundler. `site.css` concentra los estilos; `interaction.js` es el único script incluido en todas las páginas y carga bajo demanda el módulo que corresponde según la página:

| Módulo | Se activa en |
| --- | --- |
| `project-list-interaction.js` | Listados de proyectos |
| `project-story-interaction.js` | Ficha de proyecto |
| `scroll-visuals.js` | Páginas con imágenes y scroll |
| `contact-interaction.js` | Página de contacto |

Astro sirve `/assets/...` en desarrollo mediante un middleware que resuelve archivos fuera de `publicDir`, y el build copia la carpeta completa a `dist/assets/` (excepto `site.js`, que ya no se usa). El encabezado con caché de larga duración para medios y fuentes está en `public/_headers`.

## Edición de contenido

- `src/content/projects/*.json`: un proyecto por archivo, renderizado en `/projects/<archivo>/`. El campo `category` guarda el ID de una categoría gestionada en `src/content/categories/*.json` y por Sveltia. El campo numérico `order` define el orden del listado. `language` acepta `es` o `en`.
- `src/content/site.json`: textos de portada, perfil y contacto, imágenes y los cuatro ítems reordenables del menú principal. Cada ítem conserva su destino (`id`) al moverlo; se exige exactamente un ítem por destino. Los IDs destacados deben coincidir con nombres de archivo existentes: el build falla si falta uno. El campo opcional `cv` apunta a un PDF dentro de `/cv/`.
- Las imágenes de portada y las galerías necesitan texto `alt` significativo. Usar `/assets/images/<archivo>` para medios existentes o subidos.

### Portada distinta para celular

En **Páginas del sitio → Contenido del sitio → Inicio → Portada**, cargar la **Imagen de escritorio** y, opcionalmente, una **Imagen para celular**. La segunda se usa en pantallas de hasta 768 px; conviene elegir una composición vertical. Si se deja vacía o se elimina, se conserva el encuadre móvil automático de la imagen de escritorio. Ambas usan la descripción de imagen del mismo bloque.

En JSON, la imagen móvil se guarda en `mobileImage` dentro del bloque `home_hero`. El pipeline genera sus variantes WebP sin recortarlas previamente. Este campo solo afecta la portada del inicio, no las fotos del detalle de proyectos.

Para editar visualmente, ejecutar el servidor de desarrollo y abrir `http://localhost:4321/admin/index.html` en Chrome o Edge. Para editar archivos locales sin credenciales remotas, elegir **Work with Local Repository** y seleccionar esta carpeta. También se puede editar el JSON directamente. Revisar la página después de guardar y refrescar si es necesario.

En Sveltia, las subidas nuevas se limitan a 3 MB y se convierten a WebP con un máximo de 1800 × 1800. Para el CV, abrir **Páginas del sitio → Contenido del sitio → CV (PDF)** (hasta 10 MB). El archivo se guarda en `public/cv/`; después de guardar y reconstruir, el botón de CV de la página de perfil lo abre en una pestaña nueva. Si no hay archivo, el botón queda deshabilitado.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Optimiza imágenes y levanta el servidor con recarga |
| `npm run build` | Optimiza imágenes y genera `dist/` |
| `npm run preview` | Sirve `dist/` localmente |
| `npm run check` | Diagnóstico de tipos y plantillas Astro |
| `npm test` | Suite de tests con `node:test` |
| `npm run prepare:images` | Solo el pipeline de imágenes |

Los tests cubren contenido y CMS, menú y foco, la coreografía de contacto, el pipeline de imágenes, las transiciones entre proyectos y el scroll visual. No ejecutar `npm test` y `npm run build` al mismo tiempo: ambos escriben en `dist/` y el test de build puede fallar por una salida a medio escribir.

## Conexión con GitHub y despliegue

El repositorio privado es `pablorandazzo/arq-camila-guevara`, rama `main`. Sveltia está configurado con **inicio de sesión por token** de GitHub; hay que dar acceso de escritura a los editores. Para ingresar, crear desde la pantalla de login del CMS un token fine-grained para este repositorio con **Contents: read and write** (la lectura de metadatos es automática) y pegarlo en el prompt del navegador. No guardar tokens en el repositorio.

Un hosting estático conectado a Git debe construir con `npm install && npm run build` y publicar `dist/` en cada commit de contenido. Publicar el sitio en la raíz del dominio, porque los enlaces y medios usan rutas relativas a la raíz; verificar que el hosting sirva los `index.html` generados por directorio y `/admin/index.html`. El CMS no despliega el sitio por sí solo. No agregar Git LFS para los medios del CMS.

### Cloudflare Workers

El sitio se publica como **assets estáticos**, sin Worker ni adapter: `wrangler.jsonc` declara `assets.directory` apuntando a `./dist` y nada más. Por eso no hay `@astrojs/cloudflare` entre las dependencias. No borrar ese archivo: sin configuración de Wrangler, la versión 4.68 o superior ejecuta configuración automática, agrega el adapter de Astro, modifica `astro.config.mjs` y abre un pull request con esos cambios.

| Ajuste en Workers Builds | Valor |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Preview command | `npx wrangler versions upload` |

`npx wrangler preview` no es una preview local: crea un Preview remoto de la rama y exige Previews habilitado en la cuenta. Para probar en local usar `npm run preview` (Astro) o `npx wrangler dev`. La versión de Wrangler se toma de `package.json` y está fijada a propósito, para que los deploys sean reproducibles.

## Checklist antes de publicar

- [ ] `npm run check` sin errores
- [ ] `npm test` completo
- [ ] `npm run build` genera `dist/` y las rutas heredadas
- [ ] Imágenes nuevas con `alt` y variantes generadas
- [ ] El CV abre en una pestaña nueva o el botón queda deshabilitado a propósito
- [ ] Revisar portada, perfil, listados y contacto en móvil y escritorio

## Problemas frecuentes

| Síntoma | Causa y solución |
| --- | --- |
| `Missing optimized image: /assets/...` | Falta la entrada en el manifiesto: ejecutar `npm run prepare:images` y verificar que el archivo exista en `assets/images/` |
| El test de build falla de forma intermitente | Hay un `npm run build` corriendo en paralelo; ejecutarlos de a uno |
| Los cambios del CMS no aparecen | El CMS commitea, no despliega: falta el rebuild del hosting |
| Una imagen nueva no se convierte | Superó el límite de 3 MB del CMS |
| 404 en `/assets/...` | El hosting debe servir la carpeta `assets/` copiada al output |
