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
  const currentCountry = useRef(null);
  const frameCounter = useRef(0);
  const frameThreshold = 3; // Adjust this value based on your needs
  const sceneRef = useRef(null);
  const lastClickedPosition = useRef(null);
  const shouldSelect = useRef(null);
  const radius = 1;
  const minFov = 35;
  const maxFov = 80;

  const shouldCheckForCountry = () => {
    frameCounter.current++;
    if (frameCounter.current >= frameThreshold) {
      frameCounter.current = 0;
      return true;
    }
    return false;
  };

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
        console.log("Local point on sphere: ", centroidVector);
        const worldCoordinates = sphereRef.current.localToWorld(centroidVector);
        console.log("World point in scene: ", worldCoordinates);
        const cameraForward = cameraRef.current.getWorldDirection(
          new THREE.Vector3()
        );
        cameraForward.negate();

        // const smallSphereGeometry = new THREE.SphereGeometry(0.01, 32, 32); // Smaller sphere
        // const smallSphereMaterial = new THREE.MeshBasicMaterial({
        //   color: 0x00ff00,
        // }); // Different color
        // const smallSphere = new THREE.Mesh(
        //   smallSphereGeometry,
        //   smallSphereMaterial
        // );

        // Set the position of the small sphere
        // smallSphere.position.set(
        //   centroidVector.x,
        //   centroidVector.y,
        //   centroidVector.z
        // );
        // sphereRef.current.add(smallSphere);
        // console.log(cameraForward);
        const axisOfRotation = new THREE.Vector3()
          .crossVectors(centroidVector, cameraForward)
          .normalize();
        const angle = Math.acos(
          centroidVector.dot(cameraForward) / centroidVector.length()
        );
        // console.log(axisOfRotation);
        // console.log(angle);
        animateRotation(axisOfRotation, angle);
      }
    }
  }

  // function animateRotation(axis, angle) {
  //   // Create a quaternion based on the axis and angle
  //   const quaternion = new THREE.Quaternion();
  //   quaternion.setFromAxisAngle(axis, angle);

  //   // Apply the quaternion to the globe's rotation
  //   sphereRef.current.quaternion.multiplyQuaternions(
  //     quaternion,
  //     sphereRef.current.quaternion
  //   );

  //   // Normalize the quaternion to ensure the rotation is valid
  //   sphereRef.current.quaternion.normalize();

  //   // Update the globe's matrix to apply the rotation
  //   sphereRef.current.updateMatrix();
  // }
  function animateRotation(axis, angle) {
    if (sphereRef.current) {
      // Create a quaternion based on the axis and angle
      const quaternion = new THREE.Quaternion();
      quaternion.setFromAxisAngle(axis, angle);

      // Apply the quaternion to the globe's rotation
      const newQuaternion = sphereRef.current.quaternion
        .clone()
        .multiply(quaternion);

      // Convert quaternion to Euler to check and constrain rotations
      const newEuler = new THREE.Euler().setFromQuaternion(
        newQuaternion,
        "XYZ"
      );

      // Constrain the X rotation to avoid flipping
      newEuler.x = Math.max(Math.min(newEuler.x, Math.PI / 2), -Math.PI / 2);

      // Reset Z rotation to 0 to keep the North Pole within the YZ plane
      newEuler.z = 0;

      // Update the sphere's quaternion
      sphereRef.current.quaternion.setFromEuler(newEuler);

      // Normalize the quaternion to ensure the rotation is valid
      sphereRef.current.quaternion.normalize();

      // Update the globe's matrix to apply the rotation
      sphereRef.current.updateMatrix();
      setCameraFOV(35);
    }
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
  }

  // function onMouseMove(event) {
  //   // Update mouse for raycasting
  //   // console.log(event.clientX);
  //   // console.log(lastMousePosition.current.x);

  //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  //   // console.log("onMouseMove with isDragging: " + isDragging.current);

  //   // Handle dragging
  //   if (isDragging.current) {
  //     const deltaX = event.clientX - lastMousePosition.current.x;
  //     const deltaY = event.clientY - lastMousePosition.current.y;

  //     // Adjust rotation speed as needed
  //     const rotationSpeed = 0.0025;

  //     // Update sphere rotation
  //     if (sphereRef.current) {
  //       const deltaRotationQuaternion = new THREE.Quaternion().setFromEuler(
  //         new THREE.Euler(
  //           deltaY * rotationSpeed,
  //           deltaX * rotationSpeed,
  //           0,
  //           "XYZ" // Rotation order
  //         )
  //       );

  //       sphereRef.current.quaternion.multiplyQuaternions(
  //         deltaRotationQuaternion,
  //         sphereRef.current.quaternion
  //       );

  //       // sphereRef.current.rotation.y += deltaX * rotationSpeed;
  //       // sphereRef.current.rotation.x += deltaY * rotationSpeed;
  //     }

  //     lastMousePosition.current = {
  //       x: event.clientX,
  //       y: event.clientY,
  //     };
  //   }
  // }
  function onMouseMove(event) {
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

        // Reset rotation around the Z-axis to 0 to prevent tilting out of the YZ plane
        sphereRef.current.rotation.z = 0;
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

  function onMouseUp(event) {
    // console.log("onMouseUp");
    // console.log(lastMousePosition.current.x);
    if (
      lastClickedPosition.current.x != event.clientX ||
      lastClickedPosition.current.y != event.clientY
    ) {
      // console.log("moused moved efter click, should not select country");
      shouldSelect.current = false;
    } else {
      // console.log("mouse not moved after click, select country!");
      shouldSelect.current = true;
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

    // const sphereMaterial = new THREE.MeshBasicMaterial({
    //   // map: new THREE.TextureLoader().load("/earthmap.jpeg"),
    //   // map: new THREE.TextureLoader().load("/earthnight.jpeg"),
    //   map: new THREE.TextureLoader().load(
    //     "/8k_earth.jpeg",
    //     (texture) => {
    //       // Texture loaded
    //       sphere.material.map = texture;
    //       sphere.material.needsUpdate = true;
    //     },
    //     undefined,
    //     (error) => {
    //       console.error("Error loading texture:", error);
    //     }
    //   ),
    //   transparent: false,
    //   // opacity: 0.3,
    // });
    const sphere = new THREE.Mesh(
      // new THREE.SphereGeometry(1, 50, 50),
      new THREE.SphereGeometry(1, 50, 50, phiStartOffset),
      sphereMaterial
    );

    // const ghostSphere = new THREE.Mesh(
    //   // new THREE.SphereGeometry(1, 50, 50),
    //   new THREE.SphereGeometry(1, 50, 50, phiStartOffset),
    //   new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.1 })
    // );

    sphereRef.current = sphere;

    const raycaster = new THREE.Raycaster();

    document.addEventListener("mousemove", onMouseMove, false);
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mouseup", onMouseUp, false);
    document.addEventListener("wheel", onMouseWheel, false);

    window.addEventListener("resize", onWindowResize, false);

    scene.add(sphere);
    // scene.add(ghostSphere);

    // const axesHelper = new THREE.AxesHelper(2); // The parameter 5 defines the size of the axes
    // scene.add(axesHelper);

    sceneRef.current = scene;
    createStarfield();

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    // directionalLight.position.set(2, 2, 5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 0.5 is the light intensity
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
            console.log(lat, lon);
            const country = findCountry(lat, lon, geoJSONData);
            if (country) {
              // console.log(country);
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

  const Overlay = () => (
    <div
      // style={{
      //   position: "absolute",
      //   top: "10%",
      //   left: "10%",
      //   // backgroundColor: "white",
      //   // padding: "10px",
      //   borderRadius: "5px",
      //   // display: showOverlay ? "block" : "none",
      // }}
      className=" absolute top-10 left-10"
    >
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Item One</NavigationMenuTrigger>
            <NavigationMenuContent className="p-5">
              <NavigationMenuLink>Link</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );

  return (
    <div ref={mountRef}>
      <Overlay />
    </div>
  );
};

export default ThreeScene;
