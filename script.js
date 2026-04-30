const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 10;

const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Load JSON
fetch('graph.json')
  .then(res => res.json())
  .then(data => {

    const spacing = 2;

    data.nodes.forEach((node, index) => {

      // Create sphere
      const geometry = new THREE.SphereGeometry(0.3);
      
      // Color by community
      const color = new THREE.Color(`hsl(${node.community * 30}, 70%, 50%)`);
      const material = new THREE.MeshBasicMaterial({ color });

      const sphere = new THREE.Mesh(geometry, material);

      // Positioning
      const x = (index % 5) * spacing - 5;
      const y = Math.floor(index / 5) * spacing - 2;

      // 🔥 Z = community-based (key improvement)
      const z = node.community * 0.2;

      sphere.position.set(x, y, z);

      scene.add(sphere);
    });

    animate();
  });

function animate() {
  requestAnimationFrame(animate);
  scene.rotation.y += 0.002;
  renderer.render(scene, camera);
}
