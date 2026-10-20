# Especificación visual

## Paleta

Los seis tokens semánticos en OKLch conservan los valores sRGB a través de la conversión relativa de color de CSS; los valores de origen se muestran para poder auditarlos.

```css
:root {
  --bg: oklch(from #ffffff l c h);       /* blanco */
  --surface: oklch(from #ffffff l c h);  /* blanco */
  --fg: oklch(from #000000 l c h);       /* negro */
  --muted: oklch(from #b8b8b8 l c h);    /* gris */
  --border: oklch(from #bfbfbf l c h);   /* negro al 25% sobre blanco */
  --accent: oklch(from #f06446 l c h);   /* rgb(240,100,70) */
}
```

Títulos: `Reckless Light`, Georgia, serif. Texto: `Suisse Intl`, Helvetica, sans-serif. Monoespaciada: ui-monospace, SFMono-Regular, Consolas, monospace.

## Reglas de composición

1. En escritorio, la portada es una secuencia horizontal de paneles editoriales del alto del viewport, con un riel fijo y angosto a la derecha.
2. La fotografía de apertura ocupa todo el ancho, con un titular serif blanco de gran tamaño anclado cerca del borde inferior y una introducción serif más pequeña arriba a la derecha.
3. La navegación se despliega en paneles rectangulares blancos anidados, separados por líneas grises finas; la imagen de fondo se oscurece.
4. El sitio es principalmente blanco y negro; el naranja coral se reserva para acentos, estados hover y controles seleccionados.
5. La fotografía es el material principal; los títulos y los enlaces de texto discretos acompañan a las imágenes en lugar de encerrarse en tarjetas redondeadas.
