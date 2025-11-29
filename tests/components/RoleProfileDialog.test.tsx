/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import RoleProfileDialog from "@/components/app/skills/RoleProfileDialog";

describe("RoleProfileDialog", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("validates and submits payload", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const fetchMock = vi.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as any);

    render(<RoleProfileDialog open initialProfile={undefined} onClose={onClose} onSaved={onSaved} />);

    fireEvent.change(screen.getByPlaceholderText("Senior Backend Engineer"), { target: { value: "Backend" } });
    fireEvent.click(screen.getByText("Добавить навык"));
    fireEvent.change(screen.getByPlaceholderText("backend.go"), { target: { value: "backend.go" } });
    fireEvent.click(screen.getByText("Сохранить"));

    expect(fetchMock).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });
});
