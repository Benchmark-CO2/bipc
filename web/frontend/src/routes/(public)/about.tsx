import { BUCKET_URL } from "@/utils/constants";
import { stringUtils } from "@/utils/string";
import { createFileRoute } from "@tanstack/react-router";
import aboutImage from "../../assets/city-about.png";
import logoFull from "../../assets/logo_full.svg";
import CAIXA from "../../assets/stackeholders/caixa.png";
import FDTE from "../../assets/stackeholders/fdte.png";
import USP from "../../assets/stackeholders/usp.png";
export const Route = createFileRoute("/(public)/about")({
  component: RouteComponent,
});

const stackeholders = [
  {
    name: "FDTE",
    logo: FDTE,
    website: "https://www.fdte.org.br/",
  },
  {
    name: "USP",
    logo: USP,
    website: "https://www5.usp.br/",
  },
  {
    name: "caixa",
    logo: CAIXA,
    website: "https://www.caixa.gov.br/",
  },
];

const team = [
  {
    name: "Vanderley Moacyr John",
    role: "Coordenação",
    photo: `${BUCKET_URL}/Vanderley+John.png`,
  },
  {
    name: "Mayara Munaro",
    role: "Coordenação adjunta",
    photo: `${BUCKET_URL}/Mayara+Munaro.png`,
  },
  {
    name: "Lucas Melchiori Pereira",
    role: "Liderança plataforma",
    photo: `${BUCKET_URL}/Lucas+Pereira.png`,
  },
  {
    name: "Ercília Hirota Pereira",
    role: "Gestão operacional",
    photo: `${BUCKET_URL}/Erc%C3%ADlia+Pereira.png`,
  },
  {
    name: "Rubiane Antunes",
    role: "Gestão operacional",
    photo: `${BUCKET_URL}/Rubiane+Antunes.png`,
  },
  {
    name: "Maria Alice Gonzales",
    role: "Gestão operacional",
    photo: `${BUCKET_URL}/Maria+Gonzales.png`,
  },
  {
    name: "Cassio Oliveira",
    role: "Pesquisador",
    photo: `${BUCKET_URL}/Cassio+Oliveira.png`,
  },
  {
    name: "Felipe Okino",
    role: "Desenvolvedor",
    photo: `${BUCKET_URL}/Felipe+Okino.png`,
  },
  {
    name: "Mateus Miranda",
    role: "Desenvolvedor",
    photo: `${BUCKET_URL}/Mateus+Miranda.png`,
  },
  {
    name: "Bruno Avelino",
    role: "Desenvolvedor",
    photo: `${BUCKET_URL}/Bruno+Avelino.png`,
  },
  {
    name: "Anderson Alvarenga",
    role: "Desenvolvedor",
    photo: `${BUCKET_URL}/Anderson+Alvarenga.png`,
  },
  {
    name: "Igor Vac",
    role: "Design UX/UI",
    photo: `${BUCKET_URL}/Igor+Vac.png`,
  },
  {
    name: "Alessandra Petrecca",
    role: "Design UX/UI",
    photo: `${BUCKET_URL}/Alessandra+Petrecca.png`,
  },
  {
    name: "Rhonner Politzer Ramírez Flores",
    role: "Pesquisador",
    photo: `${BUCKET_URL}/Rhonner+Flores.png`,
  },
  {
    name: "Heloisa Cristina Fernandes",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Heloisa+Fernandes.png`,
  },
  {
    name: "Carolina M. De Freitas M.De Souza",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Carolina+Souza.png`,
  },
  {
    name: "Kamilla Vasconcelos Savasini",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Kamilla+Savasini.png`,
  },
  {
    name: "Jean Appel",
    role: "Pesquisador",
    photo: `${BUCKET_URL}/Jean+Appel.png`,
  },
  {
    name: "Katia Regina Garcia Punhagui",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Katia+Punhagui.png`,
  },
  {
    name: "Lucas Caldas",
    role: "Pesquisador ",
    photo: `${BUCKET_URL}/Lucas+Caldas.png`,
  },
  {
    name: "Karine Hilgenber",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Karine+Hilgenber.png`,
  },
  {
    name: "Arthur Ferreira De Araujo",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Arthur+Araujo.png`,
  },

  {
    name: "Cristina de Hollanda Cavalcanti Tsuha",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Cristina+Tsuha.png`,
  },
  {
    name: "Zila Maria Garcia Mascarenhas",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Zila+Mascarenhas.png`,
  },
  {
    name: "Danielly Letícia Rebelatto",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Danielly+Rebelatto.png`,
  },
  {
    name: "Manuele Harnisch",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Manuele+Harnisch.png`,
  },
  {
    name: "Abram Belk",
    role: "Comitê Consultivo",
    photo: `${BUCKET_URL}/Abram+Belk.png`,
  },
  {
    name: "Ana Cecília Sestak",
    role: "Comitê Consultivo",
    photo: `${BUCKET_URL}/Ana+Sestak.png`,
  },
  {
    name: "Carlos Massucato",
    role: "Comitê Consultivo",
    photo: `${BUCKET_URL}/Carlos+Massucato.png`,
  },
  {
    name: "Clarisse Degani",
    role: "Comitê Consultivo",
    photo: `${BUCKET_URL}/Clarisse+Degani.png`,
  },
  {
    name: "Gabriela Lopes Barroso",
    role: "Gestão da Rotina",
    photo: `${BUCKET_URL}/Gabriela+Barroso.png`,
  },
  {
    name: "Jonas Firmino",
    role: "Administrativo",
    photo: `${BUCKET_URL}/Jonas+Firmino.png`,
  },
  {
    name: "Eder Santin",
    role: "Jornalista Científico",
    photo: `${BUCKET_URL}/Eder+Santin.png`,
  },
  {
    name: "Bruna Diniz Franqueira",
    role: "Transparência em Proteção de Dados",
    photo: `${BUCKET_URL}/Bruna+Franqueira.png`,
  },
  {
    name: "Lígia Pegorer",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/L%C3%ADgia+Pegorer.png`,
  },
  {
    name: "Talita Silva",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Talita+Silva.png`,
  },
  {
    name: "Gabrielle Gieremek",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Gabrielle+Gieremek.png`,
  },
  {
    name: "Juliana Clark",
    role: "Pesquisadora",
    photo: `${BUCKET_URL}/Juliana+Clark.png`,
  },
];

const TopSection = () => {
  return (
    <section className="flex flex-col lg:flex-row gap-8 lg:gap-0">
      <div className="w-full lg:w-1/2 flex flex-col justify-start items-center gap-6 px-4 sm:px-6 md:px-10">
        <img
          src={logoFull}
          alt="logo completa do BIPC"
          className="max-w-[517px] w-full mb-6 md:mb-14"
        />
        <div className="max-w-[500px] flex flex-col gap-4 md:gap-6 items-center text-sm md:text-base">
          <p>
            Em contraposição à matriz elétrica brasileira, uma das mais limpas
            do mundo, a nossa construção civil é uma importante emissora de CO2,
            representando uma oportunidade de mitigação.
          </p>
          <p>
            Materiais como cimento, o aço e vidro carregam consigo uma pegada de
            carbono significativa para o canteiro de obras, pois já emitiram
            carbono durante a sua produção. Para entender como se dão essas
            emissões nas construções formais e informais precisamos de um
            diagnóstico apurado, que reflita a complexidade da construção civil
            brasileira.
          </p>
          <p>
            Por esse motivo foi desenvolvido o Benchmark Iterativo para Projetos
            de baixo Carbono: a plataforma BIPc – onde é possível estimar o
            consumo de materiais e a pegada de CO2 embutido nas moradias, de
            forma prática, inteligente e escalável. Projetistas e construtoras
            podem comparar o desempenho estimado de seu projeto com o de outros
            projetos já executados.
          </p>

          <p>
            A ferramenta permite à equipe ter uma ideia do impacto de carbono da
            construção na emissao de carbono, verificar em tempo real o
            benchmark dos projetos existentes no mercado e conhecer as
            tendências de evolução das emissões de carbono, tudo antes de
            concluir o projeto.
          </p>

          <p>
            A plataforma integra o processo de projeto à ferramenta de cálculo,
            fornecendo estimativas instantâneas sobre o impacto ambiental de
            cada decisão.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex justify-center items-center px-4 sm:px-6 md:px-10">
        <img
          src={aboutImage}
          alt="imagem sobre o BIPC"
          className="max-w-[520px] w-full"
        />
      </div>
    </section>
  );
};

const StackeholderSection = () => {
  return (
    <section className="w-full md:w-3/4 mt-16 md:mt-30 flex flex-col items-start self-center gap-6 md:gap-10 px-4 sm:px-6 md:px-10">
      <h1 className="text-primary font-semibold text-xl md:text-2xl">
        Realização
      </h1>
      <div className="w-full md:w-3/4 flex flex-wrap justify-center md:justify-between items-center self-center gap-6">
        {stackeholders.map((stakehoder) => (
          <a
            key={stakehoder.name}
            href={stakehoder.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <img
              src={stakehoder.logo}
              alt={`${stakehoder.name} logo`}
              className="h-12 md:h-16"
            />
          </a>
        ))}
      </div>
    </section>
  );
};

const TeamSection = () => {
  return (
    <section className="w-full md:w-5/6 mt-20 md:mt-40 flex flex-col items-start self-center gap-6 md:gap-10 px-4 sm:px-6 md:px-10">
      <h1 className="text-primary font-semibold text-xl md:text-2xl">
        Quem somos?
      </h1>
      <div className="w-full grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-6 sm:gap-8 md:gap-12 lg:gap-16 justify-items-center">
        {team.map((member) => (
          <div
            key={member.name}
            className="flex flex-col items-center gap-3 md:gap-4 w-full max-w-[200px]"
          >
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                className="w-32 h-32 md:w-40 md:h-40 aspect-square rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-32 h-32 md:w-40 md:h-40 aspect-square rounded-full bg-gray-400 flex items-center justify-center text-white text-2xl md:text-3xl font-bold flex-shrink-0">
                {stringUtils.getInitials(member.name)}
              </div>
            )}

            <div className="w-full px-2">
              <h2 className="text-sm md:text-base font-semibold text-center text-primary break-words line-clamp-2">
                {member.name}
              </h2>
              <p className="text-xs sm:text-sm text-primary text-center line-clamp-2">
                {member.role}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
function RouteComponent() {
  return (
    <div className="w-full flex flex-col mt-20 pb-10">
      <TopSection />
      <StackeholderSection />
      <TeamSection />
    </div>
  );
}
