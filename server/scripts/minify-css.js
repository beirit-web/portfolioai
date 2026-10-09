const fs = require("fs");

const [, , inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/minify-css.js <input.css> <output.css>");
  process.exit(1);
}

const source = fs.readFileSync(inputPath, "utf8");
let output = "";
let quote = "";
let inComment = false;
let pendingSpace = false;

const noSpaceBefore = new Set(["{", "}", ":", ";", ",", ")", "]"]);
const noSpaceAfter = new Set(["{", "}", ":", ";", ",", "(", "["]);

for (let i = 0; i < source.length; i += 1) {
  const char = source[i];
  const next = source[i + 1];

  if (inComment) {
    if (char === "*" && next === "/") {
      inComment = false;
      i += 1;
    }
    continue;
  }

  if (!quote && char === "/" && next === "*") {
    inComment = true;
    i += 1;
    continue;
  }

  if (quote) {
    output += char;
    if (char === "\\" && next) {
      output += next;
      i += 1;
    } else if (char === quote) {
      quote = "";
    }
    continue;
  }

  if (char === "\"" || char === "'") {
    if (pendingSpace && output && !noSpaceAfter.has(output.at(-1))) {
      output += " ";
    }
    pendingSpace = false;
    quote = char;
    output += char;
    continue;
  }

  if (/\s/.test(char)) {
    pendingSpace = true;
    continue;
  }

  if (pendingSpace && output && !noSpaceBefore.has(char) && !noSpaceAfter.has(output.at(-1))) {
    output += " ";
  }
  pendingSpace = false;

  if (noSpaceBefore.has(char) && output.endsWith(" ")) {
    output = output.slice(0, -1);
  }

  output += char;
}

output = output
  .replace(/;}/g, "}")
  .trim();

fs.writeFileSync(outputPath, `${output}\n`);
