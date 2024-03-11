import * as THREE from "three";
import Physics from "@/game/physics";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import PhysicsEntity from "@/game/physicsEntity";
import { EPSILON } from "@/game/physicsUtils";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { GameData, Player } from "@/data/game_data";
import ObservableObject from "@/lib/observable_object";

const FRAME_TIME_THRESHOLD = 0.01;
const MAX_PEDDLE_SPEED = 30;
const PEDDLE_ACCEL = 5;
const PEDDLE_DECEL_RATIO = 0.5;
const SOUND_EFFECT_THRESHOLD = 0.3;

const WALL_TYPES = Object.freeze({
  safeWall: "SAFE",
  trapWall: "TRAP",
});

const DIRECTION = Object.freeze({
  top: "TOP",
  bottom: "BOTTOM",
  LEFT: "LEFT",
  RIGHT: "RIGHT"
});

const PLAYER_POSITION = Object.freeze({
  [DIRECTION.top]: 0,
  [DIRECTION.bottom]: 1,
});

/** @type {{
 *    [key: string] : {
 *      player: number,
 *      x: number,
 *      y: number,
 *    }
 *  }}
 */
const controlMap = {
   "ArrowLeft": {
    player: 0,
    x: -1,
    y: 0,
  },
  "ArrowRight": {
    player: 0, 
    x: 1,
    y: 0,
  },
  "-": {
    player: 1, 
    x: -1,
    y: 0,
  },
  "=": {
    player: 1, 
    x: 1,
    y: 0,
  },
};

/**
 * Game Scene.
 */
export default class Scene {


  #physics;
  #scene;
  #gameData;
  /** @type {"TOP" | "BOTTOM" | null} */
  #lostSide = null;
  #gameScene;
  #canvas;
  #windowSize;
  /** @type {THREE.PerspectiveCamera} */
  #camera;

  /** @type {THREE.WebGLRenderer} */
  #renderer;
  
  /** @type {{
   *   clock: THREE.Clock,
   *   elapsed: number
  * }} */
  #time;

  /** @type {Array<{
   *    mesh: THREE.Mesh,
   *    physicsId: number
   *  }>}
   */
  #objects = [];

  /**
   * @type {{
   *  mesh: THREE.Mesh | null,
   *  physicsId: number | null
   * }} 
   */
  #ball = { mesh: null, physicsId: null };
  
  /** @type {{
   *    mesh: THREE.Mesh,
   *    physicsId: number
   *  }[]}
   */
  #peddles = [];

	/** @type {number[]} */
	#eventsIds = [];

	#hitSound = {
		sound: new Audio("resources/sound/hit.mp3"),
		lastPlayed: 0
	};

  /** @type {{
   *    pressed: {
   *      player: number,
   *      x: number,
   *      y: number,
   *      key: string | null,
   *    }
   *   }[]}
   */
  #peddleControls = [
    {
      pressed: {
        player: 0,
        x: 0,
        y: 0,
        key: null
      }
    }, 
    {
      pressed: {
        player: 1,
        x: 0,
        y: 0,
        key: null
      }
    }
  ];

  isBallMoving = false;
  #renderId = 0;

  /**
   * @params {Object} params
   * @param {{
   *  canvas: HTMLCanvasElement,
   *  gameData: ObservableObject,
   * }} params
   */
  constructor({canvas, gameData}) {
    this.#canvas = canvas;
    this.#gameData = gameData;
    this.#scene = new THREE.Scene();
    this.#gameScene = new THREE.Scene();
    this.#windowSize = {
      width: canvas.width,
      height: canvas.height
    };
    this.#physics = new Physics();
    this.#load()
      .#init()
      .#addObjects()
      .#addHelpers()
      .#addControls()
			.#addEvents()
      .#startRender();
  }

  prepareDisappear() {
    
  }

  #load() {

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      "resources/macintosh/scene.gltf",
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(25, 25, 25);
        const root = model.children[0].children[0].children[0];
        const screen = root.children[2];
        const screenBox= new THREE.Box3().setFromObject(screen);
        const screenSize = {
          x: screenBox.max.x - screenBox.min.x,
          y: screenBox.max.y - screenBox.min.y,
          z: screenBox.max.z - screenBox.min.z
        };
        const sceneBox = new THREE.Box3().setFromObject(this.#gameScene);
        const sceneSize = {
          x: sceneBox.max.x - sceneBox.min.x,
          y: sceneBox.max.y - sceneBox.min.y,
          z: sceneBox.max.z - sceneBox.min.z
        };
        root.add(this.#gameScene);
        this.#gameScene.position.copy(screen.position)
        this.#gameScene.position.z += 0.08;
        
        this.#gameScene.scale.set(
         screenSize.x / sceneSize.x - 0.02,
         screenSize.y / sceneSize.y - 0.015,
         screenSize.z / sceneSize.z  
        );
        this.#scene.add(model);
      },
      (_) => {
      },
      (error) => {
        console.error("load error", error);
        }
    )

    
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load("resources/night_field.hdr",
      (environmentMap) =>
{
   environmentMap.mapping = THREE.EquirectangularReflectionMapping;

    this.#scene.background = environmentMap;
    this.#scene.environment = environmentMap;
    this.#scene.backgroundIntensity = 1;
})


const bgm = new Audio("resources/sound/bgm1.mp3");
bgm.volume = 0.2;
bgm.play()

    return this;
  }

  startGame() {
    this.#addBall();
    this.isBallMoving = true;
  }

  #init() {
    this.#setLights()
    .#setCamera()
    .#setRenderer()
    .#addResizeCallback()
    .#addVisibleCallback()
    .#setTime()
    return this;
  }

  #addObjects() {
    this.#addWalls()
      .#addPeddles()
    return this;
  }

  #addBall() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 0.3,
        roughness: 0.4
      })
    );
    mesh.position.set(0, 0, 0);
    const ballPhysics = PhysicsEntity.createCircle({
      type: "MOVABLE",
      collideType: "DYNAMIC",
      radius: 1,
      center: { x: 0, y:0 }
    });
    ballPhysics.veolocity = {
      x: 10,
      y: 15
    };
    const physicsId = this.#physics.addObject(ballPhysics)[0];

    this.#objects.push(
      {
        mesh,
        physicsId
      },
    );
    this.#gameScene.add(mesh);
    this.#ball = {
      mesh,
      physicsId
    };
    return this;
  }

  #addWalls() {
    const safeWalls = this.#addWall({ width: 1, height: 40, }, 
      [
        { x: -10, y: 0 },
        { x: 10, y: 0 }
      ]
    );

    safeWalls[0].data = {
      wallType: WALL_TYPES.safeWall,
      direction: DIRECTION.LEFT,
    };
    
    safeWalls[1].data = {
      wallType: WALL_TYPES.safeWall,
      direction: DIRECTION.RIGHT,
    };

    const trapWalls = this.#addWall({ width: 20, height:1 },
      [
        { x: 0, y: 20 },
        { x: 0, y: -20 }
      ]
    );

    trapWalls[0].data = {
      wallType: WALL_TYPES.trapWall,
      direction: DIRECTION.top
    };

    trapWalls[1].data = {
      wallType: WALL_TYPES.trapWall,
      direction: DIRECTION.bottom
    };
    return this;
  }

  /** @param {{
    *   width: number,
    *   height: number
    * }} wallSize
    * @param {{
    *   x: number,
    *   y: number
    * }[]} wallPositions
    */
  #addWall(wallSize, wallPositions) {

    const wallGeometry = new THREE.BoxGeometry(wallSize.width, wallSize.height);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.3,
      roughness: 0.4
    });

    const wallMeshes = wallPositions.map(pos =>  {
      const mesh = new THREE.Mesh(
        wallGeometry, 
        wallMaterial
      );
      mesh.position.set(pos.x, pos.y, 0);
      return mesh;
    });

    const wallPhysics = wallPositions.map(pos => {
        return PhysicsEntity.createRect({
          type: "IMMOVABLE",
          width: wallSize.width,
          height: wallSize.height,
          center: {
            x: pos.x, 
            y: pos.y
          }
        });
      });
    const wallPhysicsId = this.#physics.addObject(...wallPhysics);
    for (let i = 0; i < wallPhysicsId.length; ++i) {
      const physicsId = wallPhysicsId[i];
      this.#objects.push(
        {
          mesh: wallMeshes[i],
          physicsId: physicsId
        },
      );
    }
    this.#gameScene.add(...wallMeshes);
    return wallPhysics;
  }

  #addPeddles() {
    const size = {
      width: 3,
      height: 1
    };
    
    const geometry = new THREE.BoxGeometry(
      size.width,
      size.height
    );
    const colors = [
      0x0000ff,
      0x00ffff
    ];
    const materials = colors.map(color =>
      new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.3,
        roughness: 0.5,
      })
    );
    const positions = [
      {
        x: 0,
        y: -15
      },
      {
        x: 0,
        y: 15
      }
    ];
    const meshes = materials.map((material, index) => {
      const mesh = new THREE.Mesh(
        geometry,
        material
      );
      const pos = positions[index];
      mesh.position.set(pos.x, pos.y, 0);
      return mesh;
    });
    const physicsEntities = positions.map(pos => 
      PhysicsEntity.createRect({
        type: "MOVABLE",
        width: size.width,
        height: size.height,
        center: {
          x: pos.x,
          y: pos.y
        }
      })
    );
    const physicsIds = this.#physics.addObject(...physicsEntities);
    for (let i = 0; i < physicsIds.length; ++i) {
      this.#objects.push({
        mesh: meshes[i],
        physicsId: physicsIds[i]
      });
      this.#peddles.push({
        mesh: meshes[i],
        physicsId: physicsIds[i]
      })
    };
    this.#gameScene.add(...meshes);
  }

  #setLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      1
    );
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.far = 15;
    directionalLight.position.set(5, 5, 2);
    //   this.#scene.add(ambientLight, directionalLight);

    const gameAmbientLight = new THREE.AmbientLight(0xffffff, 2.1);
    const gameDirectionalLight = new THREE.DirectionalLight(
      0xffffff,
      1
    );
    gameDirectionalLight.castShadow = true;
    gameDirectionalLight.shadow.mapSize.set(1024, 1024);
    gameDirectionalLight.shadow.camera.far = 15;
    gameDirectionalLight.position.set(0, 0, 1);
    this.#gameScene.add(gameAmbientLight, gameDirectionalLight);
    return this;
  }

  #setCamera() {
    this.#camera = new THREE.PerspectiveCamera(
      75,
      this.#windowSize.width / this.#windowSize.height,
      0.1,
      100
    );
    this.#camera.position.set(0, 0, 20);
    this.controls = new OrbitControls(this.#camera, this.#canvas)
    this.controls.enableDamping = true
    return this;
  }

  #setRenderer() {
    this.#renderer = new THREE.WebGLRenderer({
      canvas: this.#canvas,
      alpha: true,
    });
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.#renderer.setSize(this.#windowSize.width, 
      this.#windowSize.height);
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    return this;
  }

  #addResizeCallback() {
    const resizeCallback = (() => {

      const width = this.#canvas.parentElement.offsetWidth;
      const height = this.#canvas.parentElement.offsetHeight;

      this.#windowSize = {
        width,
        height,
      };

      this.#camera.aspect = width / height;
      this.#camera.updateProjectionMatrix();
      this.#renderer.setSize(width, height);
      this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    }).bind(this);
    window.addEventListener("resize", () => resizeCallback()) 
    return this;
  }

  #addVisibleCallback() {
    
    const onVisibilityChange = ( /** @param {Boolean} visible */ (visible) => {
      this.isBallMoving = visible;
      if (visible) {
        this.#startRender();         
      }
      else {
        window.cancelAnimationFrame(this.#renderId);
      }
    }).bind(this);

    document.addEventListener("visibilitychange",
      () => onVisibilityChange(!document.hidden));
    return this;
  }

  #setTime() {
    this.#time = {
      clock: new THREE.Clock(),
      elapsed: 0
    };
    return this;
  }

  #addHelpers() {
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.setColors(
      new THREE.Color(0xffffff), 
      new THREE.Color(0xffffff), 
      new THREE.Color(0xffffff)
    )
    this.#scene.add(axesHelper);
    const gameAxesHelper = new THREE.AxesHelper(5);
    gameAxesHelper.setColors(
      new THREE.Color(0x0000ff), 
      new THREE.Color(0x0000ff), 
      new THREE.Color(0x0000ff)
    );
    this.#gameScene.add(gameAxesHelper);
    return this;
  }

  #addControls() {
    window.addEventListener("keydown", event => {
      const controlKey = controlMap[event.key];
      if (!controlKey)
        return ;
      this.#peddleControls[controlKey.player].pressed = {
        ...controlKey,
        key: event.key
      };
    });

    window.addEventListener("keyup", event => {
      const controlKey = controlMap[event.key];
      if (!controlKey)
        return ;
      if (this.#peddleControls[controlKey.player].pressed.key == 
      event.key) {
        this.#peddleControls[controlKey.player].pressed = {
          x: 0, 
          y: 0,
          key: null,
          player: controlKey.player
        };
      };
    })
    return this;
  }

	#addEvents() {
		const id = this.#physics.addCollisionCallback(
			(collider, collidee, time) => {
				if (Math.abs(this.#time.elapsed - this.#hitSound.time) < SOUND_EFFECT_THRESHOLD)
					return false;
				if (collider.isShape("CIRCLE") || collidee.isShape("CIRCLE")) {
					return true;
				}
				return false;
			},
			(collider, collidee, time) => {
        if (collidee.data && collidee.data.wallType &&
        collidee.data.wallType == WALL_TYPES.trapWall) {
          this.#lostSide = collidee.data.direction;
          this.isBallMoving = false;
        }
				this.#hitSound.sound.currentTime = 0;
				this.#hitSound.sound.play();
        this.#hitSound.sound.volume = 1;
				this.#hitSound.time = this.#time.elapsed;
			}
		);
		this.#eventsIds.push(id);
		return this;
	}

  /**
   * @param {{
   *  frameTime: number,
   *  frameSlice: number
   * }} args
   */
  #updateObjects({frameTime, frameSlice}) {

    this.#peddles.forEach((peddle, index) => {
      const control = this.#peddleControls[index];
      this.#physics.setState(peddle.physicsId,
        (state) => {
          let vel = { ...state.velocity };
          if (control.pressed.x == 0) {
            vel.x = Math.abs(vel.x) < EPSILON ? 0: vel.x * PEDDLE_DECEL_RATIO;
          }
          else if (control.pressed.x > 0) {
            vel.x = Math.min(MAX_PEDDLE_SPEED, vel.x + PEDDLE_ACCEL);
          }
          else {
            vel.x = Math.max(-MAX_PEDDLE_SPEED, vel.x - PEDDLE_ACCEL);
          }
          return { velocity: {
            ...vel
          }};
        })
    })
    while (frameTime > EPSILON) {
      this.#physics.update(frameSlice);
      frameTime -= frameSlice; 
      frameSlice = Math.min(frameTime, FRAME_TIME_THRESHOLD);
    }
    const states = this.#physics.allStates;
    this.#objects.forEach(({mesh, physicsId}) => {
      if (!states[physicsId])
        return ;
      const position = states[physicsId].position;
      mesh.position.set(position.x, position.y, mesh.position.z);
    })
  }

  #removeBall() {
    const mesh = this.#ball.mesh;
    const id = this.#ball.physicsId
    this.#physics.removeCollisionCallback(id);
    this.#physics.removeObject(id);
    this.#gameScene.remove(mesh);
    this.#ball.mesh = null;
    this.#ball.physicsId = null;
    return this;
  }

  #updateGameData() {
    if (!this.#lostSide)
      return ;
    /** @type {GameData} */ //@ts-ignore: casting
    const gameData = this.#gameData;
    /** @type {Player[]} */
    const players = gameData.getPlayers();
    if (this.#lostSide != DIRECTION.top && 
      this.#lostSide != DIRECTION.bottom) {
      throw "invalid side " + this.#lostSide;
    }
    const winSide = this.#lostSide == DIRECTION.top ? DIRECTION.bottom: DIRECTION.top;
    const winPlayer = players[PLAYER_POSITION[winSide]];
    const newScores = {...gameData.scores}
    newScores[winPlayer.nickname] += 1;
    gameData.scores = newScores;
    this.#lostSide = null;
    return this;
  }

  #startRender() {
    const tick = (() => {
      const elapsed = this.#time.clock.getElapsedTime();
      let frameTime = elapsed - this.#time.elapsed;
      this.#time.elapsed = elapsed;
      let frameSlice = Math.min(frameTime, FRAME_TIME_THRESHOLD);
      this.#renderId = window.requestAnimationFrame(tick);
      if (!this.isBallMoving && 
        this.#ball.mesh && this.#ball.physicsId) {
        this.#removeBall()
        .#updateGameData();
        this.isBallMoving = true;
      }
      this.#updateObjects({frameTime, frameSlice})
      this.#renderer.render(this.#scene, this.#camera);
      this.#renderer.autoClear = false;
      this.#renderer.render(this.#gameScene, this.#camera);
      this.#renderer.autoClear = true;
      this.controls.update();
    }).bind(this);

    tick();
    return this;
  }
}
