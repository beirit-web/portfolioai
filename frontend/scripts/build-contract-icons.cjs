const buildIconSprite = require("./lib/build-icon-sprite.cjs");

const icons = {
  "layout-dashboard": "LayoutDashboard", "folders": "Folders", "layout-template": "LayoutTemplate",
  "search": "Search", "folder-plus": "FolderPlus", "house": "House", "car": "Car",
  "package": "Package", "arrow-right": "ArrowRight", "clock": "Clock", "bookmark": "Bookmark",
  "file-text": "FileText", "chevron-down": "ChevronDown", "download": "Download",
  "sliders-horizontal": "SlidersHorizontal", "check": "Check", "chevron-left": "ChevronLeft",
  "chevron-right": "ChevronRight", "eye": "Eye", "pen-line": "PenLine",
  "ellipsis": "Ellipsis", "copy": "Copy", "printer": "Printer", "upload": "Upload",
  "x": "X", "rotate-ccw": "RotateCcw", "plus": "Plus", "minus": "Minus",
  "shield-check": "ShieldCheck", "circle-check": "CircleCheck", "sparkles": "Sparkles",
  "trash-2": "Trash2", "arrow-up-right": "ArrowUpRight", "circle-alert": "CircleAlert",
};

buildIconSprite({ icons, app: "contracts", description: "Lucide icons for the contract editor." });
