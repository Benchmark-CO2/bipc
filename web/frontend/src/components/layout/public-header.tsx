import Logo from "@/assets/logo.svg";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  FlaskConical,
  Headset,
  Info,
  Menu,
  User,
  X
} from "lucide-react";
import { useState } from "react";
import Divider from "../ui/divider";

const activeProps = {
  style: {
    fontWeight: "bold",
  },
};

export default function PublicHeader() {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const NavLinks = () => (
    <>
    <Link
        to={"/about"}
        activeProps={activeProps}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={() => setIsMenuOpen(false)}
      >
        <Info size={18} />
        <span className="text-sm">Sobre o BIPc</span>
      </Link>
       <Divider
        className={cn("h-[28px] w-0.5 my-0", {
          hidden: isMobile,
          "mx-4": !isMobile,
        })}
      />
    <Link
        to="/benchmark"
        activeProps={activeProps}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={() => setIsMenuOpen(false)}
      >
        <BarChart3 size={18} />
        <span className="text-sm">Benchmark</span>
      </Link>
      <Divider
        className={cn("h-[28px] w-0.5 my-0", {
          hidden: isMobile,
          "mx-4": !isMobile,
        })}
      />
      
      <Link
        to={"#" as any}
        activeProps={activeProps}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={() => setIsMenuOpen(false)}
      >
        <FlaskConical size={18} />
        <span className="text-sm">PD&I</span>
      </Link>
      <Link
        to={"/contact"}
        activeProps={activeProps}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={() => setIsMenuOpen(false)}
      >
        <Headset size={18} />
        <span className="text-sm">Comunicação</span>
      </Link>
      <Link
        to={"#" as any}
        activeProps={activeProps}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={() => setIsMenuOpen(false)}
      >
        <Activity size={18} />
        <span className="text-sm">Ações</span>
      </Link>
      <Divider
        className={cn("h-[28px] w-0.5 my-0", {
          hidden: isMobile,
          "mx-4": !isMobile,
        })}
      />
      
      <Link
        to="/login"
        activeProps={activeProps}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={() => setIsMenuOpen(false)}
      >
        <User size={18} />
        <span className="text-sm">Entrar na Plataforma</span>
      </Link>
    </>
  );

  return (
    <nav className="bg-sidebar text-white relative">
      <div className="flex items-center justify-between px-4 md:px-8 py-0">
        <Link to={"/benchmark"} className="p-0">
          <img
            src={Logo}
            alt="Logo"
            className={cn("h-[30px]", {
              "h-[30px]": isMobile,
            })}
          />
        </Link>

        {/* Desktop Navigation */}
        {!isMobile && (
          <div className="flex gap-6 items-center py-2 ml-auto">
            <NavLinks />
          </div>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={toggleMenu}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {isMobile && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 bg-sidebar border-t border-gray-600 transition-all duration-300 ease-in-out z-50",
            {
              "opacity-100 visible": isMenuOpen,
              "opacity-0 invisible": !isMenuOpen,
            }
          )}
        >
          <div className="flex flex-col gap-2 p-4">
            <NavLinks />
          </div>
        </div>
      )}
    </nav>
  );
}
