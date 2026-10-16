import { Container, Section } from "@/components/ui";
import { Reveal } from "@/components/motion/Reveal";
import { siteConfig } from "@/config/site";
import { team } from "@/data/mock/team";
import { LeaderCard } from "./LeaderCard";

export function Founder() {
  const kaustubh = team.find((m) => m.id === "kaustubh-pawar");
  const kanchan = team.find((m) => m.id === "kanchan-patil");

  return (
    <Section>
      <Container>
        {/* Founder — hero card (unchanged presentation) */}
        <Reveal>
          <LeaderCard
            name={siteConfig.founder.name}
            role={siteConfig.founder.role}
            photo="/team/mayur-patil.png"
            objectPosition="center 20%"
            linkedin={siteConfig.founder.linkedin}
            quote={siteConfig.founderQuote}
            badges={["MSME Registered", "MoU with JSPM University"]}
          />
        </Reveal>

        {/* Co-leaders — same card design as the founder */}
        {(kaustubh || kanchan) && (
          <div className="mt-6 grid gap-6 sm:mt-8 sm:gap-8 lg:grid-cols-2">
            {kaustubh?.photo && (
              <Reveal className="h-full">
                <LeaderCard
                  compact
                  name={kaustubh.name}
                  role={kaustubh.role}
                  photo={kaustubh.photo}
                  objectPosition={kaustubh.objectPosition}
                  linkedin={kaustubh.linkedin}
                  description={kaustubh.bio}
                />
              </Reveal>
            )}
            {kanchan?.photo && (
              <Reveal className="h-full">
                <LeaderCard
                  compact
                  name={kanchan.name}
                  role={kanchan.role}
                  photo={kanchan.photo}
                  objectPosition={kanchan.objectPosition}
                  linkedin={kanchan.linkedin}
                  description={kanchan.bio}
                />
              </Reveal>
            )}
          </div>
        )}
      </Container>
    </Section>
  );
}
