import { redirect } from "next/navigation";

export default function AddMangaPage() {
  redirect("/library/add?type=manga");
}
