import web from "@/app/web";
import { Router } from "express";

const router: Router = Router();

const defaultRoutes = [
  {
    path: "/",
    route: web,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
