import { fireEvent, render, screen } from "@testing-library/react";
import ContactForm from "@/components/sections/contact/ContactForm";

describe("ContactForm", () => {
  it("validates required fields", async () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByText("Отправить заявку"));
    expect(await screen.findByText("Укажите имя и фамилию")).toBeInTheDocument();
    expect(await screen.findByText("Укажите компанию")).toBeInTheDocument();
    expect(await screen.findByText("Введите рабочий email")).toBeInTheDocument();
    expect(await screen.findByText("Выберите роль")).toBeInTheDocument();
    expect(await screen.findByText("Выберите размер компании")).toBeInTheDocument();
  });

  it("shows success message and clears fields after submit", async () => {
    render(<ContactForm />);
    fireEvent.change(screen.getByLabelText("Имя и фамилия*"), { target: { value: "Тестовый Пользователь" } });
    fireEvent.change(screen.getByLabelText("Компания*"), { target: { value: "Quadrant" } });
    fireEvent.change(screen.getByLabelText("Рабочий email*"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Роль*"), { target: { value: "cto" } });
    fireEvent.change(screen.getByLabelText("Размер компании*"), { target: { value: "50-200" } });
    fireEvent.click(screen.getByLabelText("Пилот для команды"));
    fireEvent.click(screen.getByText("Отправить заявку"));
    expect(await screen.findByText(/Спасибо! Мы получили вашу заявку/)).toBeInTheDocument();
    expect((screen.getByLabelText("Имя и фамилия*") as HTMLInputElement).value).toBe("");
  });
});
