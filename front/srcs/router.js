import View from "@/lib/view";
import HomeView from "@/views/home/home_view";
import LoginView from "@/views/login/login_view";
import GameView from "@/views/game/game_view";
import ObservableObject from "@/lib/observable_object";
import User, { createProfile } from "@/data/user";

const user = new ObservableObject(new User({
  profile:
  createProfile(
  {
    id: "heshin",
    profileUrl: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSEOCV5tCOWEb17GSCGh-mv8QfhjmWo-eIO-Go32AHeA&s" ,
  }),
  friends: [
    createProfile({
      id: "Jeoseo",
      profileUrl: "https://ca.slack-edge.com/T039P7U66-U03M2KCK5T6-e75d6c9b8cb3-512"
    }),
  ...[
    "enjiko", "hyecheon", "yaham"
  ].map(name => createProfile({id: name}))
  ]
}))


export async function route() {
  const routes = [
    { path: "/", view: HomeView},
    { path: "/login", view: LoginView},
    { path: "/game", view: GameView },
  ]
  const match = routes.find((route) => {
    return route.path == location.pathname
  })
  const view = match ? match.view : HomeView;   
  const app = document.getElementById("app");
  app.innerHTML = "";
  const page =  new view({
    data: {
      user
    }
  });
  await page.render();
  app.appendChild(page);
  anchorToLink(app);
}

/** @param {string | URL} url */
function navigate(url) {
  history.pushState(null, null, url);
  route();
}

/** @param {HTMLElement | Document} parent */
export function anchorToLink(parent) {

  /** @type {HTMLAnchorElement[]} */
  const links = Array.from(parent.querySelectorAll("a[data-link]"));
  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(link.href);
    })
  })
}

