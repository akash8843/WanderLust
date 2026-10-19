const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const Listing = require("../models/listing.js");
const { isLoggedIn } = require("../middleware.js");
const listingController = require("../controllers/listing.js");
const multer = require("multer");
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

//validate server errror for listing model //
const validateListing = (req, res, next) => {
  const { error } = listingSchema.validate(req.body);
  if (error) {
    const errorMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errorMsg);
  }
  next();
};

router
  .route("/") //index route//
  .get(wrapAsync(listingController.index))
  .post(
    //Create Route//
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.createListing),
  );

//New Route//
router.get("/new", isLoggedIn, listingController.renderNewForms);

router
  .route("/:id")
  .get(wrapAsync(listingController.showListing)) // Show Routes//
  .put(
    //Update Routes//
    isLoggedIn,
    upload.single("listing[image]"),
    validateListing,
    wrapAsync(listingController.updateListing),
  )
  .delete(
    //Delete Routes//
    isLoggedIn,
    wrapAsync(listingController.destroyListing),
  );

//Edit Routes//
router.get(
  "/:id/edit",
  isLoggedIn,
  wrapAsync(listingController.renderEditForm),
);

router;

module.exports = router;
