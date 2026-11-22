import { notFound } from "next/navigation";

/** Any unknown localized path renders the localized 404 (inside the public layout). */
export default function CatchAllNotFound() {
  notFound();
}
