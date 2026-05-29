import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import kilomatLogo from "@/assets/kilomat-wordmark.png";
import { SEO } from "@/components/SEO";

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Política de Privacidade — Kilomat"
        description="Política de privacidade da Kilomat: que dados recolhemos no pedido de orçamento, como os tratamos e quais os seus direitos enquanto titular."
        path="/politica-de-privacidade"
      />
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={kilomatLogo} alt="Kilomat Logo" className="h-16 w-auto drop-shadow-md" />
          </div>
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Política de Privacidade
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão em vigor a partir de: 24/04/2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              1. Identificação do Responsável pelo Tratamento
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A presente Política de Privacidade é emitida por{" "}
              <strong className="text-foreground">Kilomat - Materiais para Construção, Lda.</strong>, 
              pessoa coletiva com o NIPC <strong className="text-foreground">508086140</strong>,{" "}
              com sede em{" "}
              <strong className="text-foreground">
                Estrada do Pau Queimado, Zona Industrial Pau Queimado, Afonsoeiro, 2870-100 Montijo
              </strong>{" "}
              (doravante "Kilomat", "nós" ou "empresa"), enquanto Responsável pelo Tratamento 
              dos dados pessoais nos termos do Regulamento (UE) 2016/679 (RGPD) e da Lei n.º 58/2019, de 8 de agosto.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Contacto do Encarregado da Proteção de Dados (DPO):</strong>{" "}
              <a href="mailto:info@kilomat.pt" className="text-primary hover:underline">info@kilomat.pt</a>{" "}
              · <a href="tel:+351938283386" className="text-primary hover:underline">+351 938 283 386</a>
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              2. Âmbito de Aplicação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Esta Política de Privacidade aplica-se ao tratamento de dados pessoais recolhidos 
              através do website <a href="https://kilomat.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">kilomat.pt</a>{" "}
              e nas interações comerciais com a Kilomat, incluindo pedidos de orçamento, 
              comunicações e eventuais contratos.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              3. Dados Pessoais que Tratamos
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Podemos recolher e tratar as seguintes categorias de dados pessoais:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Dados de identificação e contacto:</strong>{" "}
                Nome, email, número de telefone, morada (quando necessário para orçamentos com entrega);
              </li>
              <li>
                <strong className="text-foreground">Dados de navegação:</strong>{" "}
                Endereço IP, tipo de browser, sistema operativo, páginas visitadas, data e hora do acesso 
                (através de cookies — consulte a nossa <Link to="/politica-de-cookies" className="text-primary hover:underline">Política de Cookies</Link>);
              </li>
              <li>
                <strong className="text-foreground">Dados comerciais:</strong>{" "}
                Histórico de pedidos de orçamento, propostas enviadas, preferências de produtos;
              </li>
              <li>
                <strong className="text-foreground">Dados de faturação:</strong>{" "}
                NIF, morada de faturação, dados bancários (quando aplicável).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              4. Finalidades do Tratamento e Base Legal
            </h2>
            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-semibold text-foreground">Finalidade</th>
                    <th className="text-left p-3 font-semibold text-foreground">Base Legal</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border">
                    <td className="p-3">Processar e responder a pedidos de orçamento</td>
                    <td className="p-3">Execução de pré-contrato / contrato (art. 6.º, n.º 1, al. b) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Comunicações relacionadas com propostas comerciais</td>
                    <td className="p-3">Interesse legítimo (art. 6.º, n.º 1, al. f) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Cumprimento de obrigações legais e fiscais</td>
                    <td className="p-3">Obrigação legal (art. 6.º, n.º 1, al. c) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Envio de newsletters ou comunicações de marketing (com consentimento prévio)</td>
                    <td className="p-3">Consentimento (art. 6.º, n.º 1, al. a) RGPD)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">Melhorar a experiência do utilizador e segurança do website</td>
                    <td className="p-3">Interesse legítimo (art. 6.º, n.º 1, al. f) RGPD)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              5. Destinatários dos Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os seus dados pessoais podem ser comunicados a:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Autoridades públicas:</strong>{" "}
                Autoridade Tributária, Autoridade de Segurança Alimentar e Económica (ASAE), 
                Comissão Nacional de Proteção de Dados (CNPD), quando legalmente obrigatório;
              </li>
              <li>
                <strong className="text-foreground">Fornecedores de serviços:</strong>{" "}
                Empresas de transporte (para entregas), serviços de contabilidade, 
                prestadores de serviços de TI (hospedagem, email, armazenamento cloud) — 
                apenas quando necessário para a execução do contrato e com obrigações contratuais de confidencialidade;
              </li>
              <li>
                <strong className="text-foreground">Instituições bancárias:</strong>{" "}
                Para processamento de pagamentos (quando aplicável).
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os dados <strong className="text-foreground">não são vendidos</strong> a terceiros nem 
              utilizados para fins de marketing de terceiros sem consentimento expresso.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              6. Transferências Internacionais de Dados
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Alguns dos nossos subcontratados (serviços de cloud, email) podem estar localizados 
              fora do Espaço Económico Europeu (EEE). Nesses casos, garantimos que:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>O país destino é reconhecido pela Comissão Europeia como oferecendo nível adequado de proteção; ou</li>
              <li>São implementadas salvaguardas contratuais aprovadas (Cláusulas Contratuais Tipo da Comissão Europeia); ou</li>
              <li>O subcontratado está certificado no âmbito do Privacy Shield (quando aplicável).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              7. Prazos de Conservação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os dados pessoais são conservados apenas pelo tempo estritamente necessário 
              à prossecução das finalidades para que foram recolhidos:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Pedidos de orçamento não concretizados:</strong>{" "}
                Até 2 anos após o último contacto, para fins de histórico comercial;
              </li>
              <li>
                <strong className="text-foreground">Clientes com contrato:</strong>{" "}
                Duração do contrato + 10 anos (obrigações fiscais e contabilísticas);
              </li>
              <li>
                <strong className="text-foreground">Dados de faturação:</strong>{" "}
                10 anos (obrigação legal fiscal);
              </li>
              <li>
                <strong className="text-foreground">Consentimentos de marketing:</strong>{" "}
                Até revogação do consentimento ou 5 anos após inatividade;
              </li>
              <li>
                <strong className="text-foreground">Dados de navegação (cookies):</strong>{" "}
                Conforme indicado na <Link to="/politica-de-cookies" className="text-primary hover:underline">Política de Cookies</Link>.
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Após os prazos indicados, os dados são eliminados ou anonimizados de forma segura.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              8. Os Seus Direitos
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nos termos do RGPD, enquanto titular dos dados, tem o direito de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
              <li>
                <strong className="text-foreground">Acesso (art. 15.º RGPD):</strong>{" "}
                Obter confirmação sobre se os seus dados estão a ser tratados, 
                aceder aos dados e receber informações sobre o tratamento;
              </li>
              <li>
                <strong className="text-foreground">Retificação (art. 16.º RGPD):</strong>{" "}
                Corrigir dados inexatos ou completar dados incompletos;
              </li>
              <li>
                <strong className="text-foreground">Apagamento ("Direito ao Esquecimento", art. 17.º RGPD):</strong>{" "}
                Solicitar a eliminação dos seus dados, quando aplicável 
                (ex.: dados desnecessários, consentimento retirado, oposição legitimada);
              </li>
              <li>
                <strong className="text-foreground">Limitação do tratamento (art. 18.º RGPD):</strong>{" "}
                Solicitar a restrição do tratamento em determinadas situações 
                (ex.: contestação da exatidão dos dados);
              </li>
              <li>
                <strong className="text-foreground">Portabilidade (art. 20.º RGPD):</strong>{" "}
                Receber os seus dados num formato estruturado, de uso comum e leitura automática, 
                ou solicitar a transmissão direta a outro responsável (quando tecnicamente viável);
              </li>
              <li>
                <strong className="text-foreground">Oposição (art. 21.º RGPD):</strong>{" "}
                Opor-se ao tratamento baseado em interesses legítimos, 
                incluindo definição de perfis (profiling);
              </li>
              <li>
                <strong className="text-foreground">Retirar o consentimento (art. 7.º, n.º 3, RGPD):</strong>{" "}
                A qualquer momento, sem afetar a licitude do tratamento anterior;
              </li>
              <li>
                <strong className="text-foreground">Não ser sujeito a decisões automatizadas (art. 22.º RGPD):</strong>{" "}
                Incluindo definição de perfis, que produzam efeitos jurídicos ou significativos 
                (a Kilomat não utiliza este tipo de processamento).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              9. Como Exercer os Seus Direitos
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Para exercer qualquer dos seus direitos, pode contactar-nos através de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Email:</strong>{" "}
                <a href="mailto:info@kilomat.pt" className="text-primary hover:underline">info@kilomat.pt</a>{" "}
                (assunto: "Dados Pessoais")
              </li>
              <li>
                <strong className="text-foreground">Correio:</strong>{" "}
                Kilomat - Materiais para Construção, Lda. · Estrada do Pau Queimado, 
                Zona Industrial Pau Queimado, 2870-100 Montijo
              </li>
              <li>
                <strong className="text-foreground">Telefone:</strong>{" "}
                <a href="tel:+351938283386" className="text-primary hover:underline">+351 938 283 386</a>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O pedido deve identificar claramente o direito que pretende exercer. 
              Responderemos no prazo de <strong className="text-foreground">30 dias</strong>, 
              prorrogáveis para 60 dias em casos complexos. A resposta é gratuita, 
              salvo pedidos manifestamente infundados ou excessivos.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              10. Direito de Reclamação
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Se considerar que o tratamento dos seus dados viola o RGPD, tem o direito de 
              apresentar uma reclamação à autoridade de controlo:
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong className="text-foreground">Comissão Nacional de Proteção de Dados (CNPD)</strong><br />
              Av. D. Carlos I, 134, 1.º · 1200-651 Lisboa · Portugal<br />
              Tel: <a href="tel:+351213928400" className="text-primary hover:underline">+351 213 928 400</a><br />
              Email: <a href="mailto:geral@cnpd.pt" className="text-primary hover:underline">geral@cnpd.pt</a><br />
              Website: <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnpd.pt</a>
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              11. Medidas de Segurança
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A Kilomat implementa medidas técnicas e organizativas adequadas para proteger 
              os dados pessoais contra:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Acesso não autorizado, alteração ou divulgação;</li>
              <li>Destruição acidental ou ilícita;</li>
              <li>Perda acidental ou ilícita.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              As medidas incluem: encriptação de dados sensíveis, acesso restrito a pessoal 
              autorizado, políticas de passwords seguras, backups regulares e auditorias periódicas.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Em caso de violação de dados pessoais (data breach), notificaremos a CNPD no prazo 
              de 72 horas, conforme obrigação legal, e os titulares afetados quando houver risco 
              elevado para os seus direitos e liberdades.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              12. Menores de Idade
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os nossos serviços não se destinam a menores de 16 anos. Não recolhemos intencionalmente 
              dados pessoais de menores. Se tiver conhecimento de que um menor nos forneceu dados pessoais, 
              contacte-nos imediatamente para que possamos eliminá-los.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              13. Alterações a esta Política
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A Kilomat reserva-se o direito de alterar esta Política de Privacidade a qualquer momento, 
              nomeadamente para refletir alterações legislativas, tecnológicas ou na organização da empresa. 
              As alterações serão publicadas nesta página com a data de atualização indicada no topo.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Recomendamos a consulta regular desta página. A continuação da utilização dos nossos 
              serviços após alterações implica a aceitação da nova versão.
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-10 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">Kilomat — Catálogo Online de Materiais de Construção</p>
            <p className="text-xs text-muted-foreground">
              <a href="https://kilomat.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                kilomat.pt
              </a>{" "}
              | Atualizado em 24/04/2026
            </p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Kilomat - Materiais para Construção, Lda. — NIF: 508086140
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PoliticaPrivacidade;
