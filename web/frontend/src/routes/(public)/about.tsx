import { BUCKET_URL } from '@/utils/constants';
import { stringUtils } from '@/utils/string';
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
    photo: `${BUCKET_URL}/Vanderley+John.png`,
  },
  {
    name: 'Mayara Munaro',
    role: 'Coordenação adjunta',
    photo: `${BUCKET_URL}/Mayara+Munaro.jpg`,
  },
  {
    name: 'Lucas Melchiori Pereira',
    role: 'Liderança plataforma',
    photo: `${BUCKET_URL}/Lucas+M+1.jpg`,
  },
  {
    name: 'Ercília Hirota Pereira',
    role: 'Gestão operacional',
    photo: `${BUCKET_URL}/Ercilia+Hirota+2.png`,
  },
  {
    name: 'Rubiane Antunes',
    role: 'Gestão operacional',
    photo: `${BUCKET_URL}/Rubiane+Antunes.jpg`,
  },
  {
    name: 'Maria Alice Gonzales',
    role: 'Gestão operacional',
    photo: `${BUCKET_URL}/Maria+Alice+Camargo.jpg`,
  },
  {
    name: 'Cassio Oliveira',
    role: 'Pesquisador plataforma',
    photo: `${BUCKET_URL}/Cassio+Oliveira.jpg`,
  },
  {
    name: 'Rhonner Politzer Ramírez Flores',
    role: 'Pesquisador plataforma',
    photo: `${BUCKET_URL}/Rhonner+Politzer+Ram%C3%ADrez+Flores.jpg`,
  },
  {
    name: 'Heloisa Cristina Fernandes',
    role: 'Pesquisadora vedações',
    photo: `${BUCKET_URL}/Heloisa+Cristina+Fernandes.png`,
  },
  {
    name: 'Carolina M. De Freitas M.De Souza',
    role: 'Pesquisadora telhados',
    photo: `${BUCKET_URL}/Carolina+Souza.jpg`,
  },
  {
    name: 'Kamilla Vasconcelos Savasini',
    role: 'Pesquisadora pavimentação',
    photo: `${BUCKET_URL}/Kamilla+Vasconcelos.jpg`,
  },
  {
    name: 'Jean Appel',
    role: 'Pesquisador BIM/IFC',
    photo: `${BUCKET_URL}/Jean+Apel.jpg`,
  },
  {
    name: 'Katia Regina Garcia Punhagui',
    role: 'Pesquisador  mobilização do setor',
    photo: `${BUCKET_URL}/Katia-Punhagui.jpg`,
  },
  {
    name: 'Lucas Caldas',
    role: 'Pesquisador  mobilização do setor',
    photo: `${BUCKET_URL}/Lucas+Caldas+1.jpg`,
  },
  {
    name: 'Karine Hilgenber',
    role: 'Pesquisadora rotas de mitigação',
    photo: `${BUCKET_URL}/Karine+Hilgenberg.jpg`,
  },
  {
    name: 'Arthur Ferreira De Araujo',
    role: 'Pesquisadora rotas de mitigação',
    photo: `${BUCKET_URL}/Arthur+Ferreira.jpg`,
  },

   {
    name: 'Cristina de Hollanda Cavalcanti Tsuha',
    role: 'Pesquisadora difusão e inovação',
    photo: `${BUCKET_URL}/Cristina+Tsuha.jpg`,
  },
   {
    name: 'Zila Maria Garcia Mascarenhas',
    role: 'Pesquisadora difusão e inovação',
    photo: `${BUCKET_URL}/Zila+Garcia.jpg`,
  },
   {
    name: 'Danielly Letícia Rebelatto',
    role: 'Pesquisadora difusão e inovação',
    photo: `${BUCKET_URL}/Danielly+Let%C3%ADcia+Rebelatto+1.jpg`,
  },
   {
    name: 'Manuele Harnisch',
    role: 'Pesquisadora difusão e inovação',
    photo: `${BUCKET_URL}/Manuele+Harnisch.jpg`,
  },
   {
    name: 'Adam Belk',
    role: 'Comitê Consultivo Ferramenta',
    photo: '',
  },
   {
    name: 'Ana Cecília Sestak',
    role: 'Comitê Consultivo Ferramenta',
    photo: '',
  },
   {
    name: 'Carlos Massucato',
    role: 'Comitê Consultivo Ferramenta',
    photo: '',
  },
   {
    name: 'Clarisse Degani',
    role: 'Comitê Consultivo Ferramenta',
    photo: '',
  },
   {
    name: 'Gabriela Lopes Barroso',
    role: 'Gestão da Rotina',
    photo: `${BUCKET_URL}/Gabriela+Lopes+Barroso.jpg`,
  },
   {
    name: 'Jonas Firmino',
    role: 'Administrativo',
    photo: `${BUCKET_URL}/Jonas+Firmino.jpg`,
  },
   {
    name: 'Eder Santin',
    role: 'Jornalista Científico',
    photo: `${BUCKET_URL}/Eder+Santin.jpg`,
  },
   {
    name: 'Felipe Okino',
    role: 'Desenvolvedor',
    photo: `${BUCKET_URL}/Felipe+Okino.png`,
  },
   {
    name: 'Mateus Canali de Miranda',
    role: 'Desenvolvedor',
    photo: `${BUCKET_URL}/Mateus+Miranda.png`,
  },
   {
    name: 'Bruno de Souza Avelino',
    role: 'Desenvolvedor',
    photo: `${BUCKET_URL}/Bruno+Souza.jpg`,
  },
   {
    name: 'Anderson Alvarenga',
    role: 'Desenvolvedor',
    photo: '',
  },
   {
    name: 'Igor Vac',
    role: 'Design UX/UI',
    photo: `${BUCKET_URL}/Igor+Vac.jpg`,
  },
   {
    name: 'Alessandra Petrecca',
    role: 'Design UX/UI',
    photo: `${BUCKET_URL}/Alessandra+Petrecca.jpg`,
  },
   {
    name: 'Bruna Diniz Franqueira',
    role: 'Transparência em Proteção de Dados',
    photo: '',
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
                {member.photo ? <img
                  src={member.photo}
                  alt={member.name}
                  className="w-40 h-40 rounded-full object-cover"
                /> : (
                  <div
                    className="w-40 h-40 rounded-full object-cover bg-gray-400 flex items-center justify-center text-white text-3xl font-bold"
                  >{stringUtils.getInitials(member.name)}</div>
                )}

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
