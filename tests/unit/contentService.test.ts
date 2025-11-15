import { describe, expect, it } from "vitest";
import { contentService } from "@/services/contentService";

describe("contentService", () => {
  it("returns home content with sections", () => {
    const home = contentService.getHomeContent();
    expect(home.hero.title).toBeTruthy();
    expect(home.tracks.length).toBeGreaterThan(0);
    expect(home.sections.process.title).toContain("Как");
  });

  it("returns company content with case study", () => {
    const data = contentService.getCompanyContent();
    expect(data.benefits.length).toBeGreaterThan(0);
    expect(data.caseStudy.summary.length).toBeGreaterThan(0);
  });
});
