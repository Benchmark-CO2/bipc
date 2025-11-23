import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TermsOfUse: React.FC = () => {
  return (
    <div className="w-full pr-6 space-y-6 text-justify">
      <section>
        <p className="mb-4">
          Para utilizar a plataforma BIPc – Benchmark Iterativo para Projetos de
          Baixo Carbono, você (USUÁRIO) aceita todas as condições a seguir.
        </p>
        <p className="mb-4">
          O acesso e uso da plataforma poderão ser interrompidos a qualquer
          momento, sem prévio aviso, mas nos comprometemos a sempre te informar
          por meio dos canais de comunicação institucionais.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <h3 className="font-bold text-blue-900 mb-2">
            FICOU COM ALGUMA DÚVIDA?
          </h3>
          <p className="text-blue-800">
            Você pode entrar em contato com nossa equipe pelo canal de
            atendimento indicado no final deste documento. Nossa equipe também
            poderá auxiliar caso você queira exercer seus direitos como titular
            de dados pessoais.
          </p>
        </div>
      </section>

      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="item-1" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            1. O QUE É A PLATAFORMA BIPc?
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              A plataforma BIPc foi desenvolvida para oferecer subsídios a
              projetistas e construtoras para melhorar a emissão de carbono
              embutido da construção, ainda na fase de projeto.
            </p>
            <p>
              Com ela, projetistas e construtoras podem comparar o desempenho
              estimado de seus projetos com o de outros projetos já executados.
              O inventário do Benchmark é importante também para que todo o
              setor e a sociedade organizada tenham um retrato abrangente da
              produção nacional e assim possam definir estratégias setoriais com
              base em dados atuais, transparentes, de fácil acesso e
              compreensão.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            2. O QUE SÃO ESTES TERMOS DE USO?
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              É muito importante que você leia estes termos, que precisam ser
              aceitos por você para usar a plataforma BIPc. Quando você aceita
              as regras apresentadas neste documento, é como se você assinasse
              um contrato com o Conselho Brasileiro de Construção Sustentável
              (CBCS), em que você se compromete a seguir todas essas regras (e
              se compromete juridicamente).
            </p>
            <p>
              Para reforçarmos a confiabilidade dos dados do inventário, a
              segurança dos nossos usuários, permitir edição conjunta de
              projetos e falar com você, o uso da BIPc tem como condição o
              fornecimento de algumas informações, mas não faz nenhuma cobrança
              financeira. Caso não concorde com nossos Termos e Condições de Uso
              e Política de Privacidade e/ou não queira que o CBCS tenha
              qualquer informação sobre você, infelizmente não será possível
              usar a plataforma BIPc, porque seu funcionamento depende do
              compartilhamento de informações.
            </p>
            <p>
              Além disso, ao aceitar estes termos, você se compromete a utilizar
              a plataforma apenas para as finalidades aqui previstas, em
              conformidade com a legislação aplicável.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            3. O QUE PRECISO PARA USAR A PLATAFORMA?
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              Para acessar as funcionalidades da BIPc, é necessário dispor de
              conexão à internet e equipamento compatível ("notebook",
              "smartphone", "desktop", ou "tablet"). Para utilizar adequadamente
              tais funcionalidades, também será preciso:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Criar uma conta de usuário com informações válidas e
                atualizadas;
              </li>
              <li>
                Fornecer dados mínimos necessários para o cadastro e
                autenticação (por exemplo, nome, e-mail, número de documento de
                habilitação profissional e instituição vinculada);
              </li>
              <li>
                Detalhar, de forma precisa e correta, os dados necessários para
                avaliar a pegada de carbono do empreendimento projetado.
              </li>
              <li>
                Respeitar as regras de conduta e segurança digital descritas
                neste documento.
              </li>
              <li>
                Seguir medidas de segurança necessárias para proteger seus
                equipamentos, sistemas e arquivos contra invasões não
                autorizadas de outros usuários da internet.
              </li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            4. O QUE VOCÊ NÃO PODE FAZER E SUAS RESPONSABILIDADES COMO USUÁRIO
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>É proibido utilizar a plataforma BIPc para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violar a legislação vigente ou praticar atos ilícitos;</li>
              <li>
                Produzir, publicar ou compartilhar conteúdos ilegais,
                discriminatórios, difamatórios, obscenos ou que atentem contra
                direitos humanos (por meio do canal de contato, por exemplo);
              </li>
              <li>
                Estimular a prática de atos racistas, LGBTQIA+fóbicos, ou atos
                discriminatórios de qualquer natureza, seja em razão de sexo,
                raça, religião, crença, idade, ideologia ou qualquer outra
                condição;
              </li>
              <li>
                Violar direitos de outras pessoas, como direitos de imagem,
                privacidade, honra: direitos que ao serem violados afetam o seu
                desenvolvimento pleno, sua autonomia;
              </li>
              <li>
                Tentar obter acesso não autorizado a contas, bases de dados ou
                sistemas da BIPc;
              </li>
              <li>
                Revisar o código do site para fins comerciais, não previamente
                autorizados pela licença utilizada pela BIPc;
              </li>
              <li>
                Violar direitos de propriedade intelectual dos controladores ou
                de terceiros;
              </li>
              <li>
                Utilizar os dados obtidos na plataforma para finalidades
                difamatórias, ilegais, de reidentificação ou engenharia de
                dados;
              </li>
              <li>
                Compartilhar informações de projetos de terceiros ou usar os
                dados agregados de benchmark de forma indevida;
              </li>
              <li>
                Publicar ou produzir conteúdo falsos, inexatos, exagerados ou
                mentir sobre a época/data que o projeto foi elaborado, de forma
                que possa promover distorções na base de dados;
              </li>
              <li>
                Violar o sigilo das comunicações - seja por tentativa de ataque
                ou invasão de máquinas alheias.
              </li>
            </ul>
            <p>
              O USUÁRIO não pode coletar dados pessoais de outras pessoas sem
              alguma autorização para realizar as atividades com esses dados, e
              não pode interferir no uso da BIPc por parte de outras pessoas
              usuárias.
            </p>
            <p>
              O USUÁRIO é responsável pelas informações que fornece, devendo
              garantir que sejam verídicas, atualizadas e adequadas à finalidade
              proposta.
            </p>
            <p>
              É expressamente vedada a criação, inserção ou simulação de dados
              falsos, fictícios, aleatórios ou manipulados no sistema da
              plataforma BIPc, especialmente aqueles que possam:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                gerar divergências, discrepâncias, inconsistências ou
                imprecisões nas informações consolidadas;
              </li>
              <li>
                enviesar os resultados ou comprometer a representatividade
                estatística do modelo de benchmark interativo;
              </li>
              <li>
                distorcer comparações, análises ou indicadores gerados pela
                aplicação;
              </li>
              <li>
                ou prejudicar a credibilidade, integridade e finalidade
                científica e técnica da ferramenta.
              </li>
            </ul>
            <p>
              A inserção intencional de dados inverídicos constitui violação
              grave destes Termos de Uso e poderá acarretar suspensão ou
              exclusão do acesso à plataforma, eliminação dos dados inseridos e,
              se aplicável, comunicação aos controladores e autoridades
              competentes.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-5" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            5. COMO CUIDAMOS DOS SEUS DADOS E DOS DADOS DOS PROJETOS?
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              O CBCS é responsável por proteger os dados pessoais e técnicos
              coletados pela plataforma, conforme a legislação de proteção de
              dados e demais legislações aplicáveis, aos dados que não possuam
              natureza pessoal. Além disso, o CBCS reforça o compromisso com o
              sigilo e confidencialidade das informações oferecidas pelos
              USUÁRIOS na plataforma BIPc.
            </p>
            <p>
              Para maiores informações sobre o tratamento de dados pessoais,
              acesse nossa política de privacidade por meio do link:
              bipc.org.br/privacidade
            </p>
            <h4 className="font-bold text-primary mt-4">
              SOBRE OS DADOS DOS PROJETO DE CONSTRUÇÃO INCLUÍDOS NA PLATAFORMA
            </h4>
            <p>
              Os dados referentes aos projetos cadastrados (como consumo de
              materiais, estimativas de carbono e demais métricas) são
              utilizados apenas de forma agregada para viabilizar o cálculo e a
              exibição do benchmark comparativo entre diferentes
              empreendimentos.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
              <p className="font-bold text-yellow-900 mb-2">IMPORTANTE:</p>
              <p className="text-yellow-800">
                Os dados não agregados dos projetos não são disponibilizados a
                outros usuários da plataforma. As comparações e análises
                visíveis no sistema são sempre baseadas em dados anonimizados e
                estatisticamente agregados, sem permitir a identificação de
                projetos específicos.
              </p>
            </div>
            <p>
              Os dados de projetos poderão ser mantidos mesmo após a exclusão da
              conta do usuário, exclusivamente para fins de modelagem,
              estatísticas e previsões sobre a pegada de carbono da construção
              civil. Os dados pessoais do usuário, entretanto, serão eliminados
              quando encerrada sua conta.
            </p>
            <p>
              O USUÁRIO poderá, a qualquer tempo, solicitar o cancelamento do
              seu acesso à Plataforma, encaminhando e-mail específico para
              contato@bipc.org.br.
            </p>
            <p>
              Caso o USUÁRIO realize tal cancelamento do acesso à Plataforma,
              conforme procedimento descrito no item acima, sua efetivação
              ocorrerá em até 7 (sete) dias úteis, podendo estar sujeito à
              verificação de autenticidade. Neste caso, a plataforma BIPc poderá
              requerer documentos adicionais, como cópia de documentos de
              identificação.
            </p>
            <h4 className="font-bold text-primary mt-4">
              MEDIDAS DE CONFIRMAÇÃO DE DADOS:
            </h4>
            <p>
              A fim de verificar a confiabilidade dos dados, após 1 (um) ano do
              fim de cada etapa do projeto, o usuário poderá ser contactado para
              fins de verificações aleatórias a respeito dos dados do projeto. O
              objetivo é garantir maior confiabilidade do benchmark interativo,
              por meio da confirmação, na etapa de construção, dos dados
              informados ainda em fase do projeto: ou seja, verificar se, na
              prática, os dados projetados foram executados.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-6" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            6. QUAIS AS IMPLICAÇÕES DO DIREITO DE PROPRIEDADE INTELECTUAL?
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              Todos os direitos sobre marcas, logotipos, e demais elementos
              visuais associados à BIPc são de titularidade do CBCS e seus
              patrocinadores, apoiadores ou financiadores (como Caixa Econômica
              Federal, Fundação para o Desenvolvimento Tecnológico da Engenharia
              e Universidade Estadual de São Paulo-USP) ou de seus
              licenciadores.
            </p>
            <p>
              A plataforma BIPc possui licença da categoria Copyleft, para
              incentivar a redistribuição e modificação da plataforma, com fins
              de promoção de melhorias e revisão das métricas e metodologias
              utilizadas. A reutilização busca favorecer o reuso pela comunidade
              para proporcionar uma plataforma com melhor experiência e
              resultados mais confiáveis a respeito da pegada de carbono
              envolvida em projetos. As melhorias são desejáveis, para que haja
              maior confiabilidade nos dados oferecidos por meio do benchmark
              interativo. É vedada a reutilização para fins comerciais e/ou que
              comprometam o caráter aberto da plataforma.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-7" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            7. O QUE NÃO É RESPONSABILIDADE DA BIPc?
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              Os controladores e a entidade operadora não se responsabilizam
              por:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Interrupções, falhas técnicas ou indisponibilidade da plataforma
                causadas por terceiros ou por eventos fora de seu controle;
              </li>
              <li>
                Danos diretos ou indiretos resultantes da interpretação ou uso
                inadequado das informações apresentadas;
              </li>
              <li>
                Alterações indevidas realizadas pelo usuário em seus próprios
                dados ou projetos;
              </li>
              <li>
                Consequências decorrentes de uso indevido ou não autorizado da
                plataforma.
              </li>
            </ul>
            <p>
              As estimativas e benchmarks apresentados pela plataforma BIPc são
              geradas a partir de modelagens estatísticas, cuja interatividade
              se dá com base em dados informados pelos usuários. Esses
              resultados têm caráter exclusivamente informativo e indicativo,
              não constituindo garantia técnica, contratual ou legal de
              desempenho real das obras.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-8" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            8. QUAL É O PRAZO, A VIGÊNCIA E COMO FUNCIONAM AS ATUALIZAÇÕES DOS
            TERMOS DE USO?
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              O presente instrumento tem vigência indeterminada e poderá ser
              rescindido a qualquer momento. Os controladores poderão atualizar
              estes Termos de Uso a qualquer momento. As alterações serão
              informadas aos usuários por meio da própria plataforma, sempre que
              possível, e entrarão em vigor na data de sua publicação.
            </p>
            <p>
              A interrupção da plataforma BIPc deverá ser comunicada aos
              USUÁRIOS com uma antecedência mínima de 30 (trinta) dias, com
              exceção de hipóteses de falha técnica que não o CBCS não tenha
              dado causa.
            </p>
            <p>
              A BIPc poderá interromper, a qualquer momento, o acesso de
              usuários que violarem esses Termos de Uso ou descumpram a
              legislação nacional. A suspensão ou exclusão de conta poderá
              ocorrer após notificação ao USUÁRIO, salvo em casos de uso
              fraudulento ou ilícito, em que o bloqueio será imediato
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-9" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            9. CANAL DE ATENDIMENTO E DÚVIDAS SOBRE A FERRAMENTA
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              Para dúvidas, solicitações ou pedidos relacionados a esses termos
              de uso, entre em contato com o canal de atendimento indicado
              abaixo:
            </p>
            <p className="font-semibold">E-mail: contato@bipc.org.br</p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-10" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-bold text-primary hover:no-underline">
            10. DADOS DE IDENTIFICAÇÃO DAS PESSOAS JURÍDICAS RESPONSÁVEIS PELA
            PLATAFORMA
          </AccordionTrigger>
          <AccordionContent className="text-justify space-y-4 pt-2">
            <p>
              A plataforma BIPc é gerida pelo Conselho Brasileiro de Construção
              Sustentável, inscrita sob o CNPJ nº 08.924.551/0001-53 com
              endereço em Avenida Queiroz Filho, 1700 – Torre B Conj. 407 –
              Bairro Vila Hamburguesa – São Paulo – SP – CEP:05319-000.
            </p>
            <p>
              Este termo de uso será regido, interpretada e executada de acordo
              com as Leis da República Federativa do Brasil, incluindo a Lei nº
              12.965/2014 (Marco Civil da Internet) e a Lei nº 13.709/2018 (Lei
              Geral de Proteção de Dados Pessoais), independentemente das Leis
              de outros estados ou Países, sendo competente o foro da cidade de
              São Paulo, São Paulo, para dirimir qualquer dúvida decorrente
              deste documento.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="text-sm italic text-gray-600 mt-8">
        <p>Versão 1.0</p>
        <p>Última atualização: 03 de novembro de 2025</p>
      </div>
    </div>
  );
};

export default TermsOfUse;
