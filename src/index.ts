import express from "express";
import testRouter from "./routes/test.routes";
import verificationRouter from "./routes/verification.routes";
import { logger } from "./utils/logger";
import { config } from "./config/environment";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path}`);
  next();
});

app.use("/api/test", testRouter);
app.use("/api", verificationRouter);

app.get("/health", (req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "ScanVerify Backend API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      test: {
        ocr: "POST /api/test/ocr",
        sift: "POST /api/test/sift",
      },
    },
  });
});

const PORT = config.PORT;

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});
