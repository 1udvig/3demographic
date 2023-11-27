export const Overlay = ({ country }) => (
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
    className=" absolute top-10 left-10 bg-slate-300  p-6 z-50"
    onMouseEnter={() => console.log("entered the overlay")}
  >
    {/* <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Item One</NavigationMenuTrigger>
            <NavigationMenuContent className="p-5">
              <NavigationMenuLink>{country}</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu> */}
    <p>{country}</p>
  </div>
);
