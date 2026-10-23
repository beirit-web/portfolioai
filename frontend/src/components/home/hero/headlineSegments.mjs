export function headlineSegments(text) {
  if (text === "Webentwicklung · Softwareentwicklung · Digitale Projekte") {
    return ["Webentwicklung", "Softwareentwicklung", "Digitale Projekte"];
  }
  if (text === "Webentwicklung & digitale Lösungen") {
    return ["Webentwicklung & digitale", "Lösungen"];
  }
  return [text];
}
