/**
 * Frontmatter 解析与更新工具
 */

export interface FrontmatterResult {
  raw: string;
  body: string;
  data: Record<string, unknown>;
}

export function extractFrontmatter(content: string): FrontmatterResult {
  const match = content.match(/^(---\n[\s\S]*?\n---)\n?([\s\S]*)/);
  if (!match) return { raw: "", body: content, data: {} };

  const raw = match[1];
  const body = match[2];
  const data: Record<string, unknown> = {};

  const lines = raw.replace(/^---\n/, "").replace(/\n---$/, "").split("\n");
  let currentKey = "";
  let arrayValues: string[] = [];
  let inArray = false;

  for (const line of lines) {
    if (inArray) {
      if (line.match(/^\s+-\s+/)) {
        arrayValues.push(line.replace(/^\s+-\s+/, "").trim());
        continue;
      } else {
        data[currentKey] = arrayValues;
        inArray = false;
        arrayValues = [];
      }
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (value === "") {
      currentKey = key;
      inArray = true;
      arrayValues = [];
      continue;
    }

    if (value === "true") data[key] = true;
    else if (value === "false") data[key] = false;
    else data[key] = value;
  }

  if (inArray) data[currentKey] = arrayValues;

  return { raw, body, data };
}

export function updateFrontmatterField(
  content: string,
  field: string,
  value: string | string[]
): string {
  const lines = content.split("\n");
  const closingIdx = lines.indexOf("---", 1);
  if (closingIdx < 0) return content;

  const fieldRegex = new RegExp(`^${field}:`);
  const existingIdx = lines.findIndex(
    (l, i) => i > 0 && i < closingIdx && fieldRegex.test(l)
  );

  if (Array.isArray(value)) {
    const yamlArray = value.map(v => `  - ${v}`).join("\n");
    const newBlock = `${field}:\n${yamlArray}`;

    if (existingIdx >= 0) {
      let endIdx = existingIdx + 1;
      while (endIdx < closingIdx && lines[endIdx].match(/^\s+-\s+/)) endIdx++;
      lines.splice(existingIdx, endIdx - existingIdx, newBlock);
    } else {
      lines.splice(closingIdx, 0, newBlock);
    }
  } else {
    const newLine = `${field}: ${value}`;
    if (existingIdx >= 0) {
      lines[existingIdx] = newLine;
    } else {
      lines.splice(closingIdx, 0, newLine);
    }
  }

  return lines.join("\n");
}
