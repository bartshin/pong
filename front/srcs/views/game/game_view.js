import View from "@/lib/view";
import Scene from "@/game/game_scene";

export default class GameView extends View {

  /** @type {HTMLCanvasElement} */
  #canvas;
  #scene;

  constructor({data}) {
    super({data});
  }

  connectedCallback() {
    super.connectedCallback();

    this.#canvas = this.querySelector(".game_canvas")
    const container = this.#canvas.parentElement;
    this.#canvas.width = container.offsetWidth
    this.#canvas.height = container.offsetHeight;
    this.#scene = new Scene({canvas: this.#canvas});
  }
}
