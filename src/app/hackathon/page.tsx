import type { Metadata } from "next";
import { HackathonView } from "@/components/views/HackathonView";

export const metadata: Metadata = {
  title: "Hackathons",
  description:
    "Upcoming Kick To Tech hackathons — where innovation meets collaboration. A new generation of builders coming together to turn ideas into real projects.",
};

export default function HackathonPage() {
  return <HackathonView />;
}
