const mongoose = require("mongoose");
const { data } = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

const MONGO_URI = "mongodb://127.0.0.1:27017/wanderlust";

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB");
}

async function initData() {
  try {
    await Listing.deleteMany({});

    const ownerId = "6ad1530d1b02a45d7cdd3c67";

    const listingsWithOwner = data.map((listing) => ({
      ...listing,
      owner: ownerId,
    }));

    const insertedListings = await Listing.insertMany(listingsWithOwner);

    console.log("Initial data inserted.");
    console.log("Total inserted listings:", insertedListings.length);
    console.log("Inserted listing titles:");
    console.log(insertedListings.map((listing) => listing.title));
  } catch (err) {
    console.error("Error initializing data:", err);
  } finally {
    await mongoose.connection.close();
  }
}

main()
  .then(initData)
  .catch((err) => {
    console.error(err);
    mongoose.connection.close();
  });
