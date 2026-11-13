export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Avenir Next"', '"Segoe UI"', "Arial", "sans-serif"],
        display: ['"Iowan Old Style"', "Georgia", "serif"],
      },
      boxShadow: {
        line: "0 1px 0 rgba(15, 23, 42, 0.08)",
        panel: "0 22px 70px rgba(31, 41, 55, 0.12)",
      },
    },
  },
  plugins: [],
};
