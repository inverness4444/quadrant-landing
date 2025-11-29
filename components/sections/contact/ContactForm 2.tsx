"use client";

import { FormEvent, useEffect, useState } from "react";
import { useDictionary } from "@/hooks/useDictionary";
import { trackEvent } from "@/services/analytics";

type FormState = {
  name: string;
  company: string;
  email: string;
  headcount: string;
  message: string;
  honeypot?: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  name: "",
  company: "",
  email: "",
  headcount: "",
  message: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [renderedAt, setRenderedAt] = useState<number>(Date.now());
  const dict = useDictionary();

  useEffect(() => {
    setRenderedAt(Date.now());
  }, []);
  const handleChange = (
    field: keyof FormState,
    value: FormState[keyof FormState],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!formState.name.trim()) nextErrors.name = "Введите имя";
    if (!formState.company.trim()) nextErrors.company = "Укажите компанию";
    if (!formState.email.trim() || !emailRegex.test(formState.email)) {
      nextErrors.email = "Укажите корректный email";
    }
    if (!formState.headcount) nextErrors.headcount = "Выберите диапазон";
    if (!formState.message.trim()) {
      nextErrors.message = "Напишите короткий комментарий";
    }
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setStatus("submitting");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          renderedAt,
          submittedAt: Date.now(),
          honeypot: formState.honeypot,
        }),
      });
      if (!response.ok) throw new Error("Request failed");
      trackEvent("lead_submitted", { email: formState.email });
      setStatus("success");
      setFormState(initialState);
      setRenderedAt(Date.now());
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  const inputClasses = (field: keyof FormState) => {
    const base =
      "h-12 rounded-xl border px-4 text-brand-text outline-none transition focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20";
    return `${base} ${
      errors[field] ? "border-red-400 focus:ring-red-100" : "border-brand-border"
    }`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-brand-border bg-white p-6 shadow-sm"
    >
      <div className="grid gap-5">
        <label className="sr-only" aria-hidden="true">
          Сайт
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formState.honeypot ?? ""}
            onChange={(event) => handleChange("honeypot", event.target.value)}
            className="hidden"
          />
        </label>
        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-semibold text-slate-700">
            {dict.contactForm.name}
          </label>
          <input
            id="name"
            name="name"
            value={formState.name}
            onChange={(event) => handleChange("name", event.target.value)}
            className={inputClasses("name")}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name}</p>
          )}
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="company"
            className="text-sm font-semibold text-slate-700"
          >
            {dict.contactForm.company}
          </label>
          <input
            id="company"
            name="company"
            value={formState.company}
            onChange={(event) => handleChange("company", event.target.value)}
            className={inputClasses("company")}
          />
          {errors.company && (
            <p className="text-xs text-red-500">{errors.company}</p>
          )}
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="email"
            className="text-sm font-semibold text-slate-700"
          >
            {dict.contactForm.email}
          </label>
          <input
            id="email"
            name="email"
            value={formState.email}
            onChange={(event) => handleChange("email", event.target.value)}
            className={inputClasses("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email}</p>
          )}
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="headcount"
            className="text-sm font-semibold text-slate-700"
          >
            {dict.contactForm.headcount}
          </label>
          <select
            id="headcount"
            name="headcount"
            value={formState.headcount}
            onChange={(event) => handleChange("headcount", event.target.value)}
            className={inputClasses("headcount")}
          >
            <option value="">Выберите диапазон</option>
            <option value="до 20">до 20</option>
            <option value="20-100">20–100</option>
            <option value="100-500">100–500</option>
            <option value="500+">500+</option>
          </select>
          {errors.headcount && (
            <p className="text-xs text-red-500">{errors.headcount}</p>
          )}
        </div>
        <div className="grid gap-2">
          <label
            htmlFor="message"
            className="text-sm font-semibold text-slate-700"
          >
            {dict.contactForm.message}
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            value={formState.message}
            onChange={(event) => handleChange("message", event.target.value)}
            className={`rounded-xl border px-4 py-3 text-brand-text outline-none transition focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20 ${
              errors.message
                ? "border-red-400 focus:ring-red-100"
                : "border-brand-border"
            }`}
          />
          {errors.message && (
            <p className="text-xs text-red-500">{errors.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="inline-flex h-12 items-center justify-center rounded-full bg-brand-primary px-6 text-base font-semibold text-white transition hover:bg-brand-accent disabled:opacity-60"
        >
          {status === "submitting"
            ? dict.contactForm.submitting
            : dict.contactForm.submit}
        </button>
        {status === "success" && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            Спасибо! Мы свяжемся с вами в ближайшее время.
          </p>
        )}
        {status === "error" && (
          <p
            role="status"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            Что-то пошло не так, попробуйте ещё раз.
          </p>
        )}
      </div>
    </form>
  );
}
