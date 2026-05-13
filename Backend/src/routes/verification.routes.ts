import { Router } from "express";
import { verifyProduct } from "../controllers/verification.controller";

const verificationRouter = Router();

verificationRouter.post("/verify", verifyProduct);

export default verificationRouter;
