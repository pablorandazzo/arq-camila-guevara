# Studio RHE — visual source notes

Source: https://www.studiorhe.com/ (server-rendered HTML and computed styles, inspected 17 October 2026).

## Palette

The six semantic OKLch tokens below preserve the observed sRGB values through CSS relative color conversion; the source values are shown for auditability.

```css
:root {
  --bg: oklch(from #ffffff l c h);       /* white */
  --surface: oklch(from #ffffff l c h);  /* white */
  --fg: oklch(from #000000 l c h);       /* black */
  --muted: oklch(from #b8b8b8 l c h);    /* source gray */
  --border: oklch(from #bfbfbf l c h);   /* black at 25% on white */
  --accent: oklch(from #f06446 l c h);   /* rgb(240,100,70) */
}
```

Display: `Reckless Light`, Georgia, serif. Body: `Suisse Intl`, Helvetica, sans-serif. Mono: ui-monospace, SFMono-Regular, Consolas, monospace.

## Observed rules

1. On desktop the home page is a horizontal sequence of viewport-height editorial panels with a fixed narrow rail on the right.
2. The opening project photograph is full-bleed, with an oversized white serif headline anchored near the bottom and a smaller serif introduction at the top right.
3. Navigation expands into nested white rectangular panels, separated by fine gray rules; the image behind is darkened.
4. The site is mostly pure white and black; coral orange is reserved for the journal panel, navigation hover and selected controls.
5. Photography is the principal content material; titles and restrained text links sit beside the images rather than inside rounded cards.
