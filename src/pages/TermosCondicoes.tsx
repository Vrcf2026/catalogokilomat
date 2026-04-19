import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import vrcfLogo from "@/assets/vrcf-logo.png";

const TermosCondicoes = () => {
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
            Termos e Condições de Utilização
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Versão em vigor a partir de: 27/03/2026
          </p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              1. Identificação do Titular do Catálogo
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O presente catálogo online, disponível em{" "}
              <a href="https://showroom.vrcf.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                showroom.vrcf.info
              </a>{" "}
              (doravante "Catálogo"), é propriedade e é gerido por{" "}
              <strong className="text-foreground">VALTER ROBERTO CRUZ FRANCISCO UNI. LDA</strong>, 
              com o NIF <strong className="text-foreground">515237205</strong>{" "}
              (doravante "VRCF", "nós" ou "empresa"), empresa devidamente constituída e registada ao abrigo da lei portuguesa. 
              Para efeitos de contacto e exercício de direitos, pode contactar-nos através dos meios disponibilizados no Catálogo.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              2. Âmbito e Objeto
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O presente documento estabelece os Termos e Condições que regulam a utilização do Catálogo online da VRCF, 
              bem como as condições aplicáveis ao processo de pedido de orçamento. O Catálogo tem carácter meramente informativo 
              e constitui um instrumento de consulta de produtos e soluções nas áreas de Informática e Segurança Eletrónica. 
              O Catálogo não constitui uma oferta de venda direta, nem um contrato de compra e venda.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              3. Processo de Pedido de Orçamento
            </h2>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">3.1 Natureza do Catálogo</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Todos os produtos, referências, imagens e descrições apresentados no Catálogo têm finalidade exclusivamente informativa. 
              A sua apresentação não constitui uma proposta contratual vinculativa.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">3.2 Como solicitar um orçamento</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Para adquirir qualquer produto ou solução apresentado no Catálogo, o cliente deve submeter um pedido de orçamento 
              através dos canais de contacto disponibilizados. Após receção do pedido, a VRCF analisará a solicitação e enviará 
              uma proposta comercial personalizada.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">3.3 Validade dos orçamentos</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Os orçamentos emitidos pela VRCF têm validade indicada expressamente em cada proposta comercial.</li>
              <li>Na ausência de indicação específica, o prazo de validade do orçamento é de 30 (trinta) dias corridos a contar da data de emissão.</li>
              <li>Findo o prazo de validade, o orçamento caduca automaticamente, podendo os preços estar sujeitos a alteração.</li>
              <li>A aceitação do orçamento deve ser feita por escrito (email ou outro meio documentado) dentro do prazo de validade.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              4. Preços — Isenção de Responsabilidade
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os preços eventualmente indicados no Catálogo são meramente indicativos e estão sujeitos a alteração sem aviso prévio, 
              nomeadamente em função de:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Flutuações do mercado e variações cambiais;</li>
              <li>Alterações nas condições dos fornecedores;</li>
              <li>Variações nas taxas de IVA ou outros encargos fiscais aplicáveis;</li>
              <li>Disponibilidade de stock.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              O preço final e vinculativo será sempre o constante do orçamento emitido pela VRCF e aceite pelo cliente. 
              A VRCF não se responsabiliza por eventuais erros tipográficos ou desatualizações de preços no Catálogo.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Todos os preços apresentados no Catálogo incluem IVA à taxa legal em vigor, sendo meramente indicativos. 
              O preço definitivo será o indicado no orçamento formal emitido pela VRCF.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              5. Propriedade Intelectual
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Todo o conteúdo do Catálogo, incluindo, mas não se limitando a, textos, imagens, logótipos, grafismos, 
              disposição e seleção de produtos, é protegido pelos direitos de propriedade intelectual aplicáveis, nos termos 
              do Código do Direito de Autor e dos Direitos Conexos (aprovado pelo Decreto-Lei n.º 63/85, de 14 de março, 
              e sucessivas alterações) e demais legislação aplicável.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">É expressamente proibido, sem autorização prévia e escrita da VRCF:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Reproduzir, copiar, distribuir ou modificar qualquer conteúdo do Catálogo;</li>
              <li>Utilizar o Catálogo ou o seu conteúdo para fins comerciais próprios;</li>
              <li>Remover ou alterar quaisquer indicações relativas a direitos de autor ou marcas registadas;</li>
              <li>Criar obras derivadas baseadas no Catálogo ou no seu conteúdo.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              As marcas comerciais, logótipos e designações de produtos de terceiros exibidos no Catálogo são propriedade 
              dos respetivos titulares, sendo utilizados apenas para fins de identificação dos produtos.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              6. Proteção de Dados Pessoais (RGPD)
            </h2>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">6.1 Responsável pelo Tratamento</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              A VRCF é a Responsável pelo Tratamento dos dados pessoais recolhidos no âmbito da utilização do Catálogo 
              e do processo de pedido de orçamento, nos termos do Regulamento (UE) 2016/679 (RGPD) e da Lei n.º 58/2019, de 8 de agosto.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">6.2 Dados Recolhidos e Finalidades</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Os dados pessoais recolhidos no âmbito dos pedidos de orçamento são tratados para as seguintes finalidades:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Processamento e resposta ao pedido de orçamento;</li>
              <li>Comunicações relacionadas com a proposta comercial;</li>
              <li>Cumprimento de obrigações legais e fiscais.</li>
            </ul>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">6.3 Base Legal</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              O tratamento de dados baseia-se no consentimento do titular (para comunicações comerciais), na execução de 
              pré-contrato ou contrato (para processamento de orçamentos) e no cumprimento de obrigações legais.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">6.4 Conservação dos Dados</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              Os dados pessoais são conservados pelo período estritamente necessário à prossecução das finalidades indicadas, 
              sem prejuízo dos prazos legais obrigatórios, nomeadamente os decorrentes de obrigações fiscais e contabilísticas 
              (geralmente 10 anos).
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">6.5 Direitos dos Titulares</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">Nos termos do RGPD, o titular dos dados tem direito a:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li><strong className="text-foreground">Acesso</strong> — obter confirmação sobre o tratamento dos seus dados e aceder aos mesmos;</li>
              <li><strong className="text-foreground">Retificação</strong> — corrigir dados inexatos ou incompletos;</li>
              <li><strong className="text-foreground">Apagamento</strong> — solicitar a eliminação dos dados, nos casos previstos na lei;</li>
              <li><strong className="text-foreground">Limitação do tratamento</strong> — restringir o tratamento em determinadas circunstâncias;</li>
              <li><strong className="text-foreground">Portabilidade</strong> — receber os dados em formato estruturado;</li>
              <li><strong className="text-foreground">Oposição</strong> — opor-se ao tratamento baseado em interesses legítimos;</li>
              <li><strong className="text-foreground">Retirar o consentimento</strong> — a qualquer momento, sem afetar a licitude do tratamento anterior.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Para exercer os seus direitos, o titular pode contactar a VRCF através dos meios indicados no Catálogo. 
              Tem ainda o direito de apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD), em{" "}
              <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.cnpd.pt
              </a>.
            </p>

            <h3 className="font-heading text-lg font-semibold text-foreground mt-4">6.6 Segurança</h3>
            <p className="text-muted-foreground leading-relaxed mt-2">
              A VRCF adota as medidas técnicas e organizativas adequadas para proteger os dados pessoais contra acesso não autorizado, 
              perda, destruição ou divulgação indevida.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              7. Limitação de Responsabilidade
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A VRCF envidará todos os esforços para manter o Catálogo atualizado e disponível, mas não garante a ausência 
              de erros, omissões ou interrupções. A VRCF não se responsabiliza por:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
              <li>Danos diretos ou indiretos decorrentes da utilização ou impossibilidade de utilização do Catálogo;</li>
              <li>Erros ou omissões nas informações disponibilizadas;</li>
              <li>Decisões tomadas com base nas informações do Catálogo sem pedido de orçamento formal.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              8. Lei Aplicável e Foro
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Os presentes Termos e Condições são regidos pela lei portuguesa. Para a resolução de quaisquer litígios emergentes 
              da interpretação ou aplicação destes Termos, as partes elegem o foro da comarca da sede da VRCF, com expressa 
              renúncia a qualquer outro.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              No caso de o cliente ser um consumidor (pessoa singular que atue fora do âmbito da sua atividade profissional), 
              são aplicáveis os direitos previstos na Lei de Defesa do Consumidor (Lei n.º 24/96, de 31 de julho) e demais 
              legislação de proteção do consumidor em vigor. Para resolução alternativa de litígios de consumo, podem ser 
              contactados os centros de arbitragem de conflitos de consumo em{" "}
              <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                www.consumidor.gov.pt
              </a>.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-xl font-bold text-foreground border-b border-border pb-2">
              9. Alterações aos Termos e Condições
            </h2>
            <p className="text-muted-foreground leading-relaxed mt-3">
              A VRCF reserva-se o direito de alterar os presentes Termos e Condições a qualquer momento. As alterações entrarão 
              em vigor após a sua publicação no Catálogo. Recomendamos que consulte regularmente esta página.
            </p>
          </section>

          <div className="border-t border-border pt-6 mt-10 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">VRCF — Catálogo Online de Informática & Segurança</p>
            <p className="text-xs text-muted-foreground">
              <a href="https://showroom.vrcf.info" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                showroom.vrcf.info
              </a>{" "}
              | Atualizado em 27/03/2026
            </p>
            <p className="text-xs text-muted-foreground">
              Todos os preços apresentados incluem IVA à taxa legal em vigor e são meramente indicativos, estando sujeitos a alteração sem aviso prévio.
            </p>
            <p className="text-xs text-muted-foreground">
              A disponibilidade dos produtos é sempre confirmada após pedido de orçamento. As imagens apresentadas são meramente ilustrativas.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-accent text-accent-foreground py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs text-accent-foreground/70">
            © {new Date().getFullYear()} VALTER ROBERTO CRUZ FRANCISCO UNI. LDA — NIF: 515237205. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default TermosCondicoes;
