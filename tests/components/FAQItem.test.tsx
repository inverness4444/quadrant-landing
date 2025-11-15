import { fireEvent, render, screen } from "@testing-library/react";
import FAQItem from "@/components/common/FAQItem";

describe("FAQItem", () => {
  it("toggles answer", () => {
    render(<FAQItem question="Q" answer="A" />);
    fireEvent.click(screen.getByText("Q"));
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
