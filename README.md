# Portfolio de arquitectura

Sitio estático en Astro con CMS Sveltia.

## Puesta en marcha local

Requiere Node.js 22.22 o superior. Ejecutar `npm install`, luego `npm run dev` y abrir `http://localhost:4321/`. Antes de desplegar, ejecutar `npm run check` y `npm run build`; `dist/` es la salida estática. `npm run preview` sirve esa salida localmente. Los recursos binarios se guardan en `assets/` y se publican en las mismas rutas `/assets/...` durante el desarrollo; el build los copia a `dist/assets/`. No agregar Git LFS para los medios del CMS.

## Edición de contenido

- `src/content/projects/*.json`: un proyecto por archivo, renderizado en `/projects/<archivo>/`. La categoría es `resorts` o `commercial`. El campo numérico `order` define el orden del listado.
- `src/content/site.json`: textos de portada, perfil y contacto, imágenes y los cuatro ítems reordenables del menú principal. Cada ítem conserva su destino (`id`) al moverlo. Los IDs destacados deben coincidir exactamente con nombres de archivo existentes; el build falla si falta uno. El campo opcional `cv` apunta a un PDF dentro de `/cv/`.
- Las imágenes de portada y las galerías necesitan texto `alt` significativo. Usar `/assets/images/<archivo>` para medios existentes o subidos. El CMS limita las subidas nuevas a 3 MB y convierte las imágenes raster a WebP, con un máximo de 1800 × 1800.

Para editar visualmente, ejecutar el servidor de desarrollo de Astro y abrir `http://localhost:4321/admin/index.html` en Chrome o Edge. Para editar archivos locales sin credenciales remotas, elegir **Work with Local Repository** y seleccionar esta carpeta. También se puede editar el JSON directamente. Revisar la página después de guardar y refrescar si es necesario.

En Sveltia, abrir **Páginas del sitio → Contenido del sitio → CV (PDF)** para subir o reemplazar el CV (hasta 10 MB). El archivo se guarda en `public/cv/`; después de guardar y reconstruir, el botón de CV de la página de perfil lo abre en una pestaña nueva. Si no hay archivo, el botón permanece deshabilitado.

## Conexión con GitHub y despliegue

El repositorio privado es `pablorandazzo/arq-camila-guevara`, rama `main`. Sveltia está configurado con **inicio de sesión por token** de GitHub; hay que dar acceso de escritura a los editores. Para ingresar, crear desde la pantalla de login del CMS un token fine-grained para este repositorio con **Contents: read and write** (la lectura de metadatos es automática) y pegarlo en el prompt del navegador. No guardar tokens en el repositorio. Un hosting estático conectado a Git debe construir con `npm install && npm run build` y publicar `dist/` en cada commit de contenido. Publicar el sitio en la raíz del dominio, porque los enlaces y medios usan rutas relativas a la raíz; verificar que el hosting sirva los `index.html` generados por directorio y `/admin/index.html`. El CMS no despliega el sitio construido por sí solo.

Las rutas heredadas `/about.html`, `/projects.html?filter=...`, `/journal.html`, `/contact.html`, `/project.html?id=...` y `/article.html?id=...` son entradas de compatibilidad en la salida estática. Los IDs de detalle conocidos redirigen del lado del cliente a sus páginas estáticas; los IDs desconocidos muestran un mensaje de entrada inexistente. Las URL antiguas con query string requieren JavaScript. Las rutas canónicas de las colecciones son completamente estáticas.
