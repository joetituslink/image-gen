export const mainTextFontOptions = [
  {
    id: "arial",
    label: "Arial",
    family: "Arial, sans-serif",
    previewText: "Reliable classic sans",
  },
  {
    id: "georgia",
    label: "Georgia",
    family: "Georgia, Times New Roman, serif",
    previewText: "Classic editorial serif",
  },
  {
    id: "inter",
    label: "Inter",
    family: "Inter, Arial, sans-serif",
    previewText: "Clean modern sans",
  },
  {
    id: "roboto",
    label: "Roboto",
    family: "Roboto, Arial, sans-serif",
    previewText: "Popular UI sans",
  },
  {
    id: "open-sans",
    label: "Open Sans",
    family: '"Open Sans", Arial, sans-serif',
    previewText: "Friendly readable sans",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    family: '"DM Sans", Arial, sans-serif',
    previewText: "Friendly geometric sans",
  },
  {
    id: "poppins",
    label: "Poppins",
    family: "Poppins, Arial, sans-serif",
    previewText: "Rounded modern sans",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    family: "Montserrat, Arial, sans-serif",
    previewText: "Bold editorial sans",
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    family: '"Space Grotesk", Arial, sans-serif',
    previewText: "Sharp creative sans",
  },
  {
    id: "lora",
    label: "Lora",
    family: "Lora, Georgia, serif",
    previewText: "Warm readable serif",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    family: "Merriweather, Georgia, serif",
    previewText: "Strong classic serif",
  },
  {
    id: "playfair-display",
    label: "Playfair Display",
    family: '"Playfair Display", Georgia, serif',
    previewText: "Elegant high-contrast serif",
  },
];

export const mainTextFontFamilies = new Set(
  mainTextFontOptions.map((font) => font.family)
);

export const serverFontRegistrations = [
  {
    family: "Inter",
    path: "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2",
  },
  {
    family: "Inter",
    path: "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2",
  },
  {
    family: "Roboto",
    path: "node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2",
  },
  {
    family: "Roboto",
    path: "node_modules/@fontsource/roboto/files/roboto-latin-700-normal.woff2",
  },
  {
    family: "Open Sans",
    path: "node_modules/@fontsource/open-sans/files/open-sans-latin-400-normal.woff2",
  },
  {
    family: "Open Sans",
    path: "node_modules/@fontsource/open-sans/files/open-sans-latin-700-normal.woff2",
  },
  {
    family: "DM Sans",
    path: "node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2",
  },
  {
    family: "DM Sans",
    path: "node_modules/@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2",
  },
  {
    family: "Poppins",
    path: "node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2",
  },
  {
    family: "Poppins",
    path: "node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2",
  },
  {
    family: "Montserrat",
    path: "node_modules/@fontsource/montserrat/files/montserrat-latin-400-normal.woff2",
  },
  {
    family: "Montserrat",
    path: "node_modules/@fontsource/montserrat/files/montserrat-latin-700-normal.woff2",
  },
  {
    family: "Space Grotesk",
    path: "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2",
  },
  {
    family: "Space Grotesk",
    path: "node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2",
  },
  {
    family: "Lora",
    path: "node_modules/@fontsource/lora/files/lora-latin-400-normal.woff2",
  },
  {
    family: "Lora",
    path: "node_modules/@fontsource/lora/files/lora-latin-700-normal.woff2",
  },
  {
    family: "Merriweather",
    path: "node_modules/@fontsource/merriweather/files/merriweather-latin-400-normal.woff2",
  },
  {
    family: "Merriweather",
    path: "node_modules/@fontsource/merriweather/files/merriweather-latin-700-normal.woff2",
  },
  {
    family: "Playfair Display",
    path: "node_modules/@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2",
  },
  {
    family: "Playfair Display",
    path: "node_modules/@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2",
  },
];
