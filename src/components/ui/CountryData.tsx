import React, { useEffect, useState } from "react";

const CountryData = ({ country, ISO_A3 }) => {
  const [fetchedData, setFetchedData] = useState(null);
  console.log(country, ISO_A3);
  useEffect(() => {
    if (country) {
      fetch(`/country/api?countryISO=${ISO_A3}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          setFetchedData(data.data);
          console.log(data);
        })
        .catch((error) => console.error("Error fetching data:", error));
    }
  }, [country, ISO_A3]);

  return (
    <div>
      {fetchedData ? (
        fetchedData.map((article, index) => (
          <div key={index}>
            <h1>{article.title}</h1>
            <h2>{article.publishedAt}</h2>
            <a
              href={article.url}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="z-100"
            >
              {article.url}
            </a>
          </div>
        ))
      ) : (
        // <div>placeholder</div>
        <div>Loading...</div>
      )}
    </div>
  );
};

export default CountryData;
