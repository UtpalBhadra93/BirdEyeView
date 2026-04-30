const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 18;

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const light = new THREE.PointLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);

// Storage
let nodeObjects = [];

// ---------------------- LOAD DATA ----------------------
fetch("graph.json")
  .then((res) => res.json())
  .then((data) => {
    const nodes = data.nodes;

    // ---- extract numeric source_location ----
    const values = nodes.map((n) => {
      const m = n.source_location?.match(/\d+/);
      return m ? parseInt(m[0]) : 0;
    });

    const maxVal = Math.max(...values);
    const minVal = Math.min(...values);

    // ---------------- CREATE NODES ----------------
    nodes.forEach((node, i) => {
      const geometry = new THREE.SphereGeometry(0.12, 10, 10);

      const color = new THREE.Color(
        `hsl(${(node.community || 0) * 35}, 70%, 60%)`
      );

      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.2,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // random initial position
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );

      scene.add(mesh);

      const val = values[i];

      const normVal =
        maxVal === minVal ? 0 : (val - minVal) / (maxVal - minVal);

      // FLOW TYPE (placeholder logic — replace later if real direction exists)
      const flowType = node.file_type === "code" ? "out" : "in";

      nodeObjects.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        community: node.community || 0,
        normVal,
        flowType,
      });
    });

    animate();
  });

// ---------------------- PHYSICS ----------------------
function simulate() {
  const repulsion = 0.02;
  const attraction = 0.01;
  const centerForce = 0.006;

  const maxRadius = 12;
  const minRadius = 2;

  for (let i = 0; i < nodeObjects.length; i++) {
    let a = nodeObjects[i];

    for (let j = i + 1; j < nodeObjects.length; j++) {
      let b = nodeObjects[j];

      let dx = a.mesh.position.x - b.mesh.position.x;
      let dy = a.mesh.position.y - b.mesh.position.y;
      let dz = a.mesh.position.z - b.mesh.position.z;

      let dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;

      // --- REPULSION ---
      let force = repulsion / dist;

      a.vx += (dx / dist) * force;
      a.vy += (dy / dist) * force;
      a.vz += (dz / dist) * force;

      b.vx -= (dx / dist) * force;
      b.vy -= (dy / dist) * force;
      b.vz -= (dz / dist) * force;

      // --- COMMUNITY CLUSTERING ---
      if (a.community === b.community) {
        let attract = attraction * dist;

        a.vx -= (dx / dist) * attract;
        a.vy -= (dy / dist) * attract;
        a.vz -= (dz / dist) * attract;

        b.vx += (dx / dist) * attract;
        b.vy += (dy / dist) * attract;
        b.vz += (dz / dist) * attract;
      }
    }

    // ---------------- CORE vs SURFACE ----------------
    const targetRadius =
      maxRadius - a.normVal * (maxRadius - minRadius);

    const currentRadius =
      a.mesh.position.length() + 0.001;

    const diff = currentRadius - targetRadius;

    // radial correction
    a.vx -= (a.mesh.position.x / currentRadius) * diff * 0.05;
    a.vy -= (a.mesh.position.y / currentRadius) * diff * 0.05;
    a.vz -= (a.mesh.position.z / currentRadius) * diff * 0.05;

    // ---------------- FLOW DIRECTION ----------------
    const flowBias = a.flowType === "in" ? -1 : 1;

    a.vx += flowBias * 0.015;

    // ---------------- CENTER STABILIZATION ----------------
    a.vx -= a.mesh.position.x * centerForce;
    a.vy -= a.mesh.position.y * centerForce;
    a.vz -= a.mesh.position.z * centerForce;

    // apply velocity
    a.mesh.position.x += a.vx;
    a.mesh.position.y += a.vy;
    a.mesh.position.z += a.vz;

    // damping
    a.vx *= 0.9;
    a.vy *= 0.9;
    a.vz *= 0.9;
  }
}

// ---------------------- ANIMATION ----------------------
function animate() {
  requestAnimationFrame(animate);

  simulate();

  scene.rotation.y += 0.0015;

  renderer.render(scene, camera);
}

// ---------------------- RESIZE ----------------------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
