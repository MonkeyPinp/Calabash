# Calabash

<p align="center">
  <img src="app/public/calabash-logo-light.png" width="96" alt="Calabash logo" />
</p>

> Um quadro de relações sem spoilers para leitores de mistério.

[Demo ao vivo](https://guesswhat-studio.github.io/Calabash/) · [Reportar problema](https://github.com/Guesswhat-Studio/Calabash/issues/new/choose) · Versão `0.1.3`

Idiomas: [English](README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · **Português (Brasil)**

![Calabash demo screenshot](docs/assets/calabash-demo.png)

## O Que É

Calabash é um quadro local-first para acompanhar personagens, aliases, pistas, relações e teorias enquanto você lê. O nome vem do cachimbo calabash associado a Sherlock Holmes: a ferramenta não resolve o caso por você, mas fica ao seu lado enquanto você pensa.

A demo pública atual roda inteiramente no navegador. Não há conta, banco de dados hospedado para leitores nem salvamento no servidor.

## Sem IA, Por Design

Romances policiais não são problemas para terceirizar. São problemas para habitar.

Calabash é deliberadamente manual. Ele não extrai personagens automaticamente, não resume a trama e não ranqueia suspeitos por você. Cada personagem adicionado é alguém que você decidiu observar; cada relação desenhada é uma hipótese; cada mudança de suspeita para confirmada é uma pequena vitória de atenção.

## Recursos Principais

- **Controle de capítulos**: avance pelo livro e veja apenas o que você sabia naquele capítulo.
- **Escudo anti-spoiler**: cubra capítulos com revelações até decidir abrir.
- **Quadro de personagens**: acompanhe retratos, aliases, papéis, ocupações, entradas e notas.
- **Certeza de relações**: marque conexões como confirmadas, suspeitas ou descartadas.
- **Campos abertos**: papéis e tipos de relação são sugestões, não limites.
- **Notas adesivas**: mantenha pistas, álibis, teorias e lembretes perto do quadro.
- **Biblioteca local**: salve livros no IndexedDB e faça backup com Exportar/Importar.
- **Tutoriais incluídos**: teste *The Murder of Roger Ackroyd* ou *Hida Trick House Murder Case*.
- **Interface multilíngue**: inglês, chinês simplificado, espanhol e português do Brasil.

## Dados E Privacidade

Calabash é local-first:

- Seus livros ficam no navegador com IndexedDB.
- Tema, idioma e onboarding usam localStorage.
- Outros visitantes da demo não podem alterar seu quadro, e você não altera o deles.
- Durante a beta, limpar os dados do site no navegador pode apagar sua biblioteca local.
- Use **Export Library** como backup e **Import Library** para mover os dados.

## Começo Rápido

1. Abra a [demo ao vivo](https://guesswhat-studio.github.io/Calabash/).
2. Escolha o tutorial de Ackroyd, o tutorial de Kindaichi ou um livro em branco.
3. Pressione `N` para adicionar um personagem.
4. Selecione um personagem, pressione `E` e clique em outro para criar uma relação.
5. Mova o controle de capítulos conforme lê.
6. Exporte sua biblioteca quando quiser um backup.

## Para Quem É

Calabash é para leitores que gostam de fazer o trabalho investigativo:

- Leitores de mistério clássico: Agatha Christie, Ellery Queen, John Dickson Carr, S. S. Van Dine.
- Fãs de mangá e séries de mistério com aliases, identidades ocultas e revelações tardias.
- Leitores de ficção com muitos personagens: fantasia, romance histórico, sagas familiares, thrillers políticos.
- Qualquer pessoa que queira uma ferramenta privada, tranquila e sem conta para pensar com uma história.

Calabash não é tracker de livros, leitor de ebooks, ferramenta de escrita, resumidor com IA nem plataforma social.

## Desenvolvimento

A app fica em `app/` e usa Vite + React.

```bash
cd app
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Shell desktop:

```bash
npm install
npm run desktop:dev
npm run desktop:build
```

Os builds desktop exigem Rust e usam o shell Tauri 2 em `src-tauri/`. O app React continua sendo o unico frontend para web e desktop.

Builds de release:

- Toda versao publica deve ter uma tag anotada `vX.Y.Z` e uma GitHub Release.
- Ao enviar uma tag `v*`, o release workflow roda e publica o web bundle.
- A partir do shell desktop `0.2`, o mesmo workflow tambem deve publicar binarios desktop para Windows, Linux e macOS.

## Roadmap

O roadmap do produto não fica no repositório público. O planejamento público deve viver no [GitHub Projects](https://github.com/orgs/Guesswhat-Studio/projects); GitHub Issues fica para bugs, feedback beta e propostas.

## Versão

Calabash usa versionamento beta `0.x`. `0.1.3` reforça avisos de armazenamento beta, cobertura de fixture para importação/exportação e validação de release. `0.2.0` (não publicado) foca no shell desktop, configuração de binários multiplataforma, seleção de idioma no onboarding, notas/grupos por capítulo, correções de renderização de relações e anotações ajustáveis no quadro.

## License

MIT
