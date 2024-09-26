import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { 
    addComment,
    deleteComment,
    updateComment,
    getVideoComments, 
     
} from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);

router.route('/video/:videoId').post(addComment).get(getVideoComments);
router.route('/video/c/:commentId').patch(updateComment).delete(deleteComment);

export default router;