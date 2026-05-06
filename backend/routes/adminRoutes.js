const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const requireAdmin = require("../middlewares/adminMiddleware");

router.post("/login", adminController.adminLogin);
router.get("/workers", requireAdmin, adminController.getPendingWorkers);
router.post("/verify-proof/:phone", requireAdmin, adminController.verifyProof);
router.get("/submitted-jobs", requireAdmin, adminController.getSubmittedJobs);
router.post("/verify-job/:jobId", requireAdmin, adminController.verifyJob);
router.get("/history", requireAdmin, adminController.getHistory);

module.exports = router;