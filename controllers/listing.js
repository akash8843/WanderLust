const Listing = require("../models/listing");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const mapToken = process.env.MAP_TOKEN;

const geocodingClient = mbxGeocoding({
  accessToken: mapToken,
});

// INDEX ROUTE
module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
};

// RENDER NEW LISTING FORM
module.exports.renderNewForms = (req, res) => {
  res.render("listings/new.ejs");
};

// SHOW LISTING
module.exports.showListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .populate({
      path: "review",
      populate: {
        path: "author",
      },
    })
    .populate("owner");

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  res.render("listings/show.ejs", { listing });
};

// CREATE LISTING
module.exports.createListing = async (req, res) => {
  // Validate request body
  if (!req.body.listing) {
    req.flash("error", "Please provide listing details!");
    return res.redirect("/listings/new");
  }

  const location = req.body.listing.location;

  // Geocode listing location using Mapbox
  const response = await geocodingClient
    .forwardGeocode({
      query: `${location}, ${req.body.listing.country || ""}`,
      limit: 1,
    })
    .send();

  const feature = response.body.features?.[0];
  
  if (
    !feature ||
    feature.geometry?.type !== "Point" ||
    !Array.isArray(feature.geometry.coordinates) ||
    feature.geometry.coordinates.length !== 2 ||
    !feature.geometry.coordinates.every(Number.isFinite)
  ) {
    req.flash("error", "Location not found. Please enter a valid location!");
    return res.redirect("/listings/new");
  }

  // Check uploaded image
  if (!req.file) {
    req.flash("error", "Please upload a listing image!");
    return res.redirect("/listings/new");
  }

  const { path: url, filename } = req.file;

  const newListing = new Listing(req.body.listing);

  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  newListing.geometry = {
    type: "Point",
    coordinates: feature.geometry.coordinates,
  };

  console.log("Geometry before save:", JSON.stringify(newListing.geometry));

  const savedListing = await newListing.save();

  console.log("Saved listing geometry:", JSON.stringify(savedListing.geometry));

  req.flash("success", "New Listing Created!");
  res.redirect(`/listings/${savedListing._id}`);
};

// RENDER EDIT FORM
module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit this listing!");
    return res.redirect(`/listings/${id}`);
  }

  let originalImageUrl = listing.image.url;
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");

  res.render("listings/edit.ejs", {
    listing,
    originalImageUrl,
  });
};

// UPDATE LISTING
module.exports.updateListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to edit this listing!");
    return res.redirect(`/listings/${id}`);
  }

  if (!req.body.listing) {
    req.flash("error", "Please provide listing details!");
    return res.redirect(`/listings/${id}/edit`);
  }

  // Get the updated location and country
  const { location, country } = req.body.listing;

  // Get new coordinates from Mapbox
  const response = await geocodingClient
    .forwardGeocode({
      query: `${location}, ${country || ""}`,
      limit: 1,
      types: ["place", "locality", "district", "region", "country"],
    })
    .send();

  const feature = response.body.features?.[0];
  const coordinates = feature?.geometry?.coordinates;

  // Validate the new coordinates
  if (
    !Array.isArray(coordinates) ||
    coordinates.length !== 2 ||
    !coordinates.every(
      (value) => typeof value === "number" && Number.isFinite(value),
    )
  ) {
    req.flash("error", "Location not found. Please enter a valid location!");
    return res.redirect(`/listings/${id}/edit`);
  }

  // Update listing details
  Object.assign(listing, req.body.listing);

  // Save the new map coordinates
  listing.geometry = {
    type: "Point",
    coordinates: coordinates,
  };

  // Update image only if a new image was uploaded
  if (req.file) {
    const { path: url, filename } = req.file;
    listing.image = { url, filename };
  }

  await listing.save();

  req.flash("success", "Listing Updated!");
  res.redirect(`/listings/${listing._id}`);
};

// DELETE LISTING
module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested does not exist!");
    return res.redirect("/listings");
  }

  if (!listing.owner || !listing.owner.equals(req.user._id)) {
    req.flash("error", "You don't have permission to delete this listing!");
    return res.redirect(`/listings/${id}`);
  }

  await Listing.findByIdAndDelete(id);

  req.flash("success", "Listing Deleted!");
  res.redirect("/listings");
};
