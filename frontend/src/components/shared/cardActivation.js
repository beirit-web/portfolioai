export function isPlainLinkClick(event) {
  return !event.defaultPrevented
    && event.button === 0
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function activateCardLink(event, navigate) {
  if (event.type === "keydown") {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || event.target !== event.currentTarget || event.key !== "Enter" && event.key !== " ") return;
  } else if (!isPlainLinkClick(event)) return;
  event.preventDefault();
  navigate();
}
