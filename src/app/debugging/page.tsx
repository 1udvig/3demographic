"use client";
import CountryData from "@/components/ui/CountryData";
import React from "react";

function page() {
  return (
    <CountryData country={"Sweden"} ISO_A3={"SWE"}>
      <p>hello</p>
    </CountryData>
  );
}

export default page;
