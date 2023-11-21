const fs = require("fs");

// Function to convert lat/lon to 3D coordinates

function getPointFromLatLong(latitude, longitude, radius, phiStartOffset) {
  // Convert latitude and longitude from degrees to radians
  var latRad = latitude * (Math.PI / 180);
  var lonRad = longitude * (Math.PI / 180);

  // Adjust longitude to account for the starting angle offset of the sphere
  lonRad -= phiStartOffset;

  // Convert lat/lon to Cartesian coordinates
  var x = -1 * radius * Math.cos(latRad) * Math.cos(lonRad);
  var y = radius * Math.sin(latRad);
  var z = radius * Math.cos(latRad) * Math.sin(lonRad);

  //   return new THREE.Vector3(x, y, z);
  return { x: x, y: y, z: z };
}

function preProcessCountryOutline(radius) {
  // Function to process each coordinate set and create a line segment
  const processCoordinates = (coordinates) => {
    const points = [];
    for (let i = 0; i < coordinates.length; i++) {
      const polygon = coordinates[i];
      // console.log(polygon);
      // Make sure that polygon is an array of arrays before trying to map over it
      // if (
      //   !Array.isArray(polygon) ||
      //   polygon.some((coord) => !Array.isArray(coord))
      // ) {
      //   console.error("Invalid polygon coordinates", polygon);
      //   continue; // Skip this polygon if the coordinates are invalid
      // }

      for (let j = 0; j < polygon.length; j++) {
        const [lon, lat] = polygon[j];

        const point = getPointFromLatLong(lat, lon, radius, -Math.PI / 2);

        points.push(point);
      }
      // if (points.length > 0) {

      //   const geometry = new THREE.BufferGeometry().setFromPoints(points);
      //   lines.push(new THREE.Line(geometry, material));
      // }
    }
    return points;
  };

  fs.readFile("./public/countries.geojson", "utf8", (err, data) => {
    if (err) {
      console.error("Error reading the file: ", err);
      return;
    }

    const geojsonData = JSON.parse(data);
    let allCountryCoordinates = {};

    geojsonData.features.forEach((feature) => {
      if (feature.geometry.type !== "MultiPolygon") {
        return;
      }
      const countryName = feature.properties.ADMIN;
      const coordinates = feature.geometry.coordinates;
      let totalpoints = [];
      for (const polygons of coordinates) {
        let points = processCoordinates(polygons);
        totalpoints = [...totalpoints, ...points];
      }
      allCountryCoordinates[countryName] = totalpoints;
    });

    fs.writeFile(
      "country-outline.json",
      JSON.stringify(allCountryCoordinates, null, 2),
      "utf8",
      (err) => {
        if (err) {
          console.error("Error writing the file", err);
        } else {
          console.log("File written successfully");
        }
      }
    );
  });
}

preProcessCountryOutline(1);
