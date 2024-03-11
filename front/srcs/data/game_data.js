/**
 * @typedef {Object} GameResult
 * @property {Player[]} players
 * @property {{
 *   [key: string]: number
 * }} scores
 */

import { isEmptyObject } from "@/utils/typeutils";

/**
 * Player.
 */
export class Player {

  /** @type {string} */
  nickname;

  /** @type {GameResult[]} */
  records = []

  /** @params {string} nickname */
  constructor({nickname}) {
    this.nickname = nickname;
  }
}

/**
 * GameData.
 */
export class GameData {

  /** @type {Player[]} */
  #players = [ ];

  /** @type {{
   *   [key: string]: number
   * }}
   */
  positions = {};

  /**
   * @type {{
   *   [key: string]: number
   * }}
   */
  scores = {};

  /**
   * @param {{
   *  players: Player[],
   *  positions?: {
   *    [key: string]: number
   *  } 
   * }} args
   */
  constructor({players, positions = {}}) {
    this.#players = players;
    this.#players.forEach(player => {
      this.scores[player.nickname] = 0;
    });
    if (!isEmptyObject(positions))  {
      this.setPositions(players);
    }
    else {
      this.positions = positions;
    }
  }

  /** @param {Player[]} players */
  setPositions(players) {
    players.forEach((p, i) => {
      this.positions[p.nickname] = i;
    })
  }

  /**
   * @param {Player} player
   */
  getScore(player) {
    return this.scores[player.nickname];
  }

  getPlayers() {
    return [...this.#players];
  }
}
