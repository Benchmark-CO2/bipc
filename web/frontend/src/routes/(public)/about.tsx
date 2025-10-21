import { createFileRoute } from "@tanstack/react-router";
import aboutImage from "../../assets/city-about.png";
import logoFull from "../../assets/logo_full.svg";
import CAIXA from '../../assets/stackeholders/caixa.png';
import FDTE from '../../assets/stackeholders/fdte.png';
import USP from '../../assets/stackeholders/usp.png';
export const Route = createFileRoute("/(public)/about")({
  component: RouteComponent,
});

const stackeholders = [
  {
    name: 'FDTE',
    logo: FDTE,
    website: 'https://www.fdte.org.br/',
  },
  {
    name: 'USP',
    logo: USP,
    website: 'https://www5.usp.br/',
  },
  {
    name: "caixa",
    logo: CAIXA,
    website: "https://www.caixa.gov.br/",
  },
  
]

const team = [
  {
    name: 'Vanderley Moacyr John',
    role: 'Coordenação',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Mayara Munaro',
    role: 'Coordenação adjunta',
    photo: 'link-ou-caminho-para-foto-2',
  },
  {
    name: 'Lucas Melchiori Pereira',
    role: 'Liderança plataforma',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Ercília Hirota Pereira',
    role: 'Gestão operacional',
    photo: 'link-ou-caminho-para-foto-2',
  },
  {
    name: 'Rubiane Antunes',
    role: 'Gestão operacional',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Maria Alice Gonzales',
    role: 'Gestão operacional',
    photo: 'link-ou-caminho-para-foto-2',
  },
  {
    name: 'Cassio Oliveira',
    role: 'Pesquisador plataforma',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Rhonner Politzer Ramírez Flores',
    role: 'Pesquisador plataforma',
    photo: 'link-ou-caminho-para-foto-2',
  },
  {
    name: 'Heloisa Cristina Fernandes',
    role: 'Pesquisadora vedações',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Carolina M. De Freitas M.De Souza',
    role: 'Pesquisadora telhados',
    photo: 'link-ou-caminho-para-foto-2',
  },
  {
    name: 'Kamilla Vasconcelos Savasini',
    role: 'Pesquisadora pavimentação',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Jean Appel',
    role: 'Pesquisador BIM/IFC',
    photo: 'link-ou-caminho-para-foto-2',
  },
  {
    name: 'Katia Regina Garcia Punhagui',
    role: 'Pesquisador  mobilização do setor',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Lucas Caldas',
    role: 'Pesquisador  mobilização do setor',
    photo: 'link-ou-caminho-para-foto-2',
  },
  {
    name: 'Karine Hilgenber',
    role: 'Pesquisadora rotas de mitigação',
    photo: 'link-ou-caminho-para-foto-1',
  },
  {
    name: 'Arthur Ferreira De Araujo',
    role: 'Pesquisadora rotas de mitigação',
    photo: 'link-ou-caminho-para-foto-2',
  },

   {
    name: 'Cristina de Hollanda Cavalcanti Tsuha',
    role: 'Pesquisadora difusão e inovação',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Zila Maria Garcia Mascarenhas',
    role: 'Pesquisadora difusão e inovação',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Danielly Letícia Rebelatto',
    role: 'Pesquisadora difusão e inovação',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Manuele Harnisch',
    role: 'Pesquisadora difusão e inovação',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Adam Belk',
    role: 'Comitê Consultivo Ferramenta',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Ana Cecília Sestak',
    role: 'Comitê Consultivo Ferramenta',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Carlos Massucato',
    role: 'Comitê Consultivo Ferramenta',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Clarisse Degani',
    role: 'Comitê Consultivo Ferramenta',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Gabriela',
    role: 'role',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Jonas',
    role: 'role',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Eder',
    role: 'role',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Felipe Okino',
    role: 'Desenvolvedor',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Mateus Canali de Miranda',
    role: 'Desenvolvedor',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Bruno de Souza Avelino',
    role: 'Desenvolvedor',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Anderson Alves Alcará',
    role: 'Desenvolvedor',
    photo: 'link-ou-caminho-para-foto-2',
  },
   {
    name: 'Igor',
    role: 'Design UX/UI',
    photo: 'link-ou-caminho-para-foto-2',
  },
]

const TopSection = () => {
  return (
    <section className='flex'>
      <div className="w-1/2 flex flex-col justify-start items-center gap-6 px-10">
        <img
          src={logoFull}
          alt="logo completa do BIPC"
          className="max-w-[517px] w-full mb-14"
        />
        <div className="max-w-[500px] flex flex-col gap-6 items-center ">
          <p>
            No Brasil, onde a matriz elétrica está entre as mais limpas do
            mundo, estudos mostram que a construção civil é uma importante
            emissora de CO2. Ignorar isso é como deixar escapar uma oportunidade
            de mitigação.  
          </p>
          <p>
            Materiais como concreto, o aço e vidro carregam consigo uma pegada
            de carbono significativa para o canteiro de obras, pois já emitiram
            carbono durante a sua produção. Para entender como se dão essas
            emissões nas construções formais precisamos de um diagnóstico
            apurado, que reflita a complexidade da construção civil brasileira.
          </p>

          <p>
            Por esse motivo foi desenvolvido o Benchmark Iterativo para Projetos
            de baixo Carbono: a plataforma BIPc – onde é possível estimar o
            consumo de materiais e a pegada de CO2 embutido nas moradias, de
            forma prática, inteligente e escalável. Projetistas e construtoras
            podem comparar o desempenho estimado de seu projeto com outros
            projetos já executados no setor.
          </p>

          <p>
            A ferramenta permite à equipe ter uma ideia do impacto de carbono,
            verificar em tempo real o benchmark dos projetos existentes no
            mercado, e saber as tendências de evolução das emissões de carbono,
            tudo antes de concluir o projeto.
          </p>

          <p>
            A plataforma integra o processo de projeto à ferramenta de cálculo,
            fornecendo estimativas instantâneas sobre o impacto ambiental de
            cada decisão.
          </p>
        </div>
      </div>
      <div className="w-1/2 flex justify-center items-center">
        <img
          src={aboutImage}
          alt="imagem sobre o BIPC"
          className="max-w-[520px]"
        />
      </div>
    </section>
  );
};

const StackeholderSection = () => {
  return (
    <section className='w-3/4 mt-30 flex flex-col items-start self-center gap-10 px-10'>
        <h1 className='text-primary font-semibold text-2xl'>Realização</h1>
        <div className='w-3/4 flex justify-between items-center self-center'>
          {stackeholders.map((stakehoder) => (
            <a 
              key={stakehoder.name} 
              href={stakehoder.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mr-6 mt-4"
            >
              <img 
                src={stakehoder.logo} 
                alt={`${stakehoder.name} logo`} 
                className="h-16"
              />
            </a>
          ))}
        </div>
      </section>
  )
};

const TeamSection = () => {
  return (
    <section className='w-3/4 mt-40 flex flex-col items-start self-center gap-10 px-10'>
        <h1 className='text-primary font-semibold text-2xl'>Quem somos?</h1>
        <div className='w-full grid grid-cols-4 gap-16'>
          {
            team.map((member) => (
              <div key={member.name} className="flex flex-col items-center gap-4 mb-6 ">
                {/* <img
                  src={member.photo}
                  alt={member.name}
                  className="w-40 h-40 rounded-full object-cover"
                /> */}
                <div
                  className="w-40 h-40 rounded-full object-cover bg-gray-400"
                />
                <div>
                  <h2 className="text-base font-semibold text-center text-primary">{member.name}</h2>
                  <p className="text-primary text-center">{member.role}</p>
                </div>
              </div>
            ))
          }
        </div>
      </section>
  )
}
function RouteComponent() {
  return (
    <div className="w-full flex flex-col mt-40">
      <TopSection />
      <StackeholderSection />
      <TeamSection />
    </div>
  );
}
