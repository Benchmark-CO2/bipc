import BipcIcon from "@/assets/icons/bipc";
import { Link, useMatches } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

const BreadCrumbs = () => {
  const matches = useMatches({
    select: (matches) => {
      return matches.filter(
        (match) =>
          !!(match as { loaderData?: { crumb?: string } }).loaderData?.crumb,
      );
    },
  });

  const crumbs = matches.map((match) => {
    const { crumb } = match.loaderData as { crumb: string };

    if (crumb === "Empreendimentos") {
      return (
        <div className="w-6 h-6 bg-active rounded-full flex items-center justify-center">
          <BipcIcon className="w-4 h-4" style={{ color: "white" }} />
        </div>
      );
    }

    return crumb;
  });

  const crumbsLength = crumbs.length;

  const crumbsList = crumbs.map((crumb, index) => {
    const isLast = index === crumbsLength - 1;

    return (
      <li
        key={index}
        className="inline-flex items-center justify-between gap-1"
      >
        <Link
          to={matches[index].pathname}
          className={`inline-flex items-center text-sm font-medium ${
            isLast
              ? "text-secondary font-700 dark:text-secondary"
              : "text-zinc-700 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          }`}
        >
          {crumb}
        </Link>
        {index < crumbsLength - 1 && (
          <ChevronRight className="w-4 h-4 text-gray-shade-300 flex-shrink-0" />
        )}
      </li>
    );
  });

  if (crumbs.length <= 1) {
    return null;
  }

  return (
    <nav
      className={`w-full mb-0 flex h-auto items-center ${crumbsList.length > 0 ? "py-4 px-6" : "p-0"}`}
    >
      <ol className="inline-flex items-center md:space-x-1">{crumbsList}</ol>
    </nav>
  );
};

export default BreadCrumbs;
