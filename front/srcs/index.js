import init from "@/init";
import { anchorToLink, route, NAVIGATE_DRIRECTION } from "@/router";

document.addEventListener("DOMContentLoaded", async () => {
  init();
  anchorToLink(document);
  route({
    path:"/game",
    direction: NAVIGATE_DRIRECTION.forward
  });
})
