import MapSelector from "@/views/components/map_selector.js";
import GameView from "@/views/game/game_view.js";
import TournamentPanel from "@/views/components/tournament_panel.js";
import UserLabel from "@/views/components/user_label.js";
import ColorPicker from "@/views/components/color_picker.js";
import ResultModal from "@/views/components/result_modal.js";

/**
 * fileName for view class MUST contain '_' or '-' (Web components requirement)
*/

export default {
  "default_dir": "/srcs/views/",
  "filePath": {
    "components": [
      {
        "className": "MapSelector",
        "fileName": "map_selector.html"
      },
      {
        "className": "UserLabel",
        "fileName": "user_label.html"
      },
      {
        "className": "TournamentPanel",
        "fileName": "tournament_panel.html"
      },
      {
        "className": "ColorPicker",
        "fileName": "color_picker.html"
      },
      {
        "className": "ResultModal",
        "fileName": "result_modal.html"
      },
    ],
    "game": [ 
      {
        "className": "GameView",
        "fileName": "game_view.html"
      }
    ],
  }
}

export const viewConstructors = {
  GameView,
  MapSelector,
  UserLabel,
  TournamentPanel,
  ColorPicker,
  ResultModal
};

export const routes = [
  { path: "/game", view: GameView },
];

