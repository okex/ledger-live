import fs from "fs";
import { from } from "rxjs";
import { mergeMap } from "rxjs/operators";
import { asDerivationMode } from "@ledgerhq/live-common/lib/derivation";
import { withDevice } from "@ledgerhq/live-common/lib/hw/deviceAccess";
import signMessage from "@ledgerhq/live-common/lib/hw/signMessage";
import { currencyOpt, inferCurrency } from "../scan";
export default {
  description:
    "Sign a message with the device on specific derivations (advanced)",
  args: [
    currencyOpt,
    {
      name: "path",
      type: String,
      desc: "HDD derivation path",
    },
    {
      name: "derivationMode",
      type: String,
      desc: "derivationMode to use",
    },
    {
      name: "message",
      type: String,
      desc: "the message to sign",
    },
    {
      name: "rawMessage",
      type: String,
      desc: "the message to sign but raw",
    },
    {
      name: "parser",
      type: String,
      desc: "parser used for the message. Default: String",
      default: "String",
    },
  ],
  job: (arg: any) =>
    inferCurrency(arg).pipe(
      mergeMap((currency) => {
        if (!currency) {
          throw new Error("no currency provided");
        }

        if (!arg.path) {
          throw new Error("--path is required");
        }

        asDerivationMode(arg.derivationMode);

        switch (arg.parser?.toLowerCase()) {
          case "object":
          case "json":
          case "json.parse":
            try {
              arg.message = JSON.parse(arg.message);
            } catch (e) {
              //
            }
            break;

          case "file":
            try {
              arg.message = JSON.parse(fs.readFileSync(arg.message, "utf8"));
            } catch (e) {
              //
            }
            break;

          case "string":
          default:
            arg.message = arg.message?.toString();
            break;
        }

        return withDevice(arg.device || "")((t) =>
          from(signMessage(t, { ...arg, currency }))
        );
      })
    ),
};
