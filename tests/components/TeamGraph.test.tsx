import { render, screen } from "@testing-library/react";
import TeamGraph from "@/components/sections/demo/TeamGraph";

describe("TeamGraph", () => {
  it("renders graph heading and nodes", () => {
    render(<TeamGraph />);
    expect(screen.getByText("Граф команды")).toBeInTheDocument();
    expect(screen.getByText("Аня")).toBeInTheDocument();
    expect(screen.getByText("Backend")).toBeInTheDocument();
  });
});
