/**
 * @typedef {Object} UserProfile
 *  @property {string} id
 *  @property {boolean} isLoggedIn
 *  @property {{
 *   url: string
 *  }} avartar
 */

export default class User {

  /** @type {UserProfile} */
  profile;

  /** @type {UserProfile[]} */
  friends;

  /** 
   * @params {Object} args
   * @param {{
   *   profile: UserProfile | null,
   *   friends: UserProfile[]
   *  }} args
   */
  constructor({
    profile,
    friends = [],
  }) {
    this.profile = profile || null;
    this.friends = friends;
    if (this.profile) {
      this.profile.isLoggedIn = true;
    }
  }
}

/**
 * createProfile.
 *
 * @params {Object} args
 * @param {{
 *  id: string,
 *  profileUrl?: string,
 *  isLoggedIn?: boolean
 * }} args
 * @returns UserProfile
 */
export function createProfile({id, profileUrl, isLoggedIn}) {
  return ({
    id,
    isLoggedIn: isLoggedIn ?? false,
    avartar: {
      url: profileUrl ?? null
    }
  })
}
