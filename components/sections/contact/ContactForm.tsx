"use client";

import { FormEvent, useState } from "react";
import PrimaryButton from "@/components/common/PrimaryButton";

type FormState = {
  name: string;
  company: string;
  email: string;
  role: string;
  size: string;
  interests: string[];
  message: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  name: "",
  company: "",
  email: "",
  role: "",
  size: "",
  interests: [],
  message: "",
};

const roleOptions = [
  { value: "hr", label: "HR / People" },
  { value: "lead", label: "Team Lead / Head" },
  { value: "cto", label: "CTO / VP Eng" },
  { value: "founder", label: "Founder" },
  { value: "other", label: "Другое" },
];

const sizeOptions = [
  { value: "0-50", label: "до 50" },
  { value: "50-200", label: "50–200" },
  { value: "200-500", label: "200–500" },
  { value: "500-2000", label: "500–2000" },
  { value: "2000+", label: "2000+" },
];

const interestOptions = [
  { value: "pilot", label: "Пилот для команды" },
  { value: "integrations", label: "Интеграция с текущими инструментами" },
  { value: "pricing", label: "Оценка стоимости" },
  { value: "personal", label: "Quadrant для личного профиля" },
];

export default function ContactForm() {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "success">("idle");

  const handleChange = (field: keyof FormState, value: string | string[]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleInterest = (value: string) => {
    setFormState((prev) => {
      const exists = prev.interests.includes(value);
      const interests = exists ? prev.interests.filter((item) => item !== value) : [...prev.interests, value];
      return { ...prev, interests };
    });
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!formState.name.trim()) nextErrors.name = "Укажите имя и фамилию";
    if (!formState.company.trim()) nextErrors.company = "Укажите компанию";
    if (!formState.email.trim() || !formState.email.includes("@")) {
      nextErrors.email = "Введите рабочий email";
    }
    if (!formState.role) nextErrors.role = "Выберите роль";
    if (!formState.size) nextErrors.size = "Выберите размер компании";
    return nextErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStatus("idle");
      return;
    }
    console.log("Contact form submission", formState);
    setStatus("success");
    setFormState(initialState);
    setErrors({});
  };

  const inputClasses = (field: keyof FormState) =>
    `h-12 rounded-2xl border px-4 text-brand-text outline-none transition focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20 ${
      errors[field] ? "border-red-400 focus:ring-red-100" : "border-white/70"
    }`;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/70 bg-white/95 p-8 shadow-[0_25px_60px_rgba(15,23,42,0.08)]"
    >
      <div className="space-y-5">
        {status === "success" && (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
            Спасибо! Мы получили вашу заявку и скоро свяжемся с вами.
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-semibold text-slate-700">
            Имя и фамилия*
          </label>
          <input
            id="name"
            name="name"
            value={formState.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={inputClasses("name")}
            placeholder="Алексей Смирнов"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="company" className="text-sm font-semibold text-slate-700">
            Компания*
          </label>
          <input
            id="company"
            name="company"
            value={formState.company}
            onChange={(e) => handleChange("company", e.target.value)}
            className={inputClasses("company")}
            placeholder="Quadrant"
          />
          {errors.company && <p className="text-xs text-red-500">{errors.company}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-slate-700">
            Рабочий email*
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formState.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className={inputClasses("email")}
            placeholder="name@company.com"
          />
          {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="role" className="text-sm font-semibold text-slate-700">
            Роль*
          </label>
          <select
            id="role"
            name="role"
            value={formState.role}
            onChange={(e) => handleChange("role", e.target.value)}
            className={inputClasses("role")}
          >
            <option value="">Выберите роль</option>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="size" className="text-sm font-semibold text-slate-700">
            Размер компании*
          </label>
          <select
            id="size"
            name="size"
            value={formState.size}
            onChange={(e) => handleChange("size", e.target.value)}
            className={inputClasses("size")}
          >
            <option value="">Выберите диапазон</option>
            {sizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.size && <p className="text-xs text-red-500">{errors.size}</p>}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Что вас интересует</p>
          <div className="grid gap-2 text-sm text-slate-600">
            {interestOptions.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/40"
                  checked={formState.interests.includes(option.value)}
                  onChange={() => toggleInterest(option.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-semibold text-slate-700">
            Опишите задачу (необязательно)
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formState.message}
            onChange={(e) => handleChange("message", e.target.value)}
            className="rounded-2xl border border-white/70 px-4 py-3 text-brand-text outline-none transition focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20"
            placeholder="Например: хотим запустить пилот на 3 командах и увидеть карту навыков."
          />
        </div>
        <div className="space-y-2">
          <PrimaryButton type="submit" className="w-full justify-center">
            Отправить заявку
          </PrimaryButton>
          <p className="text-center text-xs text-slate-500">Мы ответим в течение 1–2 рабочих дней.</p>
        </div>
      </div>
    </form>
  );
}
