import { Btn, Card, Modal } from "../../components/ui";
import { T } from "../../app/theme";

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

const LAST_UPDATED = "Maio/2026";

export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Privacidade e tratamento de dados">
      <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6 }}>
        <Card style={{ background: T.okDim, border: `1px solid ${T.ok}33`, marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ok, marginBottom: 4 }}>
            Resumo
          </div>
          <div style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>
            Os seus dados financeiros ficam <strong>apenas no seu navegador</strong> (IndexedDB local). Nenhuma informação é enviada a servidores. Não há login, rastreamento de uso nem cookies de terceiros.
          </div>
        </Card>

        <Section title="O que é coletado">
          Tudo que você digita: dívidas (nome, saldo, taxa, vencimento, observações), renda, gastos, pagamentos registrados e preferências. Esses dados são gravados no banco IndexedDB do próprio navegador, no seu dispositivo.
        </Section>

        <Section title="Quem tem acesso">
          Apenas você. O app é uma aplicação web estática hospedada no GitHub Pages. Não há servidor próprio que receba ou armazene seus dados. Quem usa o mesmo navegador e perfil tem acesso aos dados — assim como qualquer outro app local.
        </Section>

        <Section title="Compartilhamento">
          Nenhum compartilhamento automático. Você pode exportar um arquivo JSON com seus dados em <strong>Config → Backup → Exportar JSON</strong> e decidir o que fazer com ele.
        </Section>

        <Section title="Seus direitos (LGPD Art. 18)">
          <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
            <li><strong>Acesso e portabilidade</strong>: o botão <em>Exportar JSON</em> em Config gera um arquivo legível com tudo.</li>
            <li><strong>Eliminação</strong>: <em>Resetar tudo</em> em Config apaga 100% dos dados do app no navegador.</li>
            <li><strong>Correção</strong>: editar qualquer dívida ou registro a qualquer momento.</li>
            <li><strong>Anonimização</strong>: como nenhum dado sai do dispositivo, anonimização não se aplica — não há base remota para anonimizar.</li>
          </ul>
        </Section>

        <Section title="Segurança">
          IndexedDB é isolado por origem (mesma proteção de qualquer dado web local). Em dispositivos compartilhados, lembre de usar conta de usuário separada do sistema operacional ou janela anônima/privada.
        </Section>

        <Section title="Mudanças futuras">
          Se versões futuras passarem a sincronizar com um backend (ex: Supabase) ou integrarem-se a um portal de consultório, será exigido consentimento explícito antes de qualquer envio. Esta política será atualizada e a data abaixo refletirá a alteração.
        </Section>

        <Section title="Contato">
          Dúvidas sobre dados ou exercer um direito da LGPD: abrir issue em <code style={{ color: T.accent }}>github.com/JoaoCastroF1/DividaZero</code>.
        </Section>

        <div style={{ fontSize: 10, color: T.dim, marginTop: 12, textAlign: "center" }}>
          Última atualização: {LAST_UPDATED}
        </div>
        <Btn onClick={onClose} style={{ width: "100%", marginTop: 12 }}>
          Entendi
        </Btn>
      </div>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: T.accent, marginBottom: 3 }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}
