import React, { useEffect, useState } from "react";

const CountryData = ({ country }) => {
  const [fetchedData, setFetchedData] = useState(null);

  let countrytemp = "BRA";
  useEffect(() => {
    if (country) {
      fetch(`/country/api?countryISO=${countrytemp}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => setFetchedData(data))
        .catch((error) => console.error("Error fetching data:", error));
    }
  }, [country]);

  return (
    <div>
      {fetchedData ? (
        <div>{JSON.stringify(fetchedData)}</div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default CountryData;
