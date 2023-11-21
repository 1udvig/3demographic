import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
// Function to convert lat/lon to 3D coordinates

export function getPointFromLatLong(
  latitude,
  longitude,
  radius,
  phiStartOffset
) {
  // Convert latitude and longitude from degrees to radians
  var latRad = latitude * (Math.PI / 180);
  var lonRad = longitude * (Math.PI / 180);

  // Adjust longitude to account for the starting angle offset of the sphere
  lonRad -= phiStartOffset;

  // Convert lat/lon to Cartesian coordinates
  var x = -1 * radius * Math.cos(latRad) * Math.cos(lonRad);
  var y = radius * Math.sin(latRad);
  var z = radius * Math.cos(latRad) * Math.sin(lonRad);

  return new THREE.Vector3(x, y, z);
}

// Function to create a line representing the country's outline
export function createCountryOutline(geojsonData, countryName, radius) {
  // Find the feature that corresponds to the country.
  // console.log(geojsonData);

  const countryFeature = geojsonData.features.find(
    (feature) => feature.properties.ADMIN === countryName
  );

  if (!countryFeature) return null;
  // console.log(countryFeature);

  // Ensure we have a geometry object
  if (!countryFeature.geometry || !countryFeature.geometry.coordinates)
    return null;

  // The material for the country outlines
  // const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
  const material = new THREE.LineBasicMaterial({
    color: 0xff0000,
    depthTest: false,
    depthWrite: false,
    linewidth: 2, // Note that this might not have any effect on some platforms
  });

  // This will hold all line segments
  const lines = [];

  // Function to process each coordinate set and create a line segment
  const processCoordinates = (coordinates) => {
    for (let i = 0; i < coordinates.length; i++) {
      const polygon = coordinates[i];
      // console.log(polygon);
      // Make sure that polygon is an array of arrays before trying to map over it
      if (
        !Array.isArray(polygon) ||
        polygon.some((coord) => !Array.isArray(coord))
      ) {
        console.error("Invalid polygon coordinates", polygon);
        continue; // Skip this polygon if the coordinates are invalid
      }
      const points = [];
      for (let j = 0; j < polygon.length; j++) {
        const [lon, lat] = polygon[j];
        // const points = polygon[j]
        // .filter((coord) => Array.isArray(coord) && coord.length == 2)
        // .map([lon, lat] => {
        // Get the point from lat/long
        // console.log("Boundary coordinate:");
        // console.log(lon, lat);

        const point = getPointFromLatLong(lat, lon, radius, -Math.PI / 2);

        // console.log("translated to point in sphere");
        // console.log(point);
        // Normalize the point (make it have length of 1)
        // point.multiplyScalar(1.1)
        // const normal = point.clone().normalize();
        // // Move the point out by a small amount along the normal
        // const offset = normal.multiplyScalar(1.2);
        // // point.add(offset);
        // point.add(offset);

        points.push(point);
      }
      if (points.length > 0) {
        // if (j <= 5) {
        //   console.log(points);
        // }
        // console.log(points);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const linetoPush = new THREE.Line(geometry, material);
        linetoPush.raycastable = false;
        lines.push(linetoPush);
      }
    }
  };

  // Check if it's a MultiPolygon
  if (countryFeature.geometry.type === "MultiPolygon") {
    // MultiPolygon: an array of Polygon coordinate arrays
    // console.log("multipolygon");
    for (const polygons of countryFeature.geometry.coordinates) {
      processCoordinates(polygons);
    }
  } else if (countryFeature.geometry.type === "Polygon") {
    // Single Polygon: directly process coordinate arrays
    processCoordinates(countryFeature.geometry.coordinates);
  } else {
    // The geometry is neither a Polygon nor a MultiPolygon
    return null;
  }

  // If you want to return a single object containing all lines, use THREE.Group
  const group = new THREE.Group();
  // console.log(lines);
  lines.forEach((line) => {
    line.raycastable = false;
    group.add(line);
  });

  return group;
}
