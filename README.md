# Calabash

> A spoiler-safe relationship board for detective fiction readers.

Calabash is a local-first case-file board for tracking characters, clues, aliases, relationships, and theories while you read. It is named after Sherlock Holmes' calabash pipe: the tool does not solve the case for you, but it sits beside you while you think.

[Live demo](https://guesswhat-studio.github.io/Calabash/) · [Project plan](PLAN.md) · Made by Guesswhat Studio

## Why Calabash

Detective novels are not puzzles to outsource. They are puzzles to inhabit.

Calabash is deliberately manual. No AI extraction, no summaries, no automatic suspect ranking. Every character you add is someone you chose to notice; every relationship you draw is a hypothesis you are willing to test; every edge you change from suspected to confirmed is a small victory of attention.

## What It Does

- Build a character map as you read, with portraits, aliases, roles, occupations, and notes.
- Add relationships with free-text types, optional direction arrows, labels, notes, and certainty states.
- Move through the book with a chapter slider so the board only shows what you knew at that point.
- Protect reveal-heavy chapters with Spoiler Shield.
- Highlight important chapters without showing long chapter names.
- Add sticky notes for clues, alibis, theories, and reminders.
- Import and export the whole local library as portable Calabash JSON.
- Try built-in tutorials for *The Murder of Roger Ackroyd* and *Hida Trick House Murder Case*.
- Use the interface in English, Simplified Chinese, Spanish, or Brazilian Portuguese.

## Local-First Privacy

Calabash has no login, no user system, no server database, no cloud sync, and no analytics.

On the web demo, your books are saved inside your own browser using IndexedDB. Settings such as theme and language use localStorage. Other visitors cannot change your copy, and you cannot change theirs. Use **Export Library** to create your own backup file, then **Import Library** to move it to another browser or future desktop build.

## Quick Start

1. Open the demo.
2. Choose the Ackroyd tutorial, the Kindaichi tutorial, or a blank book.
3. Press `N` to add a character.
4. Select a character, press `E`, then click another character to add a relationship.
5. Use the chapter slider to move through the story without exposing future reveals.
6. Export your library when you want a backup.

Keyboard shortcuts:

| Shortcut | Action |
|---|---|
| `N` | New character |
| `E` | Connect edge from selected character |
| `F` | Fit board to view |
| `/` | Search |
| `Delete` / `Backspace` | Delete selected item |
| `Ctrl/Cmd + Z` | Undo |
| `Ctrl/Cmd + Shift + Z` | Redo |

## Who It Is For

Calabash is for readers who enjoy doing the detective work themselves:

- Agatha Christie, Ellery Queen, S. S. Van Dine, John Dickson Carr, and classic mystery readers.
- Manga and TV mystery fans tracking aliases, masked identities, and late reveals.
- Readers of any character-dense novel: fantasy, historical fiction, family sagas, campus novels, political thrillers.
- Anyone who wants a quiet, private, no-account tool for thinking with the story.

## Not For

Calabash is not a book tracker, ebook reader, writing tool, AI summarizer, or social platform. It is a small tool for active reading.

---

## 简体中文

Calabash 是给侦探小说读者用的防剧透人物关系板。你可以一边读书，一边记录人物、别名、线索、关系和自己的推理。

它不是 AI 工具。Calabash 不会自动提取人物，不会总结剧情，也不会替你猜凶手。手动记录本身就是阅读乐趣的一部分：你添加一个人物，是因为你决定注意到他；你画一条关系，是因为你愿意提出一个假设；你把一条线从“怀疑中”改成“已确认”，那就是一次小小的推理胜利。

### 主要功能

- 创建人物关系图，支持头像、别名、角色、职业和笔记。
- 给人物添加关系，支持自由填写关系类型、方向箭头、标签、笔记和确定性。
- 用章节滑杆控制当前阅读进度，只显示你已经读到的信息。
- 用防剧透保护关键揭示章节。
- 高亮重要章节，不强制显示冗长章节名。
- 用便笺记录线索、不在场证明、猜想和提醒。
- 用 JSON 导出/导入整个本地书库。
- 内置《罗杰疑案》和《飞驒机关宅邸杀人事件》教程。
- 支持英文、简体中文、西班牙语、巴西葡萄牙语。

### 数据与隐私

Calabash 没有登录、没有服务器、没有云同步、没有共享数据库。网页版里的书库保存在你自己的浏览器 IndexedDB 中；主题和语言设置保存在 localStorage 中。

如果部署在 GitHub Pages 上，每个访问者操作的都是自己的本地副本，不会影响其他人的内容。需要备份或迁移时，使用 **导出整个资料库** 和 **导入整个资料库**。

### 快速开始

1. 打开 demo。
2. 选择罗杰疑案教程、金田一教程，或创建空白书本。
3. 按 `N` 添加人物。
4. 选中人物后按 `E`，再点击另一个人物添加关系。
5. 用底部章节滑杆跟随阅读进度。
6. 需要备份时导出资料库。

---

## Español

Calabash es un tablero de relaciones sin spoilers para lectores de misterio. Te ayuda a registrar personajes, alias, pistas, relaciones y teorías mientras lees.

No es una herramienta de IA. Calabash no extrae personajes automáticamente, no resume la trama y no adivina al culpable por ti. La entrada manual es parte del placer: cada personaje que añades es alguien que decidiste observar; cada relación que dibujas es una hipótesis; cada cambio de sospechada a confirmada es una pequeña victoria de atención.

### Funciones

- Crea mapas de personajes con retratos, alias, roles, ocupaciones y notas.
- Añade relaciones con tipo libre, dirección opcional, etiquetas, notas y certeza.
- Usa el control de capítulos para ver solo la información que ya alcanzaste.
- Protege capítulos con revelaciones mediante el escudo anti-spoilers.
- Destaca capítulos importantes sin depender de nombres largos.
- Añade notas adhesivas para pistas, coartadas, teorías y recordatorios.
- Importa y exporta toda tu biblioteca local como JSON de Calabash.
- Prueba tutoriales integrados de *The Murder of Roger Ackroyd* y *Hida Trick House Murder Case*.
- Usa la interfaz en inglés, chino simplificado, español o portugués de Brasil.

### Datos y privacidad

Calabash no tiene inicio de sesión, servidor, sincronización en la nube ni base de datos compartida. En la demo web, tus libros se guardan en tu propio navegador con IndexedDB; el tema y el idioma se guardan en localStorage.

En GitHub Pages, cada visitante trabaja con su propia copia local. Tus cambios no afectan a otras personas. Para guardar o mover tus datos, usa **Exportar biblioteca completa** e **Importar biblioteca completa**.

### Inicio rápido

1. Abre la demo.
2. Elige el tutorial de Ackroyd, el tutorial de Kindaichi o un libro en blanco.
3. Pulsa `N` para añadir un personaje.
4. Selecciona un personaje, pulsa `E` y haz clic en otro para crear una relación.
5. Usa el control de capítulos para acompañar tu lectura.
6. Exporta tu biblioteca cuando quieras una copia de seguridad.

---

## Português (Brasil)

Calabash é um quadro de relações sem spoilers para leitores de mistério. Ele ajuda você a acompanhar personagens, aliases, pistas, relações e teorias enquanto lê.

Não é uma ferramenta de IA. O Calabash não extrai personagens automaticamente, não resume a história e não tenta descobrir o culpado por você. O registro manual faz parte da graça: cada personagem que você adiciona é alguém que decidiu observar; cada relação desenhada é uma hipótese; cada mudança de suspeita para confirmada é uma pequena vitória de atenção.

### Recursos

- Crie mapas de personagens com retratos, aliases, papéis, ocupações e notas.
- Adicione relações com tipo livre, seta opcional, rótulos, notas e nível de certeza.
- Use o controle de capítulos para ver apenas o que você já leu.
- Proteja capítulos com grandes revelações usando o escudo anti-spoiler.
- Destaque capítulos importantes sem depender de nomes longos.
- Adicione notas para pistas, álibis, teorias e lembretes.
- Importe e exporte toda a biblioteca local como JSON do Calabash.
- Teste tutoriais integrados de *The Murder of Roger Ackroyd* e *Hida Trick House Murder Case*.
- Use a interface em inglês, chinês simplificado, espanhol ou português do Brasil.

### Dados e privacidade

O Calabash não tem login, servidor, sincronização em nuvem nem banco de dados compartilhado. Na demo web, seus livros ficam salvos no seu próprio navegador com IndexedDB; tema e idioma usam localStorage.

No GitHub Pages, cada visitante trabalha em uma cópia local própria. Suas alterações não afetam outras pessoas. Para guardar ou mover seus dados, use **Exportar biblioteca completa** e **Importar biblioteca completa**.

### Começo rápido

1. Abra a demo.
2. Escolha o tutorial de Ackroyd, o tutorial de Kindaichi ou um livro em branco.
3. Pressione `N` para adicionar um personagem.
4. Selecione um personagem, pressione `E` e clique em outro para criar uma relação.
5. Use o controle de capítulos para acompanhar sua leitura.
6. Exporte sua biblioteca quando quiser um backup.

---

## Development

The app lives in `app/` and runs as a Vite React project.

```bash
cd app
npm install
npm run dev       # http://localhost:5173
npm run typecheck # TypeScript check
npm test          # Vitest suite
npm run build     # production build
```

GitHub Pages build:

```bash
cd app
VITE_BASE_PATH=/Calabash/ npm run build
```

Optional local tutorial portraits:

```bash
cd app
npm run fetch:kindaichi-portraits
```

This downloads Kindaichi wiki thumbnails into `app/public/demo-portraits/`, which is gitignored and intended for local demo use only. The Ackroyd tutorial uses original generated case-file avatars.

## Project Layout

- `PLAN.md` - product and technical specification
- `app/src/components` - canvas, sidebar, settings, onboarding, inspector UI
- `app/src/db` - Dexie persistence and import/export
- `app/src/stores` - Zustand state
- `app/src/i18n.ts` - English, Simplified Chinese, Spanish, and Brazilian Portuguese UI strings
- `.github/workflows/pages.yml` - GitHub Pages deployment workflow

## License

MIT
