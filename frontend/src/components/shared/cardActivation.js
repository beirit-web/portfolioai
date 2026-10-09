export function activateCardLink(event, navigate) {
  if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  navigate();
}
