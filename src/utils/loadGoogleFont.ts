import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function loadLocalFont(
  weight: number,
  style: string
): Promise<ArrayBuffer> {
  const filename = `ibm-plex-mono-latin-${weight}-${style}.woff`;
  const fontPath = join(process.cwd(), "public", "fonts", filename);
  const buffer = await readFile(fontPath);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

async function loadGoogleFonts(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _text: string
): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  const fontsConfig = [
    { name: "IBM Plex Mono", weight: 400, style: "normal" },
    { name: "IBM Plex Mono", weight: 700, style: "normal" },
  ];

  const fonts = await Promise.all(
    fontsConfig.map(async ({ name, weight, style }) => {
      const data = await loadLocalFont(weight, style);
      return { name, data, weight, style };
    })
  );

  return fonts;
}

export default loadGoogleFonts;
