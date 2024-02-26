//@ts-nocheck
import CONFIG from  "@/views/config";
import View from "@/lib/view";
import HomeView from "@/views/home/home_view";
import LoginView from "@/views/login/login_view";
import GameView from "@/views/game/game_view";
import NavBar from "@/views/components/nav_bar";
import viewClasses from "@/views/viewClasses";

// CONFIG file path
export default function init() {
  View.DEFAULT_DIR = CONFIG["default_dir"];
  for (const dir in CONFIG.filePath) {
    for (let view of CONFIG.filePath[dir]) {
      const viewClass = viewClasses[view.className];
      const viewName = view.fileName.replaceAll('_', '-');
      viewClass.register({
        viewName,
        fileName: view.fileName,
        dirName: View.DEFAULT_DIR + dir + "/"
      });
    }
  }
}
