const buildIconSprite = require("./lib/build-icon-sprite.cjs");

const icons = {
  sprout: "Sprout", search: "Search", plants: "Flower2", calendar: "CalendarDays", weather: "CloudSun",
  droplet: "Droplet", plus: "Plus", check: "Check", clock: "Clock3", pause: "Pause", user: "UserRound",
  arrow: "ArrowUpRight", back: "ArrowLeft", next: "ChevronRight", previous: "ChevronLeft",
  edit: "Pencil", trash: "Trash2", x: "X", alert: "CircleAlert", pin: "MapPin", log: "History", save: "Save",
};

buildIconSprite({ icons, app: "botanic", description: "Lucide icons for Botanic." });
