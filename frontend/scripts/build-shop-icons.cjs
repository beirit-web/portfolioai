const buildIconSprite = require("./lib/build-icon-sprite.cjs");

const icons = {
  cake: "CakeSlice", bag: "ShoppingBag", search: "Search", user: "UserRound", plus: "Plus", minus: "Minus",
  check: "Check", trash: "Trash2", clock: "Clock3", filter: "SlidersHorizontal", back: "ArrowLeft",
  next: "ChevronRight", previous: "ChevronLeft", arrow: "ArrowUpRight", alert: "CircleAlert", send: "Send", receipt: "ReceiptText",
};

buildIconSprite({ icons, app: "shop", description: "shop icons." });
