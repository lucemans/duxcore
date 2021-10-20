import { ApiRoute, manifestation } from "@duxcore/manifestation";
import { runInNewContext } from "vm";
import Password from "../../classes/Password";
import { users } from "../../lib/users";

export const apiUsers: ApiRoute[] = [
  manifestation.newRoute({
    route: "/users",
    method: "post",
    executor: async (req, res) => {
      const missingValue = (valueName) => {
        return manifestation.newApiResponse({
          status: 400,
          message: `An error has occured`,
          data: {
            error: `Missing value '${valueName}'`
          },
          successful: false
        });
      }

      if (!req.body.password) return manifestation.sendApiResponse(res, missingValue("password"));
      if (!req.body.email) return manifestation.sendApiResponse(res, missingValue("email"));

      if (!req.body.name || !req.body.name.firstName) return manifestation.sendApiResponse(res, missingValue("name.firstName"));
      if (!req.body.name || !req.body.name.lastName) return manifestation.sendApiResponse(res, missingValue("name.lastName"));

      if (await users.emailExists(req.body.email)) return manifestation.sendApiResponse(res, {
        status: 400,
        message: "An error has occured",
        successful: false,
        data: {
          error: "User Already Exists!"
        }
      });

      users.create({
        email: req.body.email,
        password: Password.hash(req.body.password),
        firstName: req.body.name.firstName,
        lastName: req.body.name.lastName,
        role: "USER"
      }).then(() => {
        manifestation.sendApiResponse(res, manifestation.newApiResponse({
          status: 201,
          message: "User has been registered.",
          successful: true
        }))
      }).catch((e) => {
        manifestation.sendApiResponse(res, manifestation.newApiResponse({
          status: 500,
          message: "An internal error has occured.",
          data: {
            error: e.message
          },
          successful: false
        }))
      })
    }
  })
]