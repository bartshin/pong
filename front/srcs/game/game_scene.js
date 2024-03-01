import * as THREE from "three";
import Physics from "@/game/physics";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import PhysicsEntity from "@/game/physicsEntity";
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
      type: "DYNAMIC",
      radius: 1,
      center: { x: 0, y:0 }
    });
    ballPysics.veolocity = {
      x: 2,
      y: -3
    };
    const ballId = this.#physics.addObject(ballPysics)[0];

    this.#objects.push(
      {
        mesh: ball,
        physicsId: ballId
      },
    );

    this.#addWalls({
      width: 1,
      height: 20,
    }, [
      {
        x: -10, 
        y: 0,
      },
      {
        x: 10, 
        y: 0 
      }
    ]
    );
    this.#addWalls({
      width: 20,
      height:1
    },[
      {
        x: 0,
        y: 10,
      },
      {
        x: 0,
        y: -10
      }
    ])

    this.#scene.add(...this.#objects.map(obj => obj.mesh));
    return this;
  }

  #addWalls(wallSize, wallPositions) {

    const wallGeometry = new THREE.BoxGeometry(wallSize.width, wallSize.height);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.3,
      roughness: 0.4
    });

    const walls = wallPositions.map(pos => new THREE.Mesh(
      wallGeometry, 
      wallMaterial
    ));
    walls.forEach((wall, index) => {
      const pos = wallPositions[index];
      wall.position.set(pos.x, pos.y, 0);
      const wallPhysics =  PhysicsEntity.createRect({
      type: "STATIC",
      width: wallSize.width,
      height: wallSize.height,
      center: {
        x: pos.x, 
        y: pos.y
      }
    })
      const physicsId = this.#physics.addObject(wallPhysics)[0];
      this.#objects.push(
        {
          mesh: wall,
          physicsId: physicsId
        },
      );
    })

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

  #startRender() {
    const tick = (() => {
      const elapsed = this.#time.clock.getElapsedTime();
      const frameTime = elapsed - this.#time.elapsed;
      this.#time.elapsed = elapsed;
      if (frameTime > 0.1)
        console.log(frameTime);
      this.#physics.update(frameTime);
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
