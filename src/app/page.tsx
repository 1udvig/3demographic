"use client";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";

const ThreeScene = () => {
  const mountRef = useRef(null);
  const sphereRef = useRef(null); // Ref for the sphere
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: null, y: null });
  const lastCalculatedMousePosition = useRef({ x: null, y: null });
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

  function onWindowResize() {
    if (cameraRef.current && rendererRef.current) {
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    }
  }

  function getLatLongFromPoint(point) {
    const radius = 1; // Your sphere's radius

    // Latitude
    const lat = 90 - (Math.acos(point.y / radius) * 180) / Math.PI;

    // Longitude
    const lon = (Math.atan2(point.z, point.x) * 180) / Math.PI;

    return { lat, lon };
  }

  useEffect(() => {
    // Set up scene, camera, and renderer

    const scene = new THREE.Scene();
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // const camera = new THREE.PerspectiveCamera(
    //   75,
    //   window.innerWidth / window.innerHeight,
    //   0.1,
    //   1000
    // );
    // const renderer = new THREE.WebGLRenderer({ antialias: true });
    // cameraRef.current.position.set(0, 0, 5); // Adjust the Z value as needed

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(rendererRef.current.domElement);

    // Add a cube
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 50, 50),
      // new THREE.SphereGeometry(1, 50, 50, -Math.PI / 2),
      new THREE.MeshBasicMaterial({
        // map: new THREE.TextureLoader().load("/earthmap.jpeg"),
        // map: new THREE.TextureLoader().load("/earthnight.jpeg"),
        map: new THREE.TextureLoader().load(
          "/earthmap.jpeg",
          (texture) => {
            // Texture loaded
            sphere.material.map = texture;
            sphere.material.needsUpdate = true;
          },
          undefined,
          (error) => {
            console.error("Error loading texture:", error);
          }
        ),
      })
    );

    sphereRef.current = sphere;

    // cameraRef.current.lookAt(sphere.position);
    const raycaster = new THREE.Raycaster();

    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mouseup", onMouseUp, false);

    window.addEventListener("resize", onWindowResize, false);

    scene.add(sphere);

    // HELPERS--------------------------------------
    const axesHelper = new THREE.AxesHelper(2); // The parameter 5 defines the size of the axes
    scene.add(axesHelper);
    // const gridHelper = new THREE.GridHelper(10, 10);
    // scene.add(gridHelper);

    // Define the start and end points
    const start = new THREE.Vector3(0, 0, 5);
    const end = new THREE.Vector3(0, 0, 1);

    // Create a geometry that will represent the line
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

    // Create a material for the line
    const material = new THREE.LineBasicMaterial({ color: 0xffffff }); // Set the color as needed

    // Create the line using the geometry and material
    const line = new THREE.Line(geometry, material);

    // Add the line to your scene
    scene.add(line);
    // Create the sphere geometry with a radius of 0.1
    // const sphereGeometry = new THREE.SphereGeometry(0.5, 50, 50);

    // // Create a material for the sphere
    // const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Set the color as needed

    // // Create a mesh from the geometry and material
    // const helpersphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    // // Set the position of the sphere to (0, 0, 1)
    // sphere.position.set(0, 0, 1);

    // // Add the sphere to your scene
    // scene.add(helpersphere);

    // HELPERS--------------------------------------

    cameraRef.current.position.z = 2;
    cameraRef.current.position.y = 0;
    cameraRef.current.position.x = 0;

    // Animation loop
    const animate = function () {
      requestAnimationFrame(animate);
      if (
        lastCalculatedMousePosition.current.x !== mouse.x ||
        lastCalculatedMousePosition.current.y !== mouse.y
      ) {
        raycaster.setFromCamera(mouse, cameraRef.current);

        const intersects = raycaster.intersectObject(sphere);

        if (intersects.length > 0) {
          const distanceToIntersection = intersects[0].distance;
          const distanceToSphere = cameraRef.current.position.distanceTo(
            sphere.position
          );
          const point = intersects[0].point;
          const localPoint = sphere.worldToLocal(point.clone());

          console.log("Global coordinates:");
          console.log(point);
          console.log("Local Sphere coordinates");
          console.log(localPoint);
          // console.log("Hovering over sphere");
          const { lat, lon } = getLatLongFromPoint(localPoint);
          console.log("Earth Coordinates");
          console.log({ lat: lat, lon: lon });
          lastCalculatedMousePosition.current = {
            x: mouse.x,
            y: mouse.y,
          };
        } else {
          // scene.rotation.x += 0.001;
          // scene.rotation.y += 0.001;
        }
        rendererRef.current.render(scene, cameraRef.current);
      } else if (isDragging) {
        rendererRef.current.render(scene, cameraRef.current);
      }
    };

    animate();

    // Clean up
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onWindowResize, false);

      mountRef.current.removeChild(rendererRef.current.domElement);
    };
  }, []); // Add textureLoaded as a dependency

  return <div ref={mountRef} />;
};

export default ThreeScene;
