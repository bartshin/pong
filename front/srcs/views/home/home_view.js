import View from "@/lib/view";
import ObservableObject from "@/lib/observable_object";
import User from "@/data/user";

export default class HomeView extends View {

  /** @type {ObservableObject} user */
  #user;

  constructor({data}) {
    /** @type {ObservableObject} user */
    super({data});
    this.#user = data.user;
  }
}

