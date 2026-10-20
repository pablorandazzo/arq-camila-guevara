# Guía de implementación

Este documento describe el contrato visual y técnico del sitio. Es la referencia para mantener la coherencia entre páginas, componentes y estados interactivos.

## Stack y estructura

- Astro 7 con salida estática; estilos globales en `assets/site.css` e interacciones en `assets/interaction.js`.
- Rutas: `/` (portada), `/perfil/`, `/projects/`, `/projects/resorts/`, `/projects/commercial/`, `/projects/<id>/` y `/contact/`.
- Contenido editable en `src/content/site.json` y `src/content/projects/*.json`; validación con Zod en `src/lib/site-schema.ts`.
- CMS Sveltia en `public/admin/config.yml`.

## Sistema visual

- Preservar escala tipográfica, ritmo de espaciado, tokens de color, radios, sombras, tiempos de movimiento y estados de componentes.
- Extraer los tokens reutilizables antes de escribir componentes: fondo, superficie, texto, texto atenuado, borde, acento, radio, sombra, espaciado, escala tipográfica y duración/easing del movimiento.
- Respetar la geometría del layout: anchos máximos, márgenes, columnas, proporciones de tarjetas, elementos fijos y navegación por viewport.
- Conservar el texto, las etiquetas y los datos reales. No reemplazar contenido específico por relleno genérico de marketing.
- No introducir lavados de fondo beige, crema, durazno, rosa ni marrón anaranjado salvo que sean colores de marca explícitos.

## Contrato responsive

Validar la implementación en esta matriz de viewports:

- Móvil compacto: 360×800
- Móvil estándar: 390×844
- Móvil grande: 430×932
- Plegable / tablet pequeña: 600×960
- Tablet vertical: 820×1180
- Tablet horizontal: 1024×768
- Notebook: 1366×768
- Escritorio: 1440×900
- Escritorio amplio: 1920×1080

Usar umbrales semánticos de layout, tipografía y espaciado fluidos con `clamp()` y container queries cuando el ancho del componente importa más que el del viewport. Conservar las media queries y los cambios de layout existentes. Evitar el desborde horizontal.

## Interacción y accesibilidad

- Conservar estados hover, focus, pressed, disabled, loading y validación donde existan.
- Mantener la jerarquía de encabezados y los roles semánticos: los controles siguen siendo botones, enlaces o inputs.
- Los estados de foco deben permanecer visibles.
- Soportar teclado en menú, desplazamiento de portada y galerías.
- Respetar `prefers-reduced-motion` y no anular la entrada nativa del usuario.

## Contenido y medios

- Las imágenes necesitan texto `alt` significativo.
- Las subidas nuevas del CMS se limitan a 3 MB y se convierten a WebP, con un máximo de 1800 × 1800.
- Los medios existentes se sirven desde `/assets/`; no agregar Git LFS.

## Verificación

1. Ejecutar `npm run check`, `npm test` y `npm run build` antes de cerrar un cambio.
2. Revisar la portada, el perfil, los listados de proyectos y el contacto en los viewports indicados.
3. Comprobar que no haya desborde horizontal ni saltos de layout.
4. Confirmar que el menú, los enlaces y las transiciones funcionan con teclado y con movimiento reducido.
