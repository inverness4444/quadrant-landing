import { render, screen } from "@testing-library/react";
import Header from "@/components/common/Header";
import { vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/contentService", () => ({
  contentService: {
    getNavigation: () => ({
      header: [
        { key: "home", href: "/", defaultLabel: "Главная" },
        { key: "demo", href: "/demo", defaultLabel: "Демо" },
      ],
      footer: [],
    }),
  },
}));

vi.mock("@/hooks/useDictionary", () => ({
  useDictionary: () => ({
    navigation: { home: "Главная", demo: "Демо" },
    buttons: { login: "Войти", requestDemo: "Запросить демо", cabinet: "В кабинет" },
  }),
}));

vi.mock("@/components/common/LanguageSwitcher", () => ({
  __esModule: true,
  default: () => <div data-testid="lang-switcher" />,
}));

describe("Header", () => {
  it("renders navigation links", () => {
    render(<Header initialSession={{ authenticated: false }} />);
    expect(screen.getByText("Главная")).toBeInTheDocument();
    expect(screen.getByText("Демо")).toBeInTheDocument();
  });
});
