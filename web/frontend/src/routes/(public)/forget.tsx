import { postEmailToResetPassword } from "@/actions/users/postEmailToResetPassword";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(public)/forget")({
  component: RouteComponent,
});

function RouteComponent() {
  const [email, setEmail] = useState("");
  const [fieldsError, setFieldsError] = useState({
    email: false,
  });
  const { t } = useTranslation();
  const { mutate, isPending, isError, isSuccess } = useMutation({
    mutationFn: postEmailToResetPassword,
  });
  const navigate = useNavigate({
    from: "/login",
  });

  const handleError = () => {
    setFieldsError({
      email: !email,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (email) {
      mutate(email);
    }
    handleError();
  };

  const navigateTo = (to: string): void => {
    navigate({
      to,
      from: "/login",
    })
      .then(() => null)
      .catch((err: unknown) => err);
  };

  return (
    <div className="flex h-full w-full items-center justify-center transition-all">
      <div className="h-full w-2/3 max-xl:w-1/2 max-lg:hidden"></div>
      <div className="flex w-1/3 flex-col items-center justify-center gap-4 max-xl:w-1/2 max-lg:w-full px-4">
        <div className="w-full max-w-md">
          <h1 className="mb-6 text-3xl font-bold text-center">
            {t("forgetPage.title")}
          </h1>

          {isSuccess && (
            <div className="mb-4 p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h2 className="text-green-600 dark:text-green-400 text-sm font-bold mb-2">
                {t("forgetPage.successTitle")}
              </h2>
              <p className="text-green-600 dark:text-green-400 text-sm">
                {t("forgetPage.successMessage")}
              </p>
            </div>
          )}

          {isError && !isSuccess && (
            <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <h2 className="text-red-600 dark:text-red-400 text-sm font-medium">
                {t("forgetPage.errorMessage")}
              </h2>
            </div>
          )}

          {!isSuccess && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("forgetPage.placeholderEmail")}
                  className={`${fieldsError.email ? "border-red-500 focus-visible:border-red-500" : ""}`}
                  disabled={isPending}
                  autoComplete="email"
                />
                {fieldsError.email && (
                  <p className="text-red-500 text-xs">
                    {t("forgetPage.emailIsRequired")}
                  </p>
                )}
              </div>

              <Button
                className="w-full bg-zinc-600 text-white hover:bg-zinc-700 disabled:opacity-50"
                type="submit"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  </>
                ) : (
                  t("forgetPage.buttonSendEmail")
                )}
              </Button>
            </form>
          )}
          <Separator className="my-6" />

          <div className="flex justify-end items-center gap-4">
            <Button
              className="bg-transparent border border-zinc-600 text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              variant="outline"
              onClick={() => navigateTo("/login")}
              disabled={isPending}
            >
              {t("forgetPage.backToLogin")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
