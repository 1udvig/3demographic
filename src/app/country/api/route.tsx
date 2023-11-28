import { NextRequest, NextResponse } from "next/server";
import getCountryISO2 from "country-iso-3-to-2";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const countryISO_3 = searchParams.get("countryISO");
  // console.log(countryISO_3);
  const countryISO_2 = getCountryISO2(countryISO_3);
  // console.log(countryISO_2);
  // return NextResponse.json({ data: countryISO_3 });

  try {
    // Using await to wait for the fetch request to complete
    const fetchResponse = await fetch(
      `https://newsapi.org/v2/top-headlines?country=${countryISO_2}&apiKey=${process.env.NEWSAPI_KEY}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Checking if the response is ok (status in the range 200-299)
    if (!fetchResponse.ok) {
      throw new Error(`HTTP error! Status: ${fetchResponse.status}`);
    }

    // Waiting for the response to be converted to JSON
    const data = await fetchResponse.json();

    // Storing the data in the 'response' variable
    let response = data.articles.map((article) => ({
      title: article.title,
      url: article.url,
      publishedAt: article.publishedAt,
    }));

    // console.log(data);

    return NextResponse.json({ data: response });
  } catch (error) {
    // Handling any errors that occur during the fetch
    console.error("Error fetching data:", error);
    return NextResponse.json({ error: "failed" });
  }
}
