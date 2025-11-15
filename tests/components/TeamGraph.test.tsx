import { act, render, screen } from "@testing-library/react";
import TeamGraph from "@/components/sections/demo/TeamGraph";
import type { DemoEmployee, DemoSkill, DemoEdge } from "@/content/demo";
import { vi } from "vitest";

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: () => ({ onNodeClick }: { onNodeClick: (node: unknown) => void }) => (
    <button
      onClick={() =>
        onNodeClick({
          id: "emp",
          type: "employee",
          name: "Test",
          role: "Dev",
          team: "Core",
          grade: "Senior",
          artifacts: [],
          strengths: [],
        })
      }
    >
      GraphMock
    </button>
  ),
}));

const employees: DemoEmployee[] = [
  {
    id: "emp",
    name: "Test",
    role: "Dev",
    team: "Core",
    grade: "Senior",
    artifacts: ["PR"],
    strengths: ["TS"],
  },
];
const skills: DemoSkill[] = [{ id: "sk", label: "Skill" }];
const edges: DemoEdge[] = [{ source: "emp", target: "sk" }];

describe("TeamGraph", () => {
  it("shows details after interaction", () => {
    render(<TeamGraph employees={employees} skills={skills} edges={edges} />);
    act(() => {
      screen.getByText("GraphMock").click();
    });
    expect(screen.getByText("Dev · Core")).toBeInTheDocument();
  });
});
