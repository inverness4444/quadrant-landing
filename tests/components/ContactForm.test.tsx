import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ContactForm from "@/components/sections/contact/ContactForm";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/hooks/useDictionary", () => ({
  useDictionary: () => ({
    contactForm: {
      name: "Имя",
      company: "Компания",
      email: "Email",
      headcount: "Кол-во сотрудников",
      message: "Комментарий/вопрос",
      submit: "Отправить",
      submitting: "Отправляем…",
    },
  }),
}));

describe("ContactForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({ ok: true } as Response)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates required fields", async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByText("Отправить"));
    expect(await screen.findAllByText(/Введите|Укажите/)).toHaveLength(3);
  });

  it("submits form when valid", async () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Test" } });
    fireEvent.change(screen.getByLabelText("Компания"), { target: { value: "Quadrant" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Кол-во сотрудников"), { target: { value: "20-100" } });
    fireEvent.change(screen.getByLabelText("Комментарий/вопрос"), { target: { value: "Hi" } });
    fireEvent.click(screen.getByText("Отправить"));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
  });
});
