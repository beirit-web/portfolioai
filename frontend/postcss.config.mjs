import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import projectsCssFilter from "./src/lib/projectsCssFilter.mjs";

export default {
  plugins: [
    tailwindcss({ config: "./tailwind.config.mjs" }),
    autoprefixer(),
    projectsCssFilter(),
  ],
};
