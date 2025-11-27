import Instagram from "@/assets/instagram.svg";
import Linkedin from "@/assets/linkedin.svg";
import FullLogo from "@/assets/logo_full.svg";
import Youtube from "@/assets/youtube.svg";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { FormEvent, useState } from "react";

export const Route = createFileRoute("/(public)/contact")({
  component: RouteComponent,
});

function RouteComponent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [approved, setApproved] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const mailtoLink = `mailto:contato@bipc.org.br?subject=${encodeURIComponent(
      subject || "Contato via site"
    )}&body=${encodeURIComponent(
      `Nome: ${name}\nE-mail: ${email}\n\nMensagem:\n${message}`
    )}`;

    window.location.href = mailtoLink;
  };

  const formIsCompleted = name && email && message && approved;
  return (
    <div className="w-full flex justify-center">
      {/* Constrain overall content width and add horizontal padding */}
      <div className="w-full max-w-6xl px-6 lg:px-12 py-12 flex flex-col lg:flex-row items-stretch gap-8">
        {/* Left column: Logo + social icons */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center lg:items-start">
          <img
            src={FullLogo}
            alt="BIPc logo"
            className="w-full max-w-[420px] lg:max-w-[480px] select-none"
            draggable={false}
          />

          <div className="mt-8 flex flex-col items-center lg:items-start gap-6">
            <div className="flex gap-4 items-center">
              <a href="#" aria-label="Linkedin">
                <img
                  src={Linkedin}
                  alt="Linkedin"
                  className="w-10 h-10 cursor-pointer select-none"
                  draggable={false}
                />
              </a>
              <a href="#" aria-label="Youtube">
                <img
                  src={Youtube}
                  alt="Youtube"
                  className="w-10 h-10 cursor-pointer select-none"
                  draggable={false}
                />
              </a>
              <a href="#" aria-label="Instagram">
                <img
                  src={Instagram}
                  alt="Instagram"
                  className="w-10 h-10 cursor-pointer select-none"
                  draggable={false}
                />
              </a>
            </div>

            <div className="text-sm text-muted-foreground">
              e-mail: contato@bipc.org.br
            </div>
          </div>
        </div>

        {/* Right column: form. On large screens show a subtle vertical divider to the left */}
        <div className="w-full lg:w-1/2 flex items-center">
          <div className="w-full lg:pl-12 lg:border-l lg:border-gray-200">
            <h1 className="text-3xl md:text-4xl text-primary font-bold mb-8">
              Fale conosco
            </h1>

            <form className="w-full max-w-lg" onSubmit={handleSubmit}>
              <label className="block mb-4">
                <span className="text-sm text-muted-foreground block mb-1">
                  Nome
                </span>
                <Input
                  className="w-full"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>

              <label className="block mb-4">
                <span className="text-sm text-muted-foreground block mb-1">
                  E-mail
                </span>
                <Input
                  className="w-full"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="block mb-4">
                <span className="text-sm text-muted-foreground block mb-1">
                  Assunto
                </span>
                <Input
                  className="w-full"
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </label>

              <label className="block mb-4">
                <span className="text-sm text-muted-foreground block mb-1">
                  Mensagem
                </span>
                <Textarea
                  className="w-full min-h-40"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </label>

              <label className="mb-4 flex gap-2">
                <Checkbox checked={approved} onClick={() => setApproved(res => !res)} />

                <span className="text-sm text-muted-foreground block mb-1">
                  Eu declaro estar ciente de que os dados informados no formulário de contato somente poderão ser usados para permitir a resposta à demanda
                </span>
              </label>

              <Button type="submit" variant={"default"} className="w-full" disabled={!formIsCompleted}>
                Enviar
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
