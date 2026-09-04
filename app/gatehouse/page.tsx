import { redirect } from "next/navigation";

// Gatehouse used to be a single page at /gatehouse; it's now split into
// /gatehouse-info (class info + passwords) and /gatehouse-comms (weekly
// digests). Redirect old bookmarks/links to the info page rather than
// leaving them 404.
export default function GatehouseRedirect() {
  redirect("/gatehouse-info");
}
