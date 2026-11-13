import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";
import projectsCssFilter from "./src/lib/projectsCssFilter.mjs";

export default {
  plugins: [
    tailwindcss(),
    autoprefixer(),
    projectsCssFilter(),
  ],
};
