import { Router } from "express";
import {
  testOCRIdentifier,
  testSIFTVerifier,
} from "../controllers/test.controller";

const testRouter = Router();

testRouter.post("/ocr", testOCRIdentifier);
testRouter.post("/sift", testSIFTVerifier);

export default testRouter;
