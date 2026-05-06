const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const validate = require("../middlewares/validateMiddleware");
const { createReviewSchema } = require("../validators/reviewValidator");

router.post("/", validate(createReviewSchema), reviewController.createReview);

module.exports = router;