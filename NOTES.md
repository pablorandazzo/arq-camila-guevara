# Studio RHE — notas de la réplica

## Fuente y derechos

- Sitio de referencia: https://www.studiorhe.com/
- Autor del sitio y de las obras mostradas: Studio RHE. El sitio original atribuye su diseño web a Outpost.
- Tecnología observada: Nuxt/Vue con HTML renderizado en servidor, CMS DatoCMS, fuentes Reckless y Suisse Intl, portada horizontal y navegación lateral animada.
- No se encontró un repositorio oficial con licencia reutilizable. Los repositorios públicos con nombres similares no son el código fuente verificado de la web original. El código y los recursos originales deben tratarse como propietarios; esta réplica es para estudio y revisión local. Antes de publicarla, obtener autorización o sustituir la marca, textos, fotografías y fuentes.
- Fotografía y logotipo: recursos originales obtenidos de Studio RHE y DatoCMS; se guardan localmente en `assets/`. Conservar la atribución a Studio RHE.

## Evaluación inicial

- Complejidad: L4, sitio editorial con desplazamiento y navegación animados; sin funciones de cuenta o pagos.
- Modo: recreación visual fiel basada en HTML renderizado, CSS calculado, imágenes y fuentes reales; no se copió una base de código sin licencia.
- Alta fidelidad: portada, menú, tipografía, paleta, catálogo principal y las cinco rutas de navegación.
- Aproximaciones: easing del desplazamiento horizontal, transición de página, contenido completo de las fichas y animaciones de entrada.
- Fuera de alcance: CMS, envío a servidor del formulario y artículos completos. El formulario abre el cliente de correo; las fichas de artículos enlazan con el texto íntegro del sitio original.

## Ver en local

Desde la carpeta del proyecto, iniciar un servidor estático (por ejemplo `python -m http.server 8123`) y abrir `http://127.0.0.1:8123/index.html`.

## Archivos y rutas

- `index.html`: portada horizontal en escritorio y vertical en móvil.
- `about.html`, `projects.html`, `journal.html`, `contact.html`: secciones de navegación.
- `project.html?id=...`: fichas locales de los 25 proyectos del catálogo; seis incluyen un resumen adaptado de la fuente y las demás muestran datos e imagen verificados.
- `article.html?id=...`: fichas locales de los 18 artículos; tres incluyen un resumen adaptado de la fuente. Cada ficha enlaza al artículo completo original.
- `privacy.html`: explica la ausencia de seguimiento en la réplica y remite a la política oficial.
- `assets/site.css`, `assets/site.js`: sistema visual e interacciones; `brand-spec.md`: valores observados.

## Diferencias principales

| Zona | Original | Réplica | Evidencia |
|---|---|---|---|
| Portada | Fotografía a sangre, titular inglés y desplazamiento horizontal | Misma imagen, tipografía y composición; texto en español y desplazamiento horizontal con inercia | `RECON/screenshots/original-1440.png`, `clone-1440.png` |
| Menú | Cuatro paneles encajados en el lateral | Cuatro paneles, oscurecimiento, apertura y cierre con teclado | Inspección del menú original y prueba local |
| Catálogo | 25 proyectos con filtros y vista previa | 25 proyectos, mismas fotografías y filtros, fichas resumidas | DOM original de `/projects` y prueba local |
| Diario | 18 artículos y categorías | 18 entradas con fotografías, filtros y enlace a contenido íntegro original | DOM original de `/journal` y prueba local |
| Móvil | Portada vertical | Portada vertical y navegación táctil sin desplazamiento horizontal de documento | `RECON/screenshots/original-390.png`, `clone-390.png` |

## Verificación

- Navegación local: ocho archivos HTML comprobados; sin rutas de archivos o imágenes rotas.
- `assets/site.js`: sintaxis verificada; menú, desplazamiento horizontal, filtros y diálogo comprobados en el navegador.
- Consola: sin errores en portada, proyectos, diario y contacto inspeccionados.
- Móvil de 390 px: ancho del documento igual al viewport y titular completo en una línea.
- `CLONE_AUDIT.md` contiene los hallazgos automáticos; la sección final distingue falsos positivos de riesgos reales.
- La herramienta automatizada de reconocimiento no pudo iniciarse al no encontrar un ejecutable compatible de Chrome/Edge/Chromium en el entorno; la inspección y capturas se realizaron con el navegador disponible por Chrome DevTools. No se generaron mapas de rutas ni comparación de píxeles automáticos.

## Puntuación orientativa (0–5)

Fuente 3; estructura 4; visual 4; interacción 3; responsive 4; función 3; contenido 3; riesgo de despliegue 2. Se puntúan solo los aspectos observados en HTML, capturas y pruebas locales; no implica autorización para publicar los recursos.
