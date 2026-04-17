const express = require("express");
const router = express.Router();
const workerController = require("../controllers/workerController");
const { uploadProof, uploadVideo } = require("../middlewares/uploadMiddleware");

router.get("/", workerController.getWorkers);
router.get("/user/:phone", workerController.getUserByPhone);
router.get("/my-jobs/:phone", workerController.getMyJobs);
router.get("/review/:phone", workerController.getProofReview);   // <-- add this
router.post("/upload-proof/:phone", uploadProof.single("proof"), workerController.uploadProof);
router.post("/update-job/:jobId", uploadVideo.single("videoProof"), workerController.updateJob);
router.post("/probation-job/create", workerController.createProbationJob);
router.get("/:phone", workerController.getWorkerProfile);

module.exports = router;