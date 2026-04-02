'use client'

import LegalLayout from '@/components/legal/LegalLayout'

export default function TermsPage() {
  return (
    <LegalLayout title="Termos de Uso">
      <section>
        <span className="text-cyan-400 font-black uppercase text-xs tracking-widest block mb-4">Item 01</span>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">Objeto da Plataforma</h2>
        <p>
          O Fishgada é uma plataforma tecnológica de mapeamento, gamificação e conexão entre pescadores e pesqueiros. Oferecemos ferramentas para registro de capturas, exploração de pontos de pesca e gestão de torneios.
        </p>
      </section>

      <section>
        <span className="text-cyan-400 font-black uppercase text-xs tracking-widest block mb-4">Item 02</span>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">Elegibilidade</h2>
        <p>
          O uso da plataforma é permitido para maiores de 18 anos. Menores de idade podem utilizar o serviço sob supervisão direta de seus responsáveis legais.
        </p>
      </section>

      <section>
        <span className="text-cyan-400 font-black uppercase text-xs tracking-widest block mb-4">Item 03</span>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">Cadastro de Pontos e Responsabilidade</h2>
        <p>
          O usuário é o único responsável pela veracidade e precisão dos pontos cadastrados na plataforma. Classificações indevidas (ex: marcar um local privado como público) podem resultar na suspensão da conta.
        </p>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mt-6 italic">
          "Ao marcar um ponto como Comunitário ou Público, você declara ter o direito de compartilhar essa informação com a comunidade."
        </div>
      </section>

      <section>
        <span className="text-cyan-400 font-black uppercase text-xs tracking-widest block mb-4">Item 04</span>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">Uso Proibido e Conduta</h2>
        <p>
          É expressamente proibido utilizar o Fishgada para:
        </p>
        <ul className="list-disc pl-6 mt-4 space-y-2">
          <li>Marcar locais de pesca ilegal ou predatória.</li>
          <li>Promover invasão de propriedades particulares.</li>
          <li>Compartilhar conteúdo ofensivo ou enganoso nos fóruns e boards.</li>
        </ul>
      </section>

      <section>
        <span className="text-cyan-400 font-black uppercase text-xs tracking-widest block mb-4">Item 05</span>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">Assinaturas e Planos</h2>
        <p>
          Os planos (Pescador e Pesqueiro) possuem renovação automática por padrão. O usuário pode cancelar a renovação a qualquer momento através do painel de configurações, mantendo o acesso até o fim do ciclo pago.
        </p>
      </section>

      <section>
        <span className="text-cyan-400 font-black uppercase text-xs tracking-widest block mb-4">Item 06</span>
        <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-4">Conteúdo de Usuário e Licença de Imagem</h2>
        <p>
          Ao publicar fotos, vídeos ou informações de capturas e locais no Fishgada, o usuário concede à plataforma uma licença perpétua, global e irrevogável para utilizar, reproduzir e publicar tal conteúdo em seus canais de comunicação, redes sociais e materiais promocionais, visando o crescimento da comunidade. Todas as informações inseridas pelos usuários passam a ser de uso da Fishgada.
        </p>
      </section>
    </LegalLayout>
  )
}
