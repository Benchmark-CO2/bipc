import { useTranslation } from "react-i18next";

const UserActiveWarning = () => {
  const { t } = useTranslation();

  return (
    <div className="w-[calc(100%+48px)] p-2 bg-amber-500 text-white border m-[-24px] mb-4">
      <p className="text-sm">
        <strong>{t("common.activeUserWarning.title")} - </strong>
        {t("common.activeUserWarning.description")}{" "}
        <button className="underline hover:no-underline hover:font-bold font-medium">
          {t("common.activeUserWarning.button")}
        </button>
      </p>
    </div>
  );
};

export default UserActiveWarning;
