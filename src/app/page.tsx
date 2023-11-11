"use client";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const ThreeScene = () => {
  const mountRef = useRef(null);
  const sphereRef = useRef(); // Ref for the sphere
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const mouse = new THREE.Vector2(2, 2);

  function onMouseDown(event) {
    console.log("onMouseDown");
    isDragging.current = true;
    lastMousePosition.current = {
      x: event.clientX,
      y: event.clientY,
    };
  }

  function onMouseMove(event) {
    // Update mouse for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    console.log("onMouseMove with isDragging: " + isDragging.current);
    // Handle dragging
    if (isDragging.current) {
      const deltaX = event.clientX - lastMousePosition.current.x;
      const deltaY = event.clientY - lastMousePosition.current.y;

      // Adjust rotation speed as needed
      const rotationSpeed = 0.0025;

      // Update sphere rotation
      if (sphereRef.current) {
        sphereRef.current.rotation.y += deltaX * rotationSpeed;
        sphereRef.current.rotation.x += deltaY * rotationSpeed;
      }

      lastMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }
  }

  function onMouseUp() {
    console.log("onMouseUp");
    isDragging.current = false;
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
        map: new THREE.TextureLoader().load("/earthmap.jpeg"),
        // map: new THREE.TextureLoader().load("/earthnight.jpeg"),
      })
    );
    sphereRef.current = sphere;
    const raycaster = new THREE.Raycaster();

    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mouseup", onMouseUp, false);

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
        // scene.rotation.x += 0.001;
        // scene.rotation.y += 0.001;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Clean up
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default ThreeScene;
