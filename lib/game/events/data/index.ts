// Event registry. To add content: append EventDef objects to any pack (or create a new
// pack and spread it here). The engine never needs to change.
import type { EventDef } from "../../types";
import { CRYPTO } from "./crypto";
import { KOL_EVENTS } from "./kol";
import { LEGENDARY } from "./legendary";
import { LIFE } from "./life";
import { MCDONALDS } from "./mcdonalds";
import { ONBOARDING } from "./onboarding";
import { SOCIAL } from "./social";
import { SYSTEM } from "./system";
import { TRADES } from "./trades";

export const EVENTS: EventDef[] = [
  ...ONBOARDING,
  ...CRYPTO,
  ...TRADES,
  ...KOL_EVENTS,
  ...LIFE,
  ...MCDONALDS,
  ...SOCIAL,
  ...LEGENDARY,
  ...SYSTEM,
];
