import init from "@/init";
import { anchorToLink, route } from "@/router";

anchorToLink(document);

document.addEventListener("DOMContentLoaded", async () => {
  init();
  route();
})

window.addEventListener("popstate", route);

