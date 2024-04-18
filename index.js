import init from "@/init.js";
import { anchorToLink, route, NAVIGATE_DRIRECTION } from "@/router.js";
import { DEBUG } from "@/data/global.js";

document.addEventListener("DOMContentLoaded", async () => {
  init();
  anchorToLink(document);
  DEBUG.setDebug(true);
  route({
    path:"/game",
    direction: NAVIGATE_DRIRECTION.forward
  });
})
