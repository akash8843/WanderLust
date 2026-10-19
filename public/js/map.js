const mapToken = window.mapToken;
const listing = window.listingData;

mapboxgl.accessToken = mapToken;

// Check whether listing data exists
if (!listing) {
  throw new Error("Listing data is missing!");
}

// Get coordinates from listing geometry
const coordinates = listing.geometry?.coordinates;

console.log("Listing geometry:", listing.geometry);
console.log("Coordinates:", coordinates);

// Validate coordinates before rendering the map
if (
  !Array.isArray(coordinates) ||
  coordinates.length !== 2 ||
  !coordinates.every(
    (coordinate) =>
      typeof coordinate === "number" && Number.isFinite(coordinate),
  )
) {
  throw new Error(
    "Invalid map coordinates. Please check the listing's saved geometry.",
  );
}

// Initialize Mapbox map
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/streets-v12",
  center: coordinates,
  zoom: 9,
});

// Add marker and popup
const marker = new mapboxgl.Marker({ color: "red" })
  .setLngLat(coordinates)
  .setPopup(
    new mapboxgl.Popup({ offset: 25 }).setHTML(
      `<h4>${listing.location}</h4>
       <p>Exact location will be provided after booking.</p>`,
    ),
  )
  .addTo(map);
