import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import vrcfLogo from "@/assets/vrcf-logo.png";

const PoliticaCookies = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={vrcfLogo} alt="VRCF Logo" className="h-16 w-auto drop-shadow-md" />
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
            Política de Cookies
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão em vigor a partir de: 27/03/2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              1. O que são Cookies?
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo (computador, tablet ou telemóvel) 
              quando visita um website. Os cookies permitem que o website reconheça o seu dispositivo e memorize informações 
              sobre a sua visita, como as suas preferências, facilitando a sua navegação e tornando-a mais útil.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              2. Quem é o Responsável pelo Tratamento?
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O responsável pelo tratamento dos dados recolhidos através de cookies é a{" "}
              <strong className="text-foreground">VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</strong>, 
              com o NIF <strong className="text-foreground">515237205</strong> (doravante "VRCF"), 
              acessível em{" "}
              <a href="https://showroom.vrcf.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                showroom.vrcf.info
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              3. Que Cookies Utilizamos?
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O nosso catálogo online utiliza os seguintes tipos de cookies:
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">3.1 Cookies Estritamente Necessários</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Estes cookies são essenciais para o funcionamento do website e não podem ser desativados. São utilizados para:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Manter a sua sessão de navegação ativa;</li>
              <li>Guardar as suas preferências de consentimento de cookies;</li>
              <li>Garantir a segurança e integridade do website.</li>
            </ul>

            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-semibold text-foreground">Cookie</th>
                    <th className="text-left p-3 font-semibold text-foreground">Finalidade</th>
                    <th className="text-left p-3 font-semibold text-foreground">Duração</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border">
                    <td className="p-3 font-mono text-xs">vrcf_cookie_consent</td>
                    <td className="p-3">Armazena a sua escolha de consentimento de cookies</td>
                    <td className="p-3">365 dias</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3 font-mono text-xs">sb-*-auth-token</td>
                    <td className="p-3">Sessão de autenticação (apenas para administradores)</td>
                    <td className="p-3">Sessão</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-6">3.2 Cookies Funcionais</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Estes cookies permitem funcionalidades adicionais como a memorização do carrinho de orçamento:
            </p>
            <div className="mt-4 rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-semibold text-foreground">Cookie / Storage</th>
                    <th className="text-left p-3 font-semibold text-foreground">Finalidade</th>
                    <th className="text-left p-3 font-semibold text-foreground">Duração</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border">
                    <td className="p-3 font-mono text-xs">localStorage (carrinho)</td>
                    <td className="p-3">Guardar os produtos adicionados ao pedido de orçamento</td>
                    <td className="p-3">Persistente</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-6">3.3 Cookies de Terceiros</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Atualmente, o nosso catálogo <strong className="text-foreground">não utiliza cookies de terceiros</strong> para 
              fins de publicidade, rastreamento ou análise. Caso no futuro venhamos a integrar serviços de terceiros 
              (como Google Analytics ou redes sociais), esta política será atualizada em conformidade.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              4. Base Legal para o Uso de Cookies
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O uso de cookies no nosso website está fundamentado nas seguintes bases legais, nos termos do Regulamento (UE) 
              2016/679 (RGPD) e da Lei n.º 41/2004, de 18 de agosto (Lei das Comunicações Eletrónicas):
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <strong className="text-foreground">Cookies estritamente necessários:</strong> isentos de consentimento, 
                ao abrigo do artigo 5.º, n.º 3, da Diretiva 2002/58/CE (Diretiva ePrivacy);
              </li>
              <li>
                <strong className="text-foreground">Cookies funcionais e de análise:</strong> baseados no consentimento 
                do utilizador, obtido através do banner de cookies apresentado na primeira visita.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              5. Como Gerir os Cookies?
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Pode gerir as suas preferências de cookies de duas formas:
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">5.1 Através do nosso banner de cookies</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Na sua primeira visita ao website, será apresentado um banner onde pode aceitar ou rejeitar os cookies 
              não essenciais. Pode alterar as suas preferências a qualquer momento limpando os dados do seu navegador.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">5.2 Através do seu navegador</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Pode configurar o seu navegador para bloquear ou eliminar cookies. Consulte as instruções do seu navegador:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/pt-PT/kb/cookies-informacao-que-os-websites-guardam-no-seu-computador" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/pt-pt/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/pt-pt/microsoft-edge/eliminar-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              <strong className="text-foreground">Nota:</strong> A desativação de cookies pode afetar a funcionalidade do website, 
              nomeadamente a capacidade de manter os produtos no carrinho de orçamento.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              6. Direitos dos Utilizadores
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Nos termos do RGPD, tem o direito de acesso, retificação, apagamento, limitação do tratamento, 
              portabilidade e oposição ao tratamento dos seus dados pessoais recolhidos através de cookies. 
              Para exercer estes direitos, contacte-nos através de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>
                Email:{" "}
                <a href="mailto:geral@vrcf.pt" className="text-primary hover:underline">geral@vrcf.pt</a>
              </li>
              <li>
                Telefone:{" "}
                <a href="tel:+351911564243" className="text-primary hover:underline">+351 911 564 243</a>
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Pode ainda apresentar reclamação junto da{" "}
              <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Comissão Nacional de Proteção de Dados (CNPD)
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              7. Alterações a esta Política
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A VRCF reserva-se o direito de alterar a presente Política de Cookies a qualquer momento. 
              Quaisquer alterações serão publicadas nesta página com a data de atualização.
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-10 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">VRCF — Catálogo Online de Informática & Segurança</p>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} VALTER ROBERTO CRUZ FRANCISCO UNI. LDA — NIF: 515237205
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PoliticaCookies;
