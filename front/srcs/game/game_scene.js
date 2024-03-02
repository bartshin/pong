import * as THREE from "three";
import Physics from "@/game/physics";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import PhysicsEntity from "@/game/physicsEntity";
import { EPSILON } from "@/game/physicsUtils";

const FRAME_TIME_TRESHOLD = 0.01;
const MAX_PEDDLE_SPEED = 30;
const PEDDLE_ACCEL = 5;
const PEDDLE_DECEL_RATIO = 0.5;

/** @type {{
 *    [key: string] : {
 *      player: Number,
 *      x: Number,
 *      y: Number,
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
  "a": {
    player: 1, 
    x: -1,
    y: 0,
  },
  "d": {
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
  #canvas;
  #windowSize;
  /** @type {THREE.PerspectiveCamera} */
  #camera;

  /** @type {THREE.WebGLRenderer} */
  #renderer;
  
  /** @type {{
   *   clock: THREE.Clock,
   *   elapsed: Number
  * }} */
  #time;

  /** @type {{
   *    mesh: THREE.Mesh,
   *    physicsId: Number
   *  }[]}
   */
  #objects = [];
  
  /** @type {{
   *    mesh: THREE.Mesh,
   *    physicsId: Number
   *  }[]}
   */
  #peddles = [];

  /** @type {{
   *    pressed: {
   *      player: Number,
   *      x: Number,
   *      y: Number,
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

  #isPlaying = true;
  #renderId = 0;

  /**
   * @params {Object} params
   * @param {{
   *  canvas: HTMLCanvasElement
   * }} params
   */
  constructor({canvas}) {
    this.#canvas = canvas;
    this.#scene = new THREE.Scene();
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
      .#startRender();
  }

  prepareDisappear() {
    
  }

  #load() {

    return this;
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
    this.#addBall()
      .#addWalls()
      .#addPeddles()
    return this;
  }

  #addBall() {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 0.3,
        roughness: 0.4
      })
    );
    ball.position.set(0, 0, 0);
    const ballPysics = PhysicsEntity.createCircle({
      type: "MOVABLE",
      collideType: "DYNAMIC",
      radius: 1,
      center: { x: 0, y:0 }
    });
    ballPysics.veolocity = {
      x: 10,
      y: 15
    };
    const ballId = this.#physics.addObject(ballPysics)[0];

    this.#objects.push(
      {
        mesh: ball,
        physicsId: ballId
      },
    );
    this.#scene.add(ball);
    return this;
  }

  #addWalls() {
    this.#addWall({ width: 1, height: 40, }, 
      [
        { x: -10, y: 0 },
        { x: 10, y: 0 }
      ]
    );
    this.#addWall({ width: 20, height:1 },
      [
        { x: 0, y: 20 },
        { x: 0, y: -20 }
      ]
    );

    return this;
  }

  /** @param {{
    *   width: Number,
    *   height: Number
    * }} wallSize
    * @param {{
    *   x: Number,
    *   y: Number
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
    }
    );
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
    this.#scene.add(...wallMeshes);
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
        y: -10
      },
      {
        x: 0,
        y: 10
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
    this.#scene.add(...meshes);
  }

  #setLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      2
    );
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.far = 15;
    directionalLight.position.set(2, 2, 5);
    this.#scene.add(ambientLight, directionalLight);
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
      canvas: this.#canvas
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
      this.#isPlaying = visible;
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

  #startRender() {
    const tick = (() => {
      const elapsed = this.#time.clock.getElapsedTime();
      let frameTime = elapsed - this.#time.elapsed;
      this.#time.elapsed = elapsed;
      let frameSlice = Math.min(frameTime, FRAME_TIME_TRESHOLD);
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
        frameSlice = Math.min(frameTime, FRAME_TIME_TRESHOLD);
      }
      const states = this.#physics.allStates;
      this.#objects.forEach(({mesh, physicsId}) => {
        if (!states[physicsId])
          return ;
        const position = states[physicsId].position;
        mesh.position.set(position.x, position.y, mesh.position.z);
      })
      this.#renderer.render(this.#scene, this.#camera);
      this.controls.update();
      this.#renderId = window.requestAnimationFrame(tick);
    }).bind(this);

    tick();
    return this;
  }
}
