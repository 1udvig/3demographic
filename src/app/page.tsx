"use client";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import * as turf from "@turf/turf";
import { createCountryOutline, getPointFromLatLong } from "./geo";

const ThreeScene = () => {
  const mountRef = useRef(null);
  const sphereRef = useRef(null); // Ref for the sphere
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: null, y: null });
  const lastCalculatedMousePosition = useRef({ x: null, y: null });
  const mouse = new THREE.Vector2(2, 2);
  const [geoJSONData, setgeoJSONData] = useState(null);
  const phiStartOffset = -Math.PI / 2;
  const currentCountryOutline = useRef(null);

  // Function to find the country
  // optimized version below
  // function findCountry(latitude, longitude, geojsonData) {
  //   const point = turf.point([longitude, latitude]);

  //   let countryFound = null;
  //   geojsonData.features.forEach((feature) => {
  //     if (turf.booleanPointInPolygon(point, feature)) {
  //       countryFound = feature.properties.ADMIN;
  //     }
  //   });

  //   return countryFound;
  // }

  function findCountry(latitude, longitude, geojsonData) {
    const point = turf.point([longitude, latitude]);

    for (const feature of geojsonData.features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        return feature.properties.ADMIN; // Return immediately when the country is found
      }
    }

    return null; // Return null if no country is found
  }

  function onMouseDown(event) {
    // console.log("onMouseDown");
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
    // console.log("onMouseMove with isDragging: " + isDragging.current);
    // Handle dragging
    if (isDragging.current) {
      const deltaX = event.clientX - lastMousePosition.current.x;
      const deltaY = event.clientY - lastMousePosition.current.y;

      // Adjust rotation speed as needed
      const rotationSpeed = 0.0025;

      // Update sphere rotation
      if (sphereRef.current) {
        const deltaRotationQuaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            deltaY * rotationSpeed,
            deltaX * rotationSpeed,
            0,
            "XYZ" // Rotation order
          )
        );

        sphereRef.current.quaternion.multiplyQuaternions(
          deltaRotationQuaternion,
          sphereRef.current.quaternion
        );

        // sphereRef.current.rotation.y += deltaX * rotationSpeed;
        // sphereRef.current.rotation.x += deltaY * rotationSpeed;
      }

      lastMousePosition.current = {
        x: event.clientX,
        y: event.clientY,
      };
    }
  }

  // function onMouseMove(event) {
  //   // Update mouse for raycasting
  //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //   // Handle dragging
  //   if (isDragging.current) {
  //     const deltaX = event.clientX - lastMousePosition.current.x;

  //     // Adjust rotation speed as needed
  //     const rotationSpeed = 0.0025;

  //     // Update sphere rotation around the y-axis only
  //     if (sphereRef.current) {
  //       // Create a quaternion for the y-axis rotation
  //       const yRotation = new THREE.Quaternion().setFromAxisAngle(
  //         new THREE.Vector3(0, 1, 0), // y-axis
  //         deltaX * rotationSpeed
  //       );

  //       // Apply the rotation
  //       sphereRef.current.quaternion.multiplyQuaternions(
  //         yRotation,
  //         sphereRef.current.quaternion
  //       );
  //     }

  //     lastMousePosition.current = {
  //       x: event.clientX,
  //       y: event.clientY,
  //     };
  //   }
  // }

  function onMouseUp() {
    // console.log("onMouseUp");
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
    const x = point.x;
    const y = point.y;
    const z = point.z;

    // Calculate latitude (phi) and longitude (lambda) in radians
    const phi = Math.asin(y); // Latitude ranges from -90° to 90°
    const lambda = Math.atan2(x, z); // Longitude ranges from -180° to 180°

    // Convert radians to degrees
    const lat = phi * (180 / Math.PI);
    const lon = lambda * (180 / Math.PI);

    return { lat, lon };
  }

  function updateCountryOutline(country) {
    if (country && geoJSONData) {
      console.log(country);

      // Remove the previous country outline if it exists
      if (currentCountryOutline.current && sphereRef.current) {
        sphereRef.current.remove(currentCountryOutline.current);
      }

      const countryOutline = createCountryOutline(geoJSONData, country, 1.0);

      if (countryOutline) {
        sphereRef.current.add(countryOutline);
        currentCountryOutline.current = countryOutline; // Update the reference to the new outline
      }
    }
  }

  useEffect(() => {
    // Ensure that geojsonData is not null
    // if (geoJSONData) {
    //   const latitude = 59.8566;
    //   const longitude = 18.3522;
    //   const country = findCountry(latitude, longitude, geoJSONData);
    //   console.log(country);
    // }
    fetch("/countries.geojson")
      .then((response) => response.json())
      .then((data) => {
        setgeoJSONData(data);
        console.log("geoJSONData set");
      })
      .catch((error) => {
        console.error("Error fetching the GeoJSON data:", error);
      });
  }, []); // This effect depends on geojsonData

  useEffect(() => {
    // Set up scene, camera, and renderer

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x808080);
    cameraRef.current = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(rendererRef.current.domElement);

    // console.log(geoJSONData);
    // Add a cube
    const sphereMaterial = new THREE.MeshBasicMaterial({
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
      transparent: false,
      // opacity: 0.3,
    });
    const sphere = new THREE.Mesh(
      // new THREE.SphereGeometry(1, 50, 50),
      new THREE.SphereGeometry(1, 50, 50, phiStartOffset),
      sphereMaterial
    );

    sphereRef.current = sphere;

    const raycaster = new THREE.Raycaster();

    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mouseup", onMouseUp, false);

    window.addEventListener("resize", onWindowResize, false);

    scene.add(sphere);

    // const axesHelper = new THREE.AxesHelper(2); // The parameter 5 defines the size of the axes
    // scene.add(axesHelper);

    // const gridHelper = new THREE.GridHelper(10, 10);
    // scene.add(gridHelper);

    // Define the start and end points
    // const start = new THREE.Vector3(0, 0, 5);
    // const end = new THREE.Vector3(0, 0, 1);

    // Create a geometry that will represent the line
    // const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);

    // Create a material for the line
    // const material = new THREE.LineBasicMaterial({ color: 0xffffff }); // Set the color as needed

    // Create the line using the geometry and material
    // const line = new THREE.Line(geometry, material);

    // Add the line to your scene

    // scene.add(line);

    cameraRef.current.position.z = 2;
    cameraRef.current.position.y = 0;
    cameraRef.current.position.x = 0;

    // Animation loop
    const animate = function () {
      requestAnimationFrame(animate);
      // if (
      //   lastCalculatedMousePosition.current.x !== mouse.x ||
      //   lastCalculatedMousePosition.current.y !== mouse.y
      // ) {
      raycaster.setFromCamera(mouse, cameraRef.current);

      const intersects = raycaster.intersectObject(sphere);

      if (intersects.length > 0) {
        // const distanceToIntersection = intersects[0].distance;
        // const distanceToSphere = cameraRef.current.position.distanceTo(
        //   sphere.position
        // );
        const point = intersects[0].point;
        const localPoint = sphere.worldToLocal(point.clone());
        // console.log(localPoint);

        const { lat, lon } = getLatLongFromPoint(localPoint);

        const country = findCountry(lat, lon, geoJSONData);
        if (country !== currentCountryOutline.current) {
          updateCountryOutline(country);
          currentCountryOutline.current = country;
        }

        // if(country == "Sweden"){
        //   if (highLightedCountry.current != "Sweden") {
        //     if (geoJSONData) {
        //       const countryOutline = createCountryOutline(
        //         geoJSONData,
        //         "Sweden",
        //         1.0
        //       );
        //       // console.log(countryOutline);
        //       if (countryOutline) {
        //         sphere.add(countryOutline);
        //         highLightedCountry.current = 'Sweden';
        //       }
        //     }
        //   }
        // }

        lastCalculatedMousePosition.current = {
          x: mouse.x,
          y: mouse.y,
        };
      } else {
        // scene.rotation.x += 0.001;
        // scene.rotation.y += 0.001;
        // sphere.rotation.x += 0.001;
        // sphere.rotation.y += 0.001;
      }
      rendererRef.current.render(scene, cameraRef.current);
      // } else if (isDragging) {
      //   rendererRef.current.render(scene, cameraRef.current);
      // }
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
  }, [geoJSONData]); // Add textureLoaded as a dependency

  return <div ref={mountRef} />;
};

export default ThreeScene;
