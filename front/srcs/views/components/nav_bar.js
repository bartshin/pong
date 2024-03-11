import View from "@/lib/view";

export default class NavBar extends View {

  constructor(params) {
    super();
    if (params && params.data) {
      this.data = params.data;
    }
  }
}
