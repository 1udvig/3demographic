"use client";
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import * as turf from "@turf/turf";
import { createCountryOutline, getPointFromLatLong } from "./geo";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";
import { Overlay } from "./overlay";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ConstantColorFactor } from "three";
import CountryData from "@/components/ui/CountryData";

const ThreeScene = () => {
  const [selectedCountry, setselectedCountry] = useState(null);
  const [countryData, setcountryData] = useState(null);
  const overlayopen = useRef(false);
  const mountRef = useRef(null);
  const sphereRef = useRef(null); // Ref for the sphere
  const sunLightRef = useRef(null); // Ref for the sun light
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const isDragging = useRef(false);
  const lastMousePosition = useRef({ x: null, y: null });
  const lastCalculatedMousePosition = useRef({ x: null, y: null });
  const mouse = new THREE.Vector2(2, 2);
  const [geoJSONData, setgeoJSONData] = useState(null);
  const phiStartOffset = -Math.PI / 2;
  const currentCountryOutline = useRef(null);
  const currentCountry = useRef(null);
  const hoveredCountry = useRef(null);
  const mouseMoved = useRef(null);
  const mouseAtOverlay = useRef(false);

  const frameCounter = useRef(0);
  const frameThreshold = 5; // Adjust this value based on your needs
  const sceneRef = useRef(null);
  const lastClickedPosition = useRef(null);
  const shouldSelect = useRef(null);
  const radius = 1;
  const minFov = 5;
  const maxFov = 80;

  const shouldCheckForCountry = () => {
    frameCounter.current++;
    if (frameCounter.current >= frameThreshold) {
      frameCounter.current = 0;
      return true;
    }
    return false;
  };

  function findCountry(latitude, longitude, geojsonData) {
    const point = turf.point([longitude, latitude]);

    for (const feature of geojsonData.features) {
      if (turf.booleanPointInPolygon(point, feature)) {
        return feature.properties.ADMIN; // Return immediately when the country is found
      }
    }

    return null; // Return null if no country is found
  }

  function centerCountry(country, geoJSONData) {
    console.log(country);
    for (const feature of geoJSONData.features) {
      if (feature.properties.ADMIN == country) {
        const centroid = turf.centroid(feature.geometry);
        const [lng, lat] = centroid.geometry.coordinates;
        console.log("Coordinates of centroid: ", lat, lng);
        const centroidVector = getPointFromLatLong(
          lat,
          lng,
          radius,
          phiStartOffset
        );
        console.log(
          "Local point on sphere (should always be the same?): ",
          centroidVector
        );
        const worldCoordinates = sphereRef.current.localToWorld(centroidVector);
        console.log("World point in scene: ", worldCoordinates);
        const cameraForward = cameraRef.current.getWorldDirection(
          new THREE.Vector3()
        );
        cameraForward.negate();

        const axisOfRotation = new THREE.Vector3()
          .crossVectors(centroidVector, cameraForward)
          .normalize();
        const angle = Math.acos(
          centroidVector.dot(cameraForward) / centroidVector.length()
        );
        console.log(angle);

        applyRotation(axisOfRotation, angle);
        // animateRotation(axisOfRotation, angle);
      }
    }
  }

  function animateRotation(axis, angle, duration = 1000) {
    const startQuaternion = sphereRef.current.quaternion.clone();
    const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(
      axis,
      angle
    );

    // Correctly compute the end quaternion by multiplying in the same order as applyRotation
    const endQuaternion = sphereRef.current.quaternion
      .clone()
      .multiply(rotationQuaternion);

    const startTime = Date.now();

    function animate() {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / duration, 1); // Ensure progress doesn't exceed 1

      // Using slerp as an instance method
      sphereRef.current.quaternion
        .copy(startQuaternion)
        .slerp(endQuaternion, progress);
      sphereRef.current.quaternion.normalize();
      sphereRef.current.updateMatrix();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    animate();
  }

  function applyRotation(axis, angle) {
    // Create a quaternion based on the axis and angle
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(axis, angle);

    // Apply the quaternion to the globe's rotation
    sphereRef.current.quaternion.multiplyQuaternions(
      quaternion,
      sphereRef.current.quaternion
    );

    // Normalize the quaternion to ensure the rotation is valid
    sphereRef.current.quaternion.normalize();

    // realignYAxis();
    // Update the globe's matrix to apply the rotation
    sphereRef.current.updateMatrix();
  }

  function realignYAxis() {
    // Extract the Y-axis vector
    const yAxis = new THREE.Vector3(0, 1, 0);
    sphereRef.current.localToWorld(yAxis);

    // Project the Y-axis vector onto the YZ-plane
    yAxis.x = 0;
    yAxis.normalize();

    // Calculate the quaternion needed to align the Y-axis with its projection
    const currentYAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(
      sphereRef.current.quaternion
    );
    const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(
      currentYAxis,
      yAxis
    );

    // Apply this quaternion to the sphere's rotation
    sphereRef.current.quaternion.multiplyQuaternions(
      alignQuaternion,
      sphereRef.current.quaternion
    );
    sphereRef.current.quaternion.normalize();
  }

  function onMouseDown(event) {
    isDragging.current = true;
    lastMousePosition.current = {
      x: event.clientX,
      y: event.clientY,
    };
    lastClickedPosition.current = {
      x: event.clientX,
      y: event.clientY,
    };
    mouseMoved.current = false;
  }

  function onMouseMove(event) {
    mouseMoved.current = true;
    // Update mouse for raycasting
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Handle dragging
    if (isDragging.current) {
      const deltaX = event.clientX - lastMousePosition.current.x;
      const deltaY = event.clientY - lastMousePosition.current.y;

      // Adjust rotation speed as needed
      const rotationSpeed = 0.0025;

      // Update sphere rotation
      if (sphereRef.current) {
        // Rotate only around the Y-axis for horizontal mouse movement
        sphereRef.current.rotation.y += deltaX * rotationSpeed;

        // Carefully manage rotation around the X-axis
        // You can implement limits here to prevent the North Pole from tilting too much
        const newRotationX =
          sphereRef.current.rotation.x + deltaY * rotationSpeed;
        sphereRef.current.rotation.x = Math.max(
          Math.min(newRotationX, Math.PI / 2),
          -Math.PI / 2
        );

        // sphereRef.current.rotation.x += deltaY * rotationSpeed;

        // Reset rotation around the Z-axis to 0 to prevent tilting out of the YZ plane
        // sphereRef.current.rotation.z = 0;
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

  //   if (isDragging.current) {
  //     const deltaX = event.clientX - lastMousePosition.current.x;
  //     const deltaY = event.clientY - lastMousePosition.current.y;

  //     const rotationSpeed = 0.0025;

  //     if (sphereRef.current) {
  //       const deltaRotationQuaternionX =
  //         new THREE.Quaternion().setFromAxisAngle(
  //           new THREE.Vector3(1, 0, 0), // x-axis
  //           deltaY * rotationSpeed
  //         );

  //       const deltaRotationQuaternionY =
  //         new THREE.Quaternion().setFromAxisAngle(
  //           new THREE.Vector3(0, 1, 0), // y-axis
  //           deltaX * rotationSpeed
  //         );

  //       sphereRef.current.quaternion.multiplyQuaternions(
  //         deltaRotationQuaternionX,
  //         sphereRef.current.quaternion
  //       );

  //       sphereRef.current.quaternion.multiplyQuaternions(
  //         deltaRotationQuaternionY,
  //         sphereRef.current.quaternion
  //       );

  //       sphereRef.current.quaternion.normalize();
  //       sphereRef.current.updateMatrix();
  //     }

  //     lastMousePosition.current = {
  //       x: event.clientX,
  //       y: event.clientY,
  //     };
  //   }
  // }

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

  function onMouseUp(event) {
    // console.log("onMouseUp");
    // console.log(mouseAtOverlay.current);
    // console.log(lastMousePosition.current.x);
    if (mouseMoved.current) {
      // console.log("mousemoved after clicked");
      shouldSelect.current = false;
    } else {
      console.log(mouseAtOverlay.current);
      console.log(hoveredCountry.current);

      setselectedCountry(hoveredCountry.current);
    }

    isDragging.current = false;
  }

  function setCameraFOV(newFOV) {
    // Assuming 'camera' is your Three.js perspective camera
    cameraRef.current.fov = newFOV;

    // Update the camera projection matrix after changing the FOV
    cameraRef.current.updateProjectionMatrix();
  }

  function zoomCameraFOV(deltaZoom) {
    // Assuming 'camera' is your Three.js perspective camera
    // Adjust the zoom speed as needed
    const zoomSpeed = 0.1;

    // Change the FOV based on the zoom delta
    cameraRef.current.fov += deltaZoom * zoomSpeed;

    // Optional: Clamp the FOV to prevent extreme zoom in or out
    cameraRef.current.fov = Math.max(
      minFov,
      Math.min(cameraRef.current.fov, maxFov)
    );

    // Update the camera projection matrix after changing the FOV
    cameraRef.current.updateProjectionMatrix();
  }

  function onMouseWheel(event) {
    // Use event.deltaY to determine the direction and magnitude of the scroll
    zoomCameraFOV(event.deltaY * 0.01);
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
    // Remove the previous country outline if it exists

    sphereRef.current.remove(currentCountryOutline.current);

    const countryOutline = createCountryOutline(geoJSONData, country, 1.0);

    if (countryOutline) {
      sphereRef.current.add(countryOutline);
      // sceneRef.current.add(countryOutline);
      currentCountryOutline.current = countryOutline; // Update the reference to the new outline
    }
  }
  function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
    });

    const starVertices = [];
    for (let i = 0; i < 1000; i++) {
      const x = THREE.MathUtils.randFloatSpread(200);
      const y = THREE.MathUtils.randFloatSpread(200);
      const z = THREE.MathUtils.randFloatSpread(200);
      starVertices.push(x, y, z);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );
    const starField = new THREE.Points(starsGeometry, starsMaterial);

    sceneRef.current.add(starField);
  }

  function createSunLight() {
    const sunLight = new THREE.DirectionalLight(0xffffff, 1); // White light
    sunLight.position.set(2.5, 2.5, 0); // Start position
    sceneRef.current.add(sunLight);
    sunLightRef.current = sunLight;
  }
  function applyHeightMapToSphere(sphereGeometry, heightMapUrl, maxHeight) {
    new THREE.TextureLoader().load(heightMapUrl, (texture) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = texture.image.width;
      canvas.height = texture.image.height;
      context.drawImage(texture.image, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const positions = sphereGeometry.attributes.position;
      const vertex = new THREE.Vector3();

      // Loop over each vertex in the geometry
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i);

        // Convert vertex position to latitude and longitude
        const phi = Math.acos(vertex.y / sphereGeometry.parameters.radius);
        const theta = Math.atan2(vertex.z, vertex.x) + Math.PI;

        // Map to height map coordinates
        const x = Math.floor((theta / (2 * Math.PI)) * canvas.width);
        const y = Math.floor((1 - phi / Math.PI) * canvas.height);
        const pixelIndex = (y * canvas.width + x) * 4;
        const heightValue = imageData.data[pixelIndex] / 255;

        // Adjust vertex position based on height map
        const scaleFactor = 1 + heightValue * maxHeight;
        vertex.multiplyScalar(scaleFactor);
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
      }

      // Update the geometry to reflect the new vertex positions
      positions.needsUpdate = true;
      sphereGeometry.computeVertexNormals(); // Update normals for correct lighting
    });
  }

  // Call createSunLight() in your useEffect

  // Call this function in your useEffect after setting up the scene

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
        // console.log("geoJSONData set");
        console.log(data);
      })
      .catch((error) => {
        console.error("Error fetching the GeoJSON data:", error);
      });
  }, []); // This effect depends on geojsonData

  useEffect(() => {
    // Set up scene, camera, and renderer

    const scene = new THREE.Scene();
    // scene.background = new THREE.Color(0x808080);

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
    const sphereMaterial = new THREE.MeshPhongMaterial({
      map: new THREE.TextureLoader().load("/8k_earth.jpeg"),
      specular: 0x222222,
      shininess: 50,
      emissive: new THREE.Color(0x111111),
    });
    // const sphereMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const sphereGeometry = new THREE.SphereGeometry(1, 50, 50, phiStartOffset);

    // const sphere = new THREE.Mesh(
    //   // new THREE.SphereGeometry(1, 50, 50),
    //   sphereGeometry,
    //   sphereMaterial
    // );
    // let sphere;
    // const textureLoader = new THREE.TextureLoader();
    // textureLoader.load("/8k_earth.jpeg", function (texture) {
    //   // Create a material with the Earth texture
    // const material = new THREE.MeshPhongMaterial({ map: texture });

    //   // Create the sphere mesh with the geometry and material
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

    //   // Add the sphere to the scene
    //   scene.add(sphere);
    // });

    // applyHeightMapToSphere(sphereGeometry, "/heightmap.png", 0.1);
    // sphereGeometry.computeVertexNormals();

    scene.add(sphere);
    sphereRef.current = sphere;

    const raycaster = new THREE.Raycaster();

    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("wheel", onMouseWheel, false);

    window.addEventListener("resize", onWindowResize, false);

    // scene.add(ghostSphere);

    // const axesHelper = new THREE.AxesHelper(2); // The parameter 5 defines the size of the axes
    // scene.add(axesHelper);

    sceneRef.current = scene;
    createStarfield();
    createSunLight();

    // const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // // directionalLight.position.set(2, 2, 5);
    // scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); // 0.5 is the light intensity
    scene.add(ambientLight);

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

      if (sunLightRef.current) {
        sunLightRef.current.position.x = Math.cos(Date.now() * 0.0001) * 5;
        sunLightRef.current.position.z = Math.sin(Date.now() * 0.0001) * 5;
      }

      // if (
      //   lastCalculatedMousePosition.current.x !== mouse.x ||
      //   lastCalculatedMousePosition.current.y !== mouse.y
      // console.log(shouldSelect);
      if (geoJSONData) {
        // ) {

        // console.log(mouse);
        if (shouldCheckForCountry()) {
          raycaster.setFromCamera(mouse, cameraRef.current);

          let intersects = raycaster.intersectObject(sphere);

          intersects = intersects.filter((intersect) => {
            return intersect.object.type !== "Line";
          });

          if (intersects.length > 0) {
            // const distanceToIntersection = intersects[0].distance;
            // const distanceToSphere = cameraRef.current.position.distanceTo(
            //   sphere.position
            // );
            const point = intersects[0].point;

            // console.log(point);

            const localPoint = sphere.worldToLocal(point.clone());
            // console.log(localPoint);

            const { lat, lon } = getLatLongFromPoint(localPoint);
            // console.log(lat, lon);
            const country = findCountry(lat, lon, geoJSONData);
            hoveredCountry.current = country;
            if (country) {
              // console.log(country);
              // console.log(shouldSelect.current);
              if (shouldSelect.current) {
                // console.log("clicked on: " + country);
                centerCountry(country, geoJSONData);
                shouldSelect.current = false;
              }
              if (country !== currentCountryOutline.current) {
                updateCountryOutline(country);

                currentCountry.current = country;
              }
            } else {
              sphereRef.current.remove(currentCountryOutline.current);
            }
            // console.log(country);
          } else {
            sphereRef.current.remove(currentCountryOutline.current);
            hoveredCountry.current = null;
            // setselectedCountry(null);
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
        }

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

  return (
    <div ref={mountRef}>
      {selectedCountry && <Overlay country={selectedCountry} />}

      <Sheet open={selectedCountry ? true : false}>
        {/* <Sheet>
        <SheetTrigger>Open</SheetTrigger> */}
        <SheetContent
          onMouseEnter={() => {
            mouseAtOverlay.current = true;
          }}
          onMouseLeave={() => {
            mouseAtOverlay.current = false;
          }}
        >
          <SheetHeader>
            <SheetTitle>{selectedCountry}</SheetTitle>
            <SheetDescription asChild>
              {selectedCountry && (
                <CountryData country={selectedCountry}></CountryData>
              )}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ThreeScene;
