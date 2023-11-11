"use client";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";

const ThreeScene = () => {
  const mountRef = useRef(null);
  const mouse = new THREE.Vector2(2, 2);
  function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    // console.log(`Mouse coordinates: X=${mouse.x}, Y=${mouse.y}`);
  }

  useEffect(() => {
    // Set up scene, camera, and renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Add a cube
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(5, 50, 50),
      new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load("/earthcartoon.jpeg"),
      })
    );
    const raycaster = new THREE.Raycaster();

    document.addEventListener("mousemove", onMouseMove, false);

    scene.add(sphere);

    camera.position.z = 10;

    // Animation loop
    const animate = function () {
      requestAnimationFrame(animate);

      raycaster.setFromCamera(mouse, camera);

      const intersects = raycaster.intersectObject(sphere);

      if (intersects.length > 0) {
        const distanceToIntersection = intersects[0].distance;
        const distanceToSphere = camera.position.distanceTo(sphere.position);

        if (
          distanceToIntersection <=
          distanceToSphere + sphere.geometry.boundingSphere.radius
        ) {
          console.log("Hovering over sphere");
        }
      } else {
        scene.rotation.x += 0.0005;
        scene.rotation.y += 0.0005;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default ThreeScene;
