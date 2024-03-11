import View from "@/lib/view";
import Scene from "@/game/game_scene";
import { GameData, Player } from "@/data/game_data";
import Observable from "@/lib/observable";
import ObservableObject from "@/lib/observable_object";

export default class GameView extends View {

  /** @type {HTMLCanvasElement} */
  #canvas;
  /** @type {Scene} */
  #scene;
  /** @type {ObservableObject} */
  #gameData;
  /** @type {{
   *  players: Player[]
   * }} */
  #data;
  #isPaused = true;
  /** @type {HTMLElement} */
  #startButton;

  constructor({data}) {
    super({data});
    this.#data = data;
    const bart = new Player({
      nickname: "bart"
    });
    const heshin = new Player({
      nickname: "heshin"
    });
    this.#data.players = [ bart, heshin ];
    this.#gameData = new ObservableObject(new GameData({
      players: [bart, heshin],
    }));
    this.#gameData.subscribe("scores", 
      ( /**@type {{ [key: string]: number }} */newScores) => {
        for (let nickname in newScores) {
          const player = this.#data.players.find(p => p.nickname == nickname);
          /** @type {HTMLElement} */
          const label = this.querySelector(
            `span[data-player=${nickname}]`);
          label.innerText = newScores[player.nickname].toString();
          this.#isPaused = true;
          this.#startButton.style.display = "inline-block";
        }
      
    })
  }

  connectedCallback() {
    super.connectedCallback();
    this.#canvas = this.querySelector(".game_canvas")
    const container = this.#canvas.parentElement;
    this.#canvas.width = container.offsetWidth
    this.#canvas.height = container.offsetHeight;
    this.#scene = new Scene({
      canvas: this.#canvas,
      gameData: this.#gameData
    });
    this.#startButton = this.querySelector("#start-button");
    this.#startButton
      .addEventListener("click", () => {
      if (this.#isPaused) {
        this.#scene.startGame();
        this.#isPaused = false;
        this.#startButton.style.display = "none";
      }
    }
    )
  }
}
