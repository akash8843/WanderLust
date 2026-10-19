require("dotenv").config();

const mongoose = require("mongoose");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const Listing = require("./models/listing.js");

const MONGO_URI = "mongodb://127.0.0.1:27017/wanderlust";
const mapToken = process.env.MAP_TOKEN;

if (!mapToken) {
  console.error("MAP_TOKEN is missing from your .env file.");
  process.exit(1);
}

const geocodingClient = mbxGeocoding({
  accessToken: mapToken,
});

async function fixListingGeometry() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    // Find listings whose GeoJSON coordinates are missing or invalid.
    const listings = await Listing.find({
      $or: [
        { "geometry.coordinates": { $exists: false } },
        { "geometry.coordinates": { $size: 0 } },
        { "geometry.coordinates.0": { $exists: false } },
        { "geometry.coordinates.1": { $exists: false } },
      ],
    });

    console.log(`Found ${listings.length} listings to check.`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const listing of listings) {
      try {
        const query = [listing.location, listing.country]
          .filter(Boolean)
          .join(", ");

        if (!query.trim()) {
          console.log(`Skipped "${listing.title}": no location.`);
          skipped++;
          continue;
        }

        console.log(`Geocoding "${listing.title}": ${query}`);

        const response = await geocodingClient
          .forwardGeocode({
            query,
            limit: 1,
            types: ["place", "locality", "district", "region", "country"],
          })
          .send();

        const feature = response.body.features?.[0];
        const coordinates = feature?.geometry?.coordinates;

        if (
          !Array.isArray(coordinates) ||
          coordinates.length !== 2 ||
          !coordinates.every(
            (value) => typeof value === "number" && Number.isFinite(value),
          )
        ) {
          console.log(
            `Skipped "${listing.title}": valid coordinates not found.`,
          );
          skipped++;
          continue;
        }

        // Update ONLY the geometry field; preserve all other listing data.
        await Listing.updateOne(
          { _id: listing._id },
          {
            $set: {
              geometry: {
                type: "Point",
                coordinates,
              },
            },
          },
        );

        console.log(`Updated "${listing.title}":`, coordinates);
        updated++;
      } catch (error) {
        console.error(`Failed "${listing.title}":`, error.message);
        failed++;
      }
    }

    console.log("\n--- Migration Summary ---");
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Failed: ${failed}`);
    console.log("Migration finished.");
  } catch (error) {
    console.error("Migration error:", error.message);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB connection closed.");
  }
}

fixListingGeometry();
