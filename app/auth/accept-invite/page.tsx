import { redirect } from "next/navigation";
import Card from "@/components/common/Card";
import PrimaryButton from "@/components/common/PrimaryButton";
import SecondaryButton from "@/components/common/SecondaryButton";
import { getUserIdFromCookies } from "@/lib/session";
import { getInviteDetails, acceptInviteForUser } from "@/services/inviteService";
import { findUserById } from "@/repositories/userRepository";

type AcceptInvitePageProps = {
  searchParams: {
    token?: string;
  };
};

export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const params = await searchParams;
  const token = params?.token;
  if (!token) {
    return <InviteError message="Ссылка приглашения отсутствует или повреждена." />;
  }

  const details = await getInviteDetails(token);
  if (!details) {
    return <InviteError message="Приглашение не найдено или уже недействительно." />;
  }

  if (details.invite.status !== "pending") {
    return <InviteError message="Эта ссылка уже использована или отменена. Попросите владельца отправить новое приглашение." />;
  }

  const userId = await getUserIdFromCookies();
  if (!userId) {
    return <LoginOrRegister token={token} email={details.invite.email} workspaceName={details.workspace.name} />;
  }

  const user = await findUserById(userId);
  if (!user) {
    return <InviteError message="Сессия устарела. Попробуйте войти ещё раз." actionHref="/auth/login" actionLabel="Войти" />;
  }

  const result = await acceptInviteForUser(details.invite, user);
  if (result.status === "accepted") {
    redirect("/app");
  }

  if (result.status === "expired") {
    return <InviteError message="Срок действия приглашения истёк. Попросите владельца отправить новое письмо." />;
  }

  if (result.status === "invalid") {
    return <InviteError message="Приглашение уже было обработано или отменено." />;
  }

  if (result.status === "limit_reached") {
    return (
      <InviteError
        message={result.reason}
        actionHref="/pricing"
        actionLabel="Посмотреть тарифы"
      />
    );
  }

  return <InviteMismatch inviteEmail={details.invite.email} currentEmail={user.email} token={token} />;
}

function InviteError({
  message,
  actionHref = "/",
  actionLabel = "На главную",
}: {
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-muted px-4">
      <Card className="w-full max-w-md space-y-4 text-center">
        <div>
          <p className="text-xs uppercase text-slate-500">Приглашение</p>
          <h1 className="text-2xl font-semibold text-brand-text">Не удалось принять приглашение</h1>
        </div>
        <p className="text-sm text-slate-600">{message}</p>
        <PrimaryButton href={actionHref}>{actionLabel}</PrimaryButton>
      </Card>
    </div>
  );
}

function LoginOrRegister({ token, email, workspaceName }: { token: string; email: string; workspaceName: string }) {
  const returnPath = `/auth/accept-invite?token=${encodeURIComponent(token)}`;
  const loginHref = `/auth/login?next=${encodeURIComponent(returnPath)}`;
  const registerHref = `/auth/register?next=${encodeURIComponent(returnPath)}&inviteToken=${encodeURIComponent(
    token,
  )}&email=${encodeURIComponent(email)}&workspaceName=${encodeURIComponent(workspaceName)}`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-muted px-4">
      <Card className="w-full max-w-xl space-y-6 text-center">
        <div>
          <p className="text-xs uppercase text-slate-500">Приглашение</p>
          <h1 className="text-2xl font-semibold text-brand-text">Вас пригласили в {workspaceName}</h1>
        </div>
        <p className="text-sm text-slate-600">
          Чтобы присоединиться, войдите под почтой <strong>{email}</strong> или зарегистрируйтесь.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <PrimaryButton href={loginHref} className="flex-1">
            Войти
          </PrimaryButton>
          <SecondaryButton href={registerHref} className="flex-1 text-center">
            Зарегистрироваться
          </SecondaryButton>
        </div>
      </Card>
    </div>
  );
}

function InviteMismatch({ inviteEmail, currentEmail, token }: { inviteEmail: string; currentEmail: string; token: string }) {
  const returnHref = `/auth/accept-invite?token=${encodeURIComponent(token)}`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-muted px-4">
      <Card className="w-full max-w-lg space-y-5 text-center">
        <div>
          <p className="text-xs uppercase text-slate-500">Приглашение</p>
          <h1 className="text-2xl font-semibold text-brand-text">Нужен другой аккаунт</h1>
        </div>
        <p className="text-sm text-slate-600">
          Вы вошли как <strong>{currentEmail}</strong>, а приглашение отправлено на <strong>{inviteEmail}</strong>. Выйдите и войдите
          под нужным email.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <form action="/auth/logout" method="post" className="flex-1 space-y-2">
            <PrimaryButton type="submit" className="w-full">
              Выйти
            </PrimaryButton>
            <input type="hidden" name="next" value={returnHref} />
          </form>
          <SecondaryButton href={returnHref} className="flex-1 text-center">
            Обновить страницу
          </SecondaryButton>
        </div>
      </Card>
    </div>
  );
}
