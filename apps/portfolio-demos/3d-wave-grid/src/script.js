import "./style.css";
import Orchestrator from "./ThreeJS/Orchestrator.js";
import gsap from "gsap";

const orchestrator = new Orchestrator(document.querySelector("canvas.webgl"));

function updateTime() {
    const timeElement = document.getElementById("local-time");
    if (timeElement) {
        const now = new Date();
        const options = {
            timeZone: "Asia/Hong_Kong",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        };
        timeElement.textContent =
            now.toLocaleTimeString("en-US", options) + " HKT";
    }
}

updateTime();
setInterval(updateTime, 60000);

// Staggered fade-in animation for text elements
const animatedElements = [
    ".nav-logo a",
    ".nav-links a",
    ".nav-socials a",
    ".nav-time p",
    ".hero-section h1",
    ".bar-location p",
    ".bar-projects a",
    ".bar-availability a",
];

gsap.fromTo(
    animatedElements,
    {
        opacity: 0,
        y: 20,
    },
    {
        duration: 1,
        opacity: 1,
        y: 0,
        stagger: 0.1,
        ease: "power3.out",
        delay: 0.5,
    },
);
