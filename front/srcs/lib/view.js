//@ts-nocheck
import { getValue, setValue, testValue } from "@/utils/keypath";

const COMPONENT_KEY = 'data-component';
const LOOP_KEY = 'data-for';
const CONDITION_KEY = 'data-condition';

/**
 * Base class for page or component
 * @extends {HTMLElement}
 */
export default class View extends HTMLElement {
  static DEFAULT_DIR = "";
  static template = null;
  static allViews = {
    constructor: {},
    dirName: {},
    fileName: {}
  };
  static regexReplace =  /{{([^}}]+)}}/g;
  static regexMatch =  /{{([^}}]+)}}/;

  static async getTemplate() {
    const res = await fetch(this.dirName + this.fileName);
    const text = await res.text(); 
    this.template = text.trim().replace(/>\s+</g, "><");
  }

  /** @params {{
   *  viewName: string,
   *  fileName: string,
   *  dirName: string
   * }} */
  static register({viewName, fileName, dirName }) {
    customElements.define(
      viewName,  
      this.prototype.constructor);
    const className = this.prototype.constructor.name;
    View.allViews.constructor[className] = this.prototype.constructor
    View.allViews.fileName[className] = fileName;
    View.allViews.dirName[className] = dirName;
  }

  static get dirName() {
    return View.allViews.dirName[this.name]
  }

  static get fileName() {
    return View.allViews.fileName[this.name]
  }

  /** @type{any} */
  #data;

  /** @type {{[key: string]: Array<
   * {
   *  nodeRef: WeakRef<HTMLElement>,
   *  template: string
   * }
   * >}} */
  #reRenderTriggers = {};

  /** @param {any} data */
  constructor({data} = {}) {
    super();
    this.#data = data;
    if (data) {
      Object.keys(data).forEach(key => this.#reRenderTriggers[key] = []);
    }
  }

  async render() {
    if (!this.constructor.template) {
      await this.constructor.getTemplate();
    }
    /** @type {HTMLElement} node */
    this.innerHTML = this.constructor.template;
    (await this.renderComponents())
      .#addTriggers()
      .#replaceAttributes()
      .#expandForLoops(this)
      .#filterCondition(this, this.#data)
      .#fillData(this);
  }

  reRender() {
    for (let key in this.#reRenderTriggers) {
      this.#reRenderTriggers[key].forEach (({nodeRef, template}) => {

        const node = nodeRef.deref();
        if (node) {
          node.innerHTML = template;
          this.#fillData(node);
        }
      })
    }
  }

  async renderComponents() {

    const elements = this.querySelectorAll(`[${COMPONENT_KEY}]`);
    for (let i = elements.length - 1; i >= 0; i--) {
      const className = elements[i].getAttribute(COMPONENT_KEY);
      /** @type{View} */ 
      const viewClass = View.allViews.constructor[className];
      const view =  await new viewClass({
        data: this.#data
      });
      await view.render();
      elements[i].replaceWith(view);
    }
    return this;
  }

  #addTriggers() {
    for (let i = 0; i < this.children.length; i++) {
      const child = this.children[i];
      if (!(child instanceof HTMLElement))
        continue;
      let matches = View.regexMatch.exec(child.innerHTML);
      if (matches)  {
        const key = matches[1].split('.')[0];
        if (!this.#reRenderTriggers[key]) {
          console.error("Fail to add rerender trigget for ", key);
          continue;
        }
        this.#reRenderTriggers[key].push({
          nodeRef: new WeakRef(child),
          template: child.innerHTML,
        })
      }
    }
    return this;
  }

  /** @param {HTMLElement} node */
  #replaceAttributes() {
    const attrs = this.attributes;
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      if (attr.value.length == 0) 
        continue;
      attrs[i].value = this.#replaceContent(
        attr.value, this.#data);
    }
    return this;
  }

  #expandForLoops(root) {
    const elements = this.querySelectorAll(`[${LOOP_KEY}]`);

    for (let i = 0; i < elements.length; i++) {
      this.#expandForLoop(elements[i]);
    }
    return root;
  }

  /** @param {HTMLElement} node */
  #expandForLoop(node) {
    const keys = node.getAttribute(LOOP_KEY).split("in")
      .map(key => key.trim());
    if (keys.length < 2)  {
      console.err("Not valid for loop use 'A in B'", node);
      return;
    }
    let values = getValue(this.#data, keys[1]);
    if (!Array.isArray(values)) {
      console.error(`Data for ${key[1]} is not array `, 
        values
      );
      return ;
    }
    const container = {
      ...this.#data,
    }
    const template = node.innerHTML;
    node.innerHTML = "";
    values.forEach(elem => {
      container[keys[0]] = elem;
      node.innerHTML += this.#replaceContent(template, 
        container );
      this.#filterCondition(node, container);
    })
  }

    /** @param {HTMLElement} node
     *  @param {Object} container */
  #filterCondition(node, container) {

    const elements = this.querySelectorAll(`[${CONDITION_KEY}]`);
    for (let i = 0; i < elements.length; i++) {
      const key = elements[i].getAttribute(CONDITION_KEY);
      const elem = elements[i];
      if (!testValue(container, key)) {
        if (elem.parentNode) 
          elem.parentNode.removeChild(elem);
        else
          elem.innerHTML = "";
      }
      else {
        elem.removeAttribute(CONDITION_KEY);
      }
    }

    return node;
  }

  #fillData(node) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (!(child instanceof HTMLElement))
        continue;
      this.#replaceAttributes(child);
      child.innerHTML = this.#replaceContent(
        child.innerHTML, this.#data); 
      if (child.hasAttribute(COMPONENT_KEY)) {
        continue;
      }
    }
    return this;
  }

  /** @param {string} content
   *  @param {any} container
   * */
  #replaceContent(content, container) {
    while (true)  {
      let matches = View.regexReplace.exec(content);
      if (!matches)  {
        return content;
      }
      const data = getValue(container, matches[1]);
      content = content.replaceAll(
        new RegExp(matches[0], "g"), data);
    }
  }

  connectedCallback() { }

  disConnectedCallback() { }
}

