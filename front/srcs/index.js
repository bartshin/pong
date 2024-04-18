import init from "@/init";
import { anchorToLink, route, NAVIGATE_DRIRECTION } from "@/router";
import { DEBUG } from "@/data/global";

document.addEventListener("DOMContentLoaded", async () => {
  init();
  anchorToLink(document);
  DEBUG.setDebug(true);
  route({
    path:"/game",
    direction: NAVIGATE_DRIRECTION.forward
  });
})
