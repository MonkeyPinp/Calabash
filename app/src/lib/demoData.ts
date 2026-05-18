import { createBook, updateBook } from '@/db/books';
import { createCharacter, updateCharacter } from '@/db/characters';
import { findOrCreateCategory } from '@/db/categories';
import { createRelationship } from '@/db/relationships';
import { createAnnotation } from '@/db/annotations';
import { createGroupRange } from '@/db/groupRanges';
import { savePortrait } from '@/db/portraits';
import { createOpenClueDraft } from '@/lib/clues';
import { publicAsset } from '@/lib/publicAsset';
import { createBookFromBundledTemplate } from '@/templates';
import type { CharacterNodeViewMode, ResolvedLanguage } from '@/stores/uiStore';
import type { Character } from '@/types';

interface SeedOptions {
  userId?: string;
  language?: ResolvedLanguage;
  kind?: TutorialKind;
}

export type TutorialKind = 'ackroyd' | 'hida' | 'contest' | 'sevenDeaths';

export function getTutorialDefaultViewMode(kind: TutorialKind): CharacterNodeViewMode {
  return kind === 'ackroyd' ? 'portrait' : 'text';
}

type HidaPortraitKey =
  | 'hajime'
  | 'miyuki'
  | 'kenmochi'
  | 'shino'
  | 'seimaru'
  | 'ryunosuke'
  | 'hayato'
  | 'moegi'
  | 'fuyuki'
  | 'senda'
  | 'headless';

type AckroydPortraitKey =
  | 'poirot'
  | 'sheppard'
  | 'ackroyd'
  | 'flora'
  | 'mrsAckroyd'
  | 'blunt'
  | 'raymond'
  | 'ralph'
  | 'ursula'
  | 'caroline';

const hidaPortraitPaths: Record<HidaPortraitKey, string> = {
  hajime: publicAsset('demo-portraits/kindaichi/hajime-kindaichi.png'),
  miyuki: publicAsset('demo-portraits/kindaichi/miyuki-nanase.png'),
  kenmochi: publicAsset('demo-portraits/kindaichi/isamu-kenmochi.png'),
  shino: publicAsset('demo-portraits/kindaichi/shino-tatsumi.png'),
  seimaru: publicAsset('demo-portraits/kindaichi/seimaru-tatsumi.png'),
  ryunosuke: publicAsset('demo-portraits/kindaichi/ryunosuke-tatsumi.png'),
  hayato: publicAsset('demo-portraits/kindaichi/hayato-tatsumi.png'),
  moegi: publicAsset('demo-portraits/kindaichi/moegi-tatsumi.png'),
  fuyuki: publicAsset('demo-portraits/kindaichi/rintaro-fuyuki.png'),
  senda: publicAsset('demo-portraits/kindaichi/saruhiko-senda.png'),
  headless: publicAsset('demo-portraits/kindaichi/headless-samurai.png'),
};

async function loadOptionalPortrait(bookId: string, path: string) {
  try {
    const response = await fetch(path, { cache: 'force-cache' });
    if (!response.ok) return undefined;
    const blob = await response.blob();
    if (blob.size === 0) return undefined;
    const contentType = blob.type || response.headers.get('content-type') || '';
    if (contentType.startsWith('text/html')) return undefined;
    const mimeType = contentType.startsWith('image/') ? contentType : 'image/png';
    return savePortrait({ bookId, blob, mimeType });
  } catch {
    return undefined;
  }
}

async function attachHidaPortraits(
  bookId: string,
  entries: Array<{ character: Character; key: HidaPortraitKey }>,
) {
  await Promise.all(entries.map(async ({ character, key }) => {
    const portrait = await loadOptionalPortrait(bookId, hidaPortraitPaths[key]);
    if (portrait) await updateCharacter(character.id, { portraitId: portrait.id });
  }));
}

interface GeneratedPortraitSpec {
  initials: string;
  background: string;
  jacket: string;
  hair: string;
  accent: string;
  skin?: string;
  moustache?: boolean;
  glasses?: boolean;
  pearls?: boolean;
}

const ackroydPortraits: Record<AckroydPortraitKey, GeneratedPortraitSpec> = {
  poirot: {
    initials: 'HP',
    background: '#e7dbc9',
    jacket: '#252b2f',
    hair: '#1f1b17',
    accent: '#8a3320',
    moustache: true,
  },
  sheppard: {
    initials: 'JS',
    background: '#d9e2dd',
    jacket: '#2f4a4a',
    hair: '#3b342d',
    accent: '#6a7a7a',
    moustache: true,
  },
  ackroyd: {
    initials: 'RA',
    background: '#e4d5bd',
    jacket: '#433528',
    hair: '#b6b0a4',
    accent: '#9b7d45',
    moustache: true,
  },
  flora: {
    initials: 'FA',
    background: '#ead7df',
    jacket: '#7a3552',
    hair: '#d8b46a',
    accent: '#b66d8b',
    pearls: true,
  },
  mrsAckroyd: {
    initials: 'CA',
    background: '#e6d7c5',
    jacket: '#5a4454',
    hair: '#a89d8f',
    accent: '#8f6d7e',
    pearls: true,
  },
  blunt: {
    initials: 'HB',
    background: '#d8dccf',
    jacket: '#4d5a3c',
    hair: '#655240',
    accent: '#75864e',
    moustache: true,
  },
  raymond: {
    initials: 'GR',
    background: '#d7e0e7',
    jacket: '#33485f',
    hair: '#2f2a28',
    accent: '#5f7895',
  },
  ralph: {
    initials: 'RP',
    background: '#e1d7cc',
    jacket: '#4a3b35',
    hair: '#c5a05a',
    accent: '#9c764b',
  },
  ursula: {
    initials: 'UB',
    background: '#d7e0d3',
    jacket: '#3f5a48',
    hair: '#3a2c22',
    accent: '#72916d',
  },
  caroline: {
    initials: 'CS',
    background: '#e5d5d0',
    jacket: '#57405d',
    hair: '#b2a69b',
    accent: '#7f5d8b',
    glasses: true,
  },
};

function generatedPortraitSvg(spec: GeneratedPortraitSpec): string {
  const skin = spec.skin ?? '#d9aa80';
  const moustache = spec.moustache
    ? `<path d="M49 57 C58 50 66 50 75 57 C68 62 58 62 49 57 Z" fill="${spec.hair}" opacity="0.95"/>`
    : '';
  const glasses = spec.glasses
    ? `<g fill="none" stroke="${spec.accent}" stroke-width="3"><circle cx="51" cy="49" r="8"/><circle cx="73" cy="49" r="8"/><path d="M59 49 H65"/></g>`
    : '';
  const pearls = spec.pearls
    ? '<g fill="#f4ead6"><circle cx="53" cy="82" r="2.5"/><circle cx="60" cy="84" r="2.5"/><circle cx="67" cy="85" r="2.5"/><circle cx="74" cy="84" r="2.5"/><circle cx="81" cy="82" r="2.5"/></g>'
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="64" fill="${spec.background}"/>
  <circle cx="64" cy="60" r="45" fill="${spec.accent}" opacity="0.12"/>
  <path d="M24 117 C31 91 47 79 64 79 C81 79 97 91 104 117 Z" fill="${spec.jacket}"/>
  <path d="M45 83 L64 105 L83 83" fill="#f6efe4" opacity="0.92"/>
  ${pearls}
  <path d="M39 49 C40 28 50 18 65 18 C82 18 91 31 90 52 L82 43 C72 36 56 36 46 43 Z" fill="${spec.hair}"/>
  <circle cx="64" cy="53" r="29" fill="${skin}"/>
  <path d="M39 51 C47 35 78 32 90 52 C86 32 77 21 64 21 C51 21 42 30 39 51 Z" fill="${spec.hair}"/>
  <circle cx="53" cy="51" r="3" fill="#2f2720"/>
  <circle cx="75" cy="51" r="3" fill="#2f2720"/>
  ${glasses}
  <path d="M59 66 C63 69 67 69 71 66" stroke="#6f4b3b" stroke-width="3" fill="none" stroke-linecap="round"/>
  ${moustache}
  <text x="64" y="118" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="16" font-weight="700" fill="#fff" opacity="0.88">${spec.initials}</text>
</svg>`;
}

async function saveGeneratedPortrait(bookId: string, spec: GeneratedPortraitSpec) {
  const blob = new Blob([generatedPortraitSvg(spec)], { type: 'image/svg+xml' });
  return savePortrait({ bookId, blob, mimeType: 'image/svg+xml' });
}

async function attachAckroydPortraits(
  bookId: string,
  entries: Array<{ character: Character; key: AckroydPortraitKey }>,
) {
  await Promise.all(entries.map(async ({ character, key }) => {
    const portrait = await saveGeneratedPortrait(bookId, ackroydPortraits[key]);
    await updateCharacter(character.id, { portraitId: portrait.id });
  }));
}

const ackroydGuideCopy: Record<ResolvedLanguage, {
  start: string;
  chapters: string;
  edit: string;
  detectiveGroup: string;
  householdGroup: string;
}> = {
  en: {
    start: 'Start here: this is your local tutorial copy. Move characters, edit labels, and delete anything; the public demo will stay unchanged for everyone else.',
    chapters: 'Try the chapter slider: chapter 2 shows the Fernly Park circle, chapter 5 marks the murder, chapter 10 names the parlour maid, and chapter 21 reveals the hidden marriage. Chapter 25 onward is protected by Spoiler Shield.',
    edit: 'Try it: select Poirot, press E, then click another character to sketch a theory. Export Library when you want to keep your own backup.',
    detectiveGroup: 'Investigation view',
    householdGroup: 'Fernly Park circle',
  },
  'zh-CN': {
    start: '从这里开始：这是你的本地教程副本。拖动人物、修改标签、删除内容，都只影响你本机的书库，公开 demo 不会被改动。',
    chapters: '试试章节滑杆：第 2 章展示 Fernly Park 人物圈；第 5 章标记命案；第 10 章揭示女仆姓名；第 21 章揭示隐藏婚姻；第 25 章之后由防剧透保护。',
    edit: '动手试试：选中 Poirot，按 E，再点击另一个人物，画一条自己的推理线。想保存时导出书库。',
    detectiveGroup: '调查视角',
    householdGroup: 'Fernly Park 人物圈',
  },
  ja: {
    start: 'ここから開始: これはあなたのローカルなチュートリアルコピーです。人物を動かし、ラベルを編集し、不要なものを削除しても、公開 demo は他の人には変わりません。',
    chapters: '章スライダーを試してみましょう。第2章で Fernly Park の人物圏、第5章で殺人、第10章で女中の名前、第21章で隠された結婚が表示されます。第25章以降はネタバレシールドで保護されます。',
    edit: '試してみましょう: Poirot を選び、E を押してから別の人物をクリックすると、自分の推理線を描けます。バックアップしたいときはライブラリをエクスポートしてください。',
    detectiveGroup: '捜査視点',
    householdGroup: 'Fernly Park 人物圏',
  },
  es: {
    start: 'Empieza aquí: esta es tu copia local del tutorial. Mueve personajes, edita etiquetas y borra lo que quieras; la demo pública no cambia para nadie más.',
    chapters: 'Prueba el control de capítulos: el capítulo 2 muestra el círculo de Fernly Park, el 5 marca el asesinato, el 10 nombra a la doncella y el 21 revela el matrimonio oculto. A partir del capítulo 25, el escudo anti-spoilers protege la lectura.',
    edit: 'Pruébalo: selecciona a Poirot, pulsa E y haz clic en otro personaje para dibujar una teoría. Exporta la biblioteca cuando quieras guardar una copia.',
    detectiveGroup: 'Mirada investigadora',
    householdGroup: 'Círculo de Fernly Park',
  },
  'pt-BR': {
    start: 'Comece aqui: esta é sua cópia local do tutorial. Mova personagens, edite rótulos e apague qualquer coisa; a demo pública continua igual para as outras pessoas.',
    chapters: 'Teste o controle de capítulos: o capítulo 2 mostra o círculo de Fernly Park, o 5 marca o assassinato, o 10 nomeia a criada e o 21 revela o casamento oculto. Do capítulo 25 em diante, o escudo anti-spoiler protege a leitura.',
    edit: 'Experimente: selecione Poirot, pressione E e clique em outro personagem para desenhar uma teoria. Exporte a biblioteca quando quiser guardar seu backup.',
    detectiveGroup: 'Ponto de vista da investigação',
    householdGroup: 'Círculo de Fernly Park',
  },
};

/**
 * Seeds the database with characters and relationships from
 * "The Murder of Roger Ackroyd" by Agatha Christie (1926).
 * This demo keeps the final culprit hidden until chapter 25. Spoiler Shield
 * is enabled for the book, but the canvas is only covered once that chapter
 * exposes the `murderer` role.
 * Returns the new bookId.
 */
export async function seedRogerAckroyd(userId?: string, language: ResolvedLanguage = 'en'): Promise<string> {
  const guide = ackroydGuideCopy[language];
  const category = await findOrCreateCategory({ name: 'Agatha Christie', userId });
  const book = await createBook({
    userId,
    title: 'The Murder of Roger Ackroyd',
    author: 'Agatha Christie',
    totalChapters: 27,
    spoilerShield: true,
    spoilerChapters: [25, 27],
    highlightedChapters: [2, 5, 10, 21],
    categoryId: category.id,
  });
  const bookId = book.id;
  await updateBook(bookId, { currentChapter: 2 });

  // ── Characters ──────────────────────────────────────────────────────────────
  const poirot = await createCharacter({
    bookId, name: 'Hercule Poirot', role: 'detective',
    profession: 'Retired detective', chapterIntroduced: 1,
    position: { x: 1038.361, y: 244.189 },
    notes: 'Belgian detective, recently retired to King\'s Abbot to grow vegetable marrows.',
  });

  const sheppard = await createCharacter({
    bookId, name: 'Dr. James Sheppard', role: 'witness',
    roleReveals: [{ role: 'murderer', chapterRevealed: 25 }],
    profession: 'Village doctor', chapterIntroduced: 1,
    position: { x: 736.734, y: 55.144 },
    aliases: [{ name: 'Dr. James Sheppard', chapterRevealed: 1 }],
    notes: 'Village doctor and narrator. Assists Poirot with the investigation.',
  });

  const ackroyd = await createCharacter({
    bookId, name: 'Roger Ackroyd', role: 'other',
    roleReveals: [{ role: 'victim', chapterRevealed: 5 }],
    profession: 'Wealthy businessman', chapterIntroduced: 1,
    position: { x: 253.062, y: 71.41 },
    notes: 'Found murdered in his study at Fernly Park in chapter 5.',
  });

  const flora = await createCharacter({
    bookId, name: 'Flora Ackroyd', role: 'suspect',
    profession: "Roger's niece", chapterIntroduced: 2,
    position: { x: -181.651, y: -38.904 },
    notes: 'Roger\'s niece, engaged to Ralph Paton. Claims she saw Roger alive at 9:45pm.',
  });

  const mrsAckroyd = await createCharacter({
    bookId, name: 'Mrs. Cecil Ackroyd', role: 'suspect',
    profession: "Roger's sister-in-law", chapterIntroduced: 2,
    position: { x: 14.667, y: 428.492 },
    notes: 'Roger\'s sister-in-law, dependent on his generosity.',
  });

  const blunt = await createCharacter({
    bookId, name: 'Major Hector Blunt', role: 'suspect',
    profession: 'Big-game hunter', chapterIntroduced: 2,
    position: { x: -495.079, y: 110.54 },
    notes: 'Old friend of Ackroyd. Taciturn man with feelings for Flora.',
  });

  const raymond = await createCharacter({
    bookId, name: 'Geoffrey Raymond', role: 'suspect',
    profession: "Roger's secretary", chapterIntroduced: 2,
    position: { x: -364.11, y: 411.523 },
    notes: 'Ackroyd\'s efficient young secretary.',
  });

  const ralph = await createCharacter({
    bookId, name: 'Ralph Paton', role: 'suspect',
    profession: 'Stepson', chapterIntroduced: 1,
    position: { x: 47.776, y: -318.047 },
    notes: 'Roger\'s stepson, heavily in debt. Disappears the night of the murder.',
  });

  const ursula = await createCharacter({
    bookId, name: 'the parlour maid', role: 'suspect',
    profession: 'Parlour maid at Fernly Park', chapterIntroduced: 2,
    position: { x: -397.014, y: -323.961 },
    aliases: [
      { name: 'the parlour maid', chapterRevealed: 2 },
      { name: 'Ursula Bourne', chapterRevealed: 10 },
      { name: 'Ursula Paton', chapterRevealed: 21 },
    ],
    notes: 'Parlour maid with a secret. Her real identity is concealed until later chapters.',
  });

  const caroline = await createCharacter({
    bookId, name: 'Caroline Sheppard', role: 'bystander',
    profession: "James's sister", chapterIntroduced: 1,
    position: { x: 1013.329, y: -56.097 },
    notes: 'James\'s sharp-tongued sister, the village oracle of gossip.',
  });
  await attachAckroydPortraits(bookId, [
    { character: poirot, key: 'poirot' },
    { character: sheppard, key: 'sheppard' },
    { character: ackroyd, key: 'ackroyd' },
    { character: flora, key: 'flora' },
    { character: mrsAckroyd, key: 'mrsAckroyd' },
    { character: blunt, key: 'blunt' },
    { character: raymond, key: 'raymond' },
    { character: ralph, key: 'ralph' },
    { character: ursula, key: 'ursula' },
    { character: caroline, key: 'caroline' },
  ]);

  // ── Relationships ────────────────────────────────────────────────────────────
  // Poirot & Sheppard
  await createRelationship({
    bookId, sourceId: poirot.id, targetId: sheppard.id,
    type: 'professional', chapterRevealed: 1, certainty: 'confirmed',
    label: 'investigates with',
  });

  // Sheppard & Ackroyd
  await createRelationship({
    bookId, sourceId: sheppard.id, targetId: ackroyd.id,
    type: 'professional', chapterRevealed: 1, certainty: 'confirmed',
    label: 'doctor & friend',
  });

  // Ackroyd & Flora
  await createRelationship({
    bookId, sourceId: ackroyd.id, targetId: flora.id,
    type: 'family', chapterRevealed: 2, certainty: 'confirmed',
    label: 'uncle–niece',
  });

  // Ackroyd & Mrs Ackroyd
  await createRelationship({
    bookId, sourceId: ackroyd.id, targetId: mrsAckroyd.id,
    type: 'family', chapterRevealed: 2, certainty: 'confirmed',
    label: 'brother-in-law',
  });

  // Ackroyd & Blunt
  await createRelationship({
    bookId, sourceId: ackroyd.id, targetId: blunt.id,
    type: 'professional', chapterRevealed: 2, certainty: 'confirmed',
    label: 'old friends',
  });

  // Ackroyd & Raymond
  await createRelationship({
    bookId, sourceId: ackroyd.id, targetId: raymond.id,
    type: 'professional', chapterRevealed: 2, certainty: 'confirmed',
    label: 'employer',
  });

  // Ackroyd & Ralph
  await createRelationship({
    bookId, sourceId: ackroyd.id, targetId: ralph.id,
    type: 'family', chapterRevealed: 1, certainty: 'confirmed',
    label: 'stepfather',
  });

  // Ralph & Flora
  await createRelationship({
    bookId, sourceId: ralph.id, targetId: flora.id,
    type: 'romantic', chapterRevealed: 4, certainty: 'confirmed',
    label: 'engaged',
  });

  // Ralph & Ursula (secret — revealed ch 21)
  await createRelationship({
    bookId, sourceId: ralph.id, targetId: ursula.id,
    type: 'romantic', chapterRevealed: 21, certainty: 'confirmed',
    label: 'secretly married',
  });

  // James & Caroline (siblings)
  await createRelationship({
    bookId, sourceId: sheppard.id, targetId: caroline.id,
    type: 'family', chapterRevealed: 1, certainty: 'confirmed',
    label: 'siblings',
  });

  // Blunt → Flora (unrequited)
  await createRelationship({
    bookId, sourceId: blunt.id, targetId: flora.id,
    type: 'romantic', chapterRevealed: 19, certainty: 'confirmed',
    label: 'loves',
  });

  // Poirot unmasks the main suspect at the protected reveal.
  await createRelationship({
    bookId, sourceId: poirot.id, targetId: sheppard.id,
    type: 'suspicion', chapterRevealed: 25, certainty: 'confirmed',
    label: 'unmasks',
  });

  await Promise.all([
    createGroupRange({
      bookId,
      label: guide.detectiveGroup,
      color: 'blue',
      position: { x: 673.679, y: -279.191 },
      width: 650,
      height: 831,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.18 },
      chapterIntroduced: 1,
    }),
    createGroupRange({
      bookId,
      label: guide.householdGroup,
      color: 'ochre',
      position: { x: -542.699, y: -640.016 },
      width: 1008,
      height: 1457,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.18 },
      chapterIntroduced: 2,
    }),
  ]);

  await Promise.all([
    createAnnotation({
      bookId,
      content: guide.start,
      position: { x: -1062.933, y: -518.649 },
      width: 516,
      height: 259,
      color: 'yellow',
      fontSize: 26,
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: guide.chapters,
      position: { x: -1036.734, y: 680.15 },
      width: 635,
      height: 274,
      color: 'blue',
      fontSize: 26,
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: guide.edit,
      position: { x: 716.417, y: 576.983 },
      width: 578,
      height: 315,
      color: 'green',
      fontSize: 26,
      chapterIntroduced: 1,
    }),
  ]);

  return bookId;
}

export async function seedContestTemplate(userId?: string, language: ResolvedLanguage = 'en'): Promise<string> {
  return (await createBookFromBundledTemplate('puzzle-contest-basic', { userId, language })).bookId;
}

const tutorialCopy: Record<ResolvedLanguage, {
  category: string;
  title: string;
  author: string;
  hajime: string;
  miyuki: string;
  kenmochi: string;
  shino: string;
  ayako: string;
  seimaru: string;
  ryunosuke: string;
  hayato: string;
  moegi: string;
  fuyuki: string;
  senda: string;
  headless: string;
  notes: {
    start: string;
    chapters: string;
    edit: string;
    groups: string;
  };
  investigationGroup: string;
  familyGroup: string;
}> = {
  en: {
    category: 'Tutorial',
    title: 'Hida Trick House Murder Case',
    author: 'The Kindaichi Case Files · TV 18-20',
    hajime: 'Hajime Kindaichi',
    miyuki: 'Miyuki Nanase',
    kenmochi: 'Isamu Kenmochi',
    shino: 'Shino Tatsumi',
    ayako: 'Ayako Tatsumi',
    seimaru: 'Seimaru Tatsumi',
    ryunosuke: 'Ryunosuke Tatsumi',
    hayato: 'Hayato Tatsumi',
    moegi: 'Moegi Tatsumi',
    fuyuki: 'Rintaro Fuyuki',
    senda: 'Saruhiko Senda',
    headless: 'The Headless Samurai',
    notes: {
      start: 'Start here: this is your local tutorial copy. Move cards, change labels, switch between text and portrait styles, and your edits autosave to this local library. Export Library when you want a backup.',
      chapters: 'Use the chapter slider for TV 18-20. New facts, aliases, and relationship lines appear as the case unfolds; chapter 3 is protected by Spoiler Shield before the culprit reveal.',
      edit: 'Try a theory line: select Kindaichi, press E, then click the Headless Samurai. Open the right sidebar to change the label, direction, certainty, or notes.',
      groups: 'Groups sit behind characters and edges. Use them for factions like the investigation team or Tatsumi family; the sidebar can edit color, label position, font size, copy, or delete.',
    },
    investigationGroup: 'Investigation team',
    familyGroup: 'Tatsumi family',
  },
  'zh-CN': {
    category: '教程',
    title: '飞驒机关宅邸杀人事件',
    author: '金田一少年事件簿 · TV 18-20',
    hajime: '金田一一',
    miyuki: '七濑美雪',
    kenmochi: '剑持勇',
    shino: '巽紫乃',
    ayako: '巽绫子',
    seimaru: '巽征丸',
    ryunosuke: '巽龙之介',
    hayato: '巽隼人',
    moegi: '巽萌黄',
    fuyuki: '冬木伦太郎',
    senda: '仙田猿彦',
    headless: '首狩武者',
    notes: {
      start: '从这里开始：这是你的本地教程副本。拖动卡片、改标签、切换文字版/大图版，都会自动保存到本机书库；需要备份时导出书库。',
      chapters: '试试章节滑杆：TV 18-20 会逐步出现新事实、别名和关系线；第 3 集揭示凶手前会由防剧透保护。',
      edit: '动手试试：选中金田一，按 E，再点击首狩武者，画一条自己的推理线。右侧边栏可以修改标签、方向、确定度和备注。',
      groups: '分组位于角色和关系线下方，适合表示调查组、巽家成员这类阵营。右侧边栏可以改颜色、拖动标签、调字号、复制或删除。',
    },
    investigationGroup: '调查组',
    familyGroup: '巽家成员',
  },
  ja: {
    category: 'チュートリアル',
    title: '飛騨からくり屋敷殺人事件',
    author: '金田一少年の事件簿 · TV 18-20',
    hajime: '金田一一',
    miyuki: '七瀬美雪',
    kenmochi: '剣持勇',
    shino: '巽紫乃',
    ayako: '巽綾子',
    seimaru: '巽征丸',
    ryunosuke: '巽龍之介',
    hayato: '巽隼人',
    moegi: '巽もえぎ',
    fuyuki: '冬木倫太郎',
    senda: '仙田猿彦',
    headless: '首狩り武者',
    notes: {
      start: 'ここから開始: これはあなたのローカルなチュートリアルコピーです。カードを動かし、ラベルを変え、テキスト版/ポートレート版を切り替えると、このローカルライブラリに自動保存されます。バックアップしたいときはライブラリをエクスポートしてください。',
      chapters: 'TV 18-20 用に章スライダーを動かしてみましょう。事件が進むにつれて、新しい事実、別名、関係線が表示されます。第3話の犯人開示前はネタバレシールドで保護されます。',
      edit: '推理線を試す: 金田一を選び、E を押してから首狩り武者をクリックします。右サイドバーでラベル、向き、確度、メモを変更できます。',
      groups: 'グループは人物と関係線の背面に置かれます。捜査チームや巽家のようなまとまりに使い、サイドバーで色、ラベル位置、フォントサイズ、複製、削除を編集できます。',
    },
    investigationGroup: '捜査チーム',
    familyGroup: '巽家',
  },
  es: {
    category: 'Tutorial',
    title: 'Caso de la mansión mecánica de Hida',
    author: 'The Kindaichi Case Files · TV 18-20',
    hajime: 'Hajime Kindaichi',
    miyuki: 'Miyuki Nanase',
    kenmochi: 'Isamu Kenmochi',
    shino: 'Shino Tatsumi',
    ayako: 'Ayako Tatsumi',
    seimaru: 'Seimaru Tatsumi',
    ryunosuke: 'Ryunosuke Tatsumi',
    hayato: 'Hayato Tatsumi',
    moegi: 'Moegi Tatsumi',
    fuyuki: 'Rintaro Fuyuki',
    senda: 'Saruhiko Senda',
    headless: 'El samurái sin cabeza',
    notes: {
      start: 'Empieza aquí: esta es tu copia local del tutorial. Mueve tarjetas, cambia etiquetas, alterna entre texto y retratos, y los cambios se guardan en esta biblioteca local. Exporta la biblioteca para hacer copia.',
      chapters: 'Usa el control de capítulos para TV 18-20. Los datos, alias y relaciones aparecen poco a poco; el capítulo 3 queda protegido antes de revelar al culpable.',
      edit: 'Prueba una teoría: selecciona a Kindaichi, pulsa E y haz clic en el samurái. En la barra derecha puedes cambiar etiqueta, dirección, certeza y notas.',
      groups: 'Los grupos quedan debajo de personajes y líneas. Úsalos para facciones como investigadores o familia Tatsumi; la barra derecha edita color, etiqueta, tamaño, copia o borrado.',
    },
    investigationGroup: 'Equipo investigador',
    familyGroup: 'Familia Tatsumi',
  },
  'pt-BR': {
    category: 'Tutorial',
    title: 'Caso da Mansão Mecânica de Hida',
    author: 'The Kindaichi Case Files · TV 18-20',
    hajime: 'Hajime Kindaichi',
    miyuki: 'Miyuki Nanase',
    kenmochi: 'Isamu Kenmochi',
    shino: 'Shino Tatsumi',
    ayako: 'Ayako Tatsumi',
    seimaru: 'Seimaru Tatsumi',
    ryunosuke: 'Ryunosuke Tatsumi',
    hayato: 'Hayato Tatsumi',
    moegi: 'Moegi Tatsumi',
    fuyuki: 'Rintaro Fuyuki',
    senda: 'Saruhiko Senda',
    headless: 'O samurai sem cabeça',
    notes: {
      start: 'Comece aqui: esta é sua cópia local do tutorial. Mova cartões, edite rótulos, alterne entre texto e retratos, e tudo fica salvo nesta biblioteca local. Exporte a biblioteca para backup.',
      chapters: 'Use o controle de capítulos para TV 18-20. Fatos, aliases e relações aparecem aos poucos; o capítulo 3 fica protegido antes da revelação do culpado.',
      edit: 'Teste uma teoria: selecione Kindaichi, pressione E e clique no samurai. Na barra lateral direita você muda rótulo, direção, certeza e notas.',
      groups: 'Grupos ficam atrás de personagens e linhas. Use-os para facções como investigação ou família Tatsumi; a barra lateral edita cor, rótulo, tamanho, cópia ou remoção.',
    },
    investigationGroup: 'Equipe de investigação',
    familyGroup: 'Família Tatsumi',
  },
};

function sevenDeathsString(
  language: ResolvedLanguage,
  values: Partial<Record<ResolvedLanguage, string>> & { en: string },
): string {
  return values[language] ?? values.en;
}

async function seedSevenDeathsTimeLoop(userId?: string, language: ResolvedLanguage = 'en'): Promise<string> {
  const text = {
    category: sevenDeathsString(language, {
      en: 'Tutorials',
      'zh-CN': '教程',
      ja: 'チュートリアル',
      es: 'Tutoriales',
      'pt-BR': 'Tutoriais',
    }),
    title: sevenDeathsString(language, {
      en: 'The Man Who Died Seven Times: Time Layer Tutorial',
      'zh-CN': '死了七次的男人：时间层教程',
      ja: '七回死んだ男：時間レイヤー教程',
      es: 'El hombre que murió siete veces: tutorial de capas temporales',
      'pt-BR': 'O homem que morreu sete vezes: tutorial de camadas temporais',
    }),
    author: sevenDeathsString(language, {
      en: 'Yasuhiko Nishizawa',
      'zh-CN': '西泽保彦',
      ja: '西澤保彦',
      es: 'Yasuhiko Nishizawa',
      'pt-BR': 'Yasuhiko Nishizawa',
    }),
    loopName: (n: number) => sevenDeathsString(language, {
      en: `Loop ${n}`,
      'zh-CN': `第 ${n} 次重复`,
      ja: `${n}巡目`,
      es: `Bucle ${n}`,
      'pt-BR': `Loop ${n}`,
    }),
    familyGroup: sevenDeathsString(language, {
      en: 'Fuchigami family pressure',
      'zh-CN': '渊上家族压力',
      ja: '渕上家の圧力',
      es: 'Presión de la familia Fuchigami',
      'pt-BR': 'Pressão da família Fuchigami',
    }),
    obaGroup: sevenDeathsString(language, {
      en: 'Oba household',
      'zh-CN': '大庭家',
      ja: '大庭家',
      es: 'Casa Oba',
      'pt-BR': 'Família Oba',
    }),
    kaneGroup: sevenDeathsString(language, {
      en: 'Kanonoe household',
      'zh-CN': '钟之江家',
      ja: '鐘之江家',
      es: 'Casa Kanonoe',
      'pt-BR': 'Família Kanonoe',
    }),
    loopGroup: sevenDeathsString(language, {
      en: 'Loop-specific facts',
      'zh-CN': '循环限定事实',
      ja: 'ループ限定の事実',
      es: 'Hechos de este bucle',
      'pt-BR': 'Fatos deste loop',
    }),
    observer: sevenDeathsString(language, {
      en: 'time-loop observer',
      'zh-CN': '时间循环观察者',
      ja: '時間ループの観測者',
      es: 'observador del bucle temporal',
      'pt-BR': 'observador do loop temporal',
    }),
    victimRole: sevenDeathsString(language, {
      en: 'grandfather / possible victim',
      'zh-CN': '外公 / 可能的受害者',
      ja: '祖父 / 被害者候補',
      es: 'abuelo / posible víctima',
      'pt-BR': 'avô / possível vítima',
    }),
    startNote: sevenDeathsString(language, {
      en: 'Time Layer demo: the same January 2 repeats. Use the top Time layer selector to compare which relationships, notes, and group areas belong to a specific loop.',
      'zh-CN': '时间层 Demo：同一个一月二日会反复出现。用顶部“时间层”切换器比较哪些关系、便笺和分组只属于某一次重复。',
      ja: '時間レイヤーのデモです。同じ1月2日が繰り返されます。上部の時間レイヤー切替で、各ループだけに属する関係・付箋・グループを比較できます。',
      es: 'Demo de capas temporales: el mismo 2 de enero se repite. Usa el selector superior para comparar qué relaciones, notas y grupos pertenecen a cada bucle.',
      'pt-BR': 'Demo de camadas temporais: o mesmo 2 de janeiro se repete. Use o seletor superior para comparar quais relações, notas e grupos pertencem a cada loop.',
    }),
    baselineNote: sevenDeathsString(language, {
      en: 'Loop 1: start with the stable family map. Keep facts that apply to every loop outside any specific time layer.',
      'zh-CN': '第 1 次重复：先从稳定的家族图开始。每次重复都成立的事实，不绑定到任何具体时间层。',
      ja: '1巡目: まず安定した家族図から始めます。どのループにも当てはまる事実は、特定レイヤーに入れません。',
      es: 'Bucle 1: empieza con el mapa familiar estable. Los hechos que valen en todos los bucles quedan fuera de una capa específica.',
      'pt-BR': 'Loop 1: comece pelo mapa familiar estável. Fatos que valem em todos os loops ficam fora de uma camada específica.',
    }),
    discoveryNote: sevenDeathsString(language, {
      en: 'Loop 2: record the discovered death as a loop-specific fact. It can disappear when you switch back to the baseline layer.',
      'zh-CN': '第 2 次重复：把“发现死亡现场”作为本轮限定事实。切回基准层时，它会消失。',
      ja: '2巡目: 死亡現場の発見をこの巡目限定の事実として記録します。基準レイヤーに戻すと非表示になります。',
      es: 'Bucle 2: registra el hallazgo de la muerte como hecho específico. Desaparece al volver a la capa base.',
      'pt-BR': 'Loop 2: registre a morte descoberta como fato específico. Ela some ao voltar à camada base.',
    }),
    lateLoopNote: sevenDeathsString(language, {
      en: 'Loop 7: compare failed prevention attempts. The useful question becomes not only “who”, but “which intervention changed the outcome?”',
      'zh-CN': '第 7 次重复：对照失败的阻止尝试。真正有用的问题不只是“是谁”，而是“哪一次介入改变了结果”。',
      ja: '7巡目: 失敗した阻止策を比較します。大事なのは「誰か」だけでなく、「どの介入が結果を変えたか」です。',
      es: 'Bucle 7: compara intentos fallidos de prevención. La pregunta útil no es solo “quién”, sino “qué intervención cambió el resultado”.',
      'pt-BR': 'Loop 7: compare tentativas falhas de prevenção. A pergunta útil não é só “quem”, mas “qual intervenção mudou o resultado”.',
    }),
    finalNote: sevenDeathsString(language, {
      en: 'Loop 9: the board shifts from solving a past murder to preventing the next version of the event.',
      'zh-CN': '第 9 次重复：看板的目标从“破解已经发生的命案”转为“阻止下一次事件发生”。',
      ja: '9巡目: ボードの目的は、過去の殺人を解くことから、次の事件を防ぐことへ移ります。',
      es: 'Bucle 9: el tablero pasa de resolver un crimen ocurrido a prevenir la próxima versión del evento.',
      'pt-BR': 'Loop 9: o quadro muda de resolver um crime passado para impedir a próxima versão do evento.',
    }),
    clueA: sevenDeathsString(language, {
      en: 'Which intervention changes the outcome across loops?',
      'zh-CN': '哪一次介入会改变循环结果？',
      ja: 'どの介入がループの結果を変えるのか？',
      es: '¿Qué intervención cambia el resultado entre bucles?',
      'pt-BR': 'Qual intervenção muda o resultado entre loops?',
    }),
    clueB: sevenDeathsString(language, {
      en: 'Are the attic route and vase position consistent in every loop?',
      'zh-CN': '阁楼动线和花瓶位置在每次重复里是否一致？',
      ja: '屋根裏への動線と花瓶の位置は毎回同じか？',
      es: '¿La ruta al ático y la posición del jarrón son consistentes en cada bucle?',
      'pt-BR': 'O caminho até o sótão e a posição do vaso são consistentes em todos os loops?',
    }),
    clueC: sevenDeathsString(language, {
      en: 'Which inheritance motive survives every reset?',
      'zh-CN': '哪一个继承/遗产动机能跨过所有重置？',
      ja: 'どの相続動機がすべてのリセット後も残るか？',
      es: '¿Qué motivo de herencia sobrevive a todos los reinicios?',
      'pt-BR': 'Que motivo de herança sobrevive a todos os reinícios?',
    }),
    names: {
      q: sevenDeathsString(language, { en: 'Hisataro', 'zh-CN': '久太郎', ja: '久太郎', es: 'Hisataro', 'pt-BR': 'Hisataro' }),
      reijiro: sevenDeathsString(language, { en: 'Reijiro Fuchigami', 'zh-CN': '渊上零治郎', ja: '淵上零治郎', es: 'Reijiro Fuchigami', 'pt-BR': 'Reijiro Fuchigami' }),
      kazumi: sevenDeathsString(language, { en: 'Kazumi', 'zh-CN': '加实寿', ja: '加実寿', es: 'Kazumi', 'pt-BR': 'Kazumi' }),
      kuruno: sevenDeathsString(language, { en: 'Kuruno', 'zh-CN': '胡留乃', ja: '胡留乃', es: 'Kuruno', 'pt-BR': 'Kuruno' }),
      haruna: sevenDeathsString(language, { en: 'Haruna', 'zh-CN': '叶流名', ja: '叶流名', es: 'Haruna', 'pt-BR': 'Haruna' }),
      fujitaka: sevenDeathsString(language, { en: 'Fujitaka Oba', 'zh-CN': '富士高', ja: '富士高', es: 'Fujitaka Oba', 'pt-BR': 'Fujitaka Oba' }),
      yoshio: sevenDeathsString(language, { en: 'Yoshio Oba', 'zh-CN': '世史夫', ja: '世史夫', es: 'Yoshio Oba', 'pt-BR': 'Yoshio Oba' }),
      mai: sevenDeathsString(language, { en: 'Mai Kanonoe', 'zh-CN': '舞', ja: '舞', es: 'Mai Kanonoe', 'pt-BR': 'Mai Kanonoe' }),
      luna: sevenDeathsString(language, { en: 'Runa Kanonoe', 'zh-CN': '瑠奈', ja: '瑠奈', es: 'Runa Kanonoe', 'pt-BR': 'Runa Kanonoe' }),
      ikuko: sevenDeathsString(language, { en: 'Ikuko', 'zh-CN': '居子', ja: '居子', es: 'Ikuko', 'pt-BR': 'Ikuko' }),
      tsuchiya: sevenDeathsString(language, { en: 'Ryuichi Tsuchiya', 'zh-CN': '槌矢龙一', ja: '槌矢竜一', es: 'Ryuichi Tsuchiya', 'pt-BR': 'Ryuichi Tsuchiya' }),
      yuri: sevenDeathsString(language, { en: 'Yuri Emi', 'zh-CN': '友理绘美', ja: '友理絵美', es: 'Yuri Emi', 'pt-BR': 'Yuri Emi' }),
      attic: sevenDeathsString(language, { en: 'Attic', 'zh-CN': '阁楼', ja: '屋根裏', es: 'Ático', 'pt-BR': 'Sótão' }),
      vase: sevenDeathsString(language, { en: 'Bronze vase', 'zh-CN': '铜花瓶', ja: '銅の花瓶', es: 'Jarrón de bronce', 'pt-BR': 'Vaso de bronze' }),
    },
    professions: {
      kazumi: sevenDeathsString(language, { en: "eldest daughter / Hisataro's mother", 'zh-CN': '长女 / 久太郎的母亲', ja: '長女 / 久太郎の母', es: 'hija mayor / madre de Hisataro', 'pt-BR': 'filha mais velha / mãe de Hisataro' }),
      kuruno: sevenDeathsString(language, { en: 'second daughter', 'zh-CN': '次女', ja: '次女', es: 'segunda hija', 'pt-BR': 'segunda filha' }),
      haruna: sevenDeathsString(language, { en: 'third daughter / Kanonoe household', 'zh-CN': '三女 / 钟之江家', ja: '三女 / 鐘之江家', es: 'tercera hija / casa Kanonoe', 'pt-BR': 'terceira filha / família Kanonoe' }),
      fujitaka: sevenDeathsString(language, { en: 'Oba household son', 'zh-CN': '大庭家的儿子', ja: '大庭家の息子', es: 'hijo de la casa Oba', 'pt-BR': 'filho da família Oba' }),
      yoshio: sevenDeathsString(language, { en: 'Oba household son', 'zh-CN': '大庭家的儿子', ja: '大庭家の息子', es: 'hijo de la casa Oba', 'pt-BR': 'filho da família Oba' }),
      mai: sevenDeathsString(language, { en: "Haruna's daughter", 'zh-CN': '叶流名的女儿', ja: '叶流名の娘', es: 'hija de Haruna', 'pt-BR': 'filha de Haruna' }),
      luna: sevenDeathsString(language, { en: "Haruna's daughter", 'zh-CN': '叶流名的女儿', ja: '叶流名の娘', es: 'hija de Haruna', 'pt-BR': 'filha de Haruna' }),
      ikuko: sevenDeathsString(language, { en: 'Fuchigami family maid', 'zh-CN': '渊上家女佣', ja: '淵上家の女中', es: 'sirvienta de los Fuchigami', 'pt-BR': 'criada da família Fuchigami' }),
      tsuchiya: sevenDeathsString(language, { en: "Reijiro's secretary", 'zh-CN': '零治郎的秘书', ja: '零治郎の秘書', es: 'secretario de Reijiro', 'pt-BR': 'secretário de Reijiro' }),
      yuri: sevenDeathsString(language, { en: "Kuruno's secretary", 'zh-CN': '胡留乃的秘书', ja: '胡留乃の秘書', es: 'secretaria de Kuruno', 'pt-BR': 'secretária de Kuruno' }),
      attic: sevenDeathsString(language, { en: 'key room', 'zh-CN': '关键房间', ja: '重要な部屋', es: 'habitación clave', 'pt-BR': 'cômodo-chave' }),
      vase: sevenDeathsString(language, { en: 'suspicious object', 'zh-CN': '可疑物品', ja: '怪しい物品', es: 'objeto sospechoso', 'pt-BR': 'objeto suspeito' }),
    },
    labels: {
      fatherDaughter: sevenDeathsString(language, { en: 'father-daughter', 'zh-CN': '父女', ja: '父娘', es: 'padre-hija', 'pt-BR': 'pai-filha' }),
      motherSon: sevenDeathsString(language, { en: 'mother-son', 'zh-CN': '母子', ja: '母子', es: 'madre-hijo', 'pt-BR': 'mãe-filho' }),
      motherDaughter: sevenDeathsString(language, { en: 'mother-daughter', 'zh-CN': '母女', ja: '母娘', es: 'madre-hija', 'pt-BR': 'mãe-filha' }),
      maid: sevenDeathsString(language, { en: 'maid', 'zh-CN': '女佣', ja: '女中', es: 'sirvienta', 'pt-BR': 'criada' }),
      secretary: sevenDeathsString(language, { en: 'secretary', 'zh-CN': '秘书', ja: '秘書', es: 'secretario/a', 'pt-BR': 'secretário/a' }),
      discoveredDeath: sevenDeathsString(language, { en: 'finds the death scene', 'zh-CN': '发现死亡现场', ja: '死亡現場を発見', es: 'descubre la escena', 'pt-BR': 'descobre a cena da morte' }),
      deathScene: sevenDeathsString(language, { en: 'death scene', 'zh-CN': '死亡地点', ja: '死亡場所', es: 'lugar de la muerte', 'pt-BR': 'local da morte' }),
      possibleWeapon: sevenDeathsString(language, { en: 'possible weapon', 'zh-CN': '可能凶器', ja: '凶器候補', es: 'posible arma', 'pt-BR': 'possível arma' }),
      routeCheck: sevenDeathsString(language, { en: 'checks the route again', 'zh-CN': '反复核对动线', ja: '動線を再確認', es: 'revisa la ruta', 'pt-BR': 'confere a rota outra vez' }),
      preventDeath: sevenDeathsString(language, { en: 'goal: prevent the death', 'zh-CN': '目标：阻止死亡', ja: '目的: 死を防ぐ', es: 'objetivo: impedir la muerte', 'pt-BR': 'meta: impedir a morte' }),
    },
  };

  const timeLayers = Array.from({ length: 9 }, (_, index) => ({
    id: `loop-${index + 1}`,
    name: text.loopName(index + 1),
    order: index + 1,
    color: ['#6a4f1b', '#8f2f1f', '#1f5f7a', '#9f6b14', '#4e7c56', '#70528f', '#7a4d2c', '#2f6d65', '#9a7a1b'][index],
  }));

  const category = await findOrCreateCategory({ name: text.category, userId });
  const book = await createBook({
    userId,
    title: text.title,
    author: text.author,
    totalChapters: 9,
    spoilerShield: true,
    spoilerChapters: [7, 9],
    highlightedChapters: [1, 2, 7, 9],
    timeLayers,
    defaultTimeLayerId: 'loop-1',
    categoryId: category.id,
  });
  const bookId = book.id;
  const now = Date.now();
  await updateBook(bookId, {
    currentChapter: 1,
    openClues: [
      createOpenClueDraft(text.clueA, 2, now),
      createOpenClueDraft(text.clueB, 2, now + 1),
      createOpenClueDraft(text.clueC, 4, now + 2),
    ],
  });

  const q = await createCharacter({
    bookId,
    name: text.names.q,
    role: 'detective',
    profession: text.observer,
    chapterIntroduced: 1,
    position: { x: -720, y: -45 },
    notes: text.startNote,
  });
  const reijiro = await createCharacter({
    bookId,
    name: text.names.reijiro,
    role: 'victim',
    profession: text.victimRole,
    chapterIntroduced: 1,
    position: { x: -10, y: -360 },
  });
  const kazumi = await createCharacter({ bookId, name: text.names.kazumi, role: 'suspect', profession: text.professions.kazumi, chapterIntroduced: 1, position: { x: -300, y: -105 } });
  const kuruno = await createCharacter({ bookId, name: text.names.kuruno, role: 'suspect', profession: text.professions.kuruno, chapterIntroduced: 1, position: { x: -10, y: -105 } });
  const haruna = await createCharacter({ bookId, name: text.names.haruna, role: 'suspect', profession: text.professions.haruna, chapterIntroduced: 1, position: { x: 280, y: -105 } });
  const fujitaka = await createCharacter({ bookId, name: text.names.fujitaka, role: 'suspect', profession: text.professions.fujitaka, chapterIntroduced: 1, position: { x: -430, y: 165 } });
  const yoshio = await createCharacter({ bookId, name: text.names.yoshio, role: 'suspect', profession: text.professions.yoshio, chapterIntroduced: 1, position: { x: -180, y: 175 } });
  const mai = await createCharacter({ bookId, name: text.names.mai, role: 'suspect', profession: text.professions.mai, chapterIntroduced: 1, position: { x: 180, y: 175 } });
  const luna = await createCharacter({ bookId, name: text.names.luna, role: 'suspect', profession: text.professions.luna, chapterIntroduced: 1, position: { x: 430, y: 165 } });
  const ikuko = await createCharacter({ bookId, name: text.names.ikuko, role: 'witness', profession: text.professions.ikuko, chapterIntroduced: 1, position: { x: 220, y: -360 } });
  const tsuchiya = await createCharacter({ bookId, name: text.names.tsuchiya, role: 'witness', profession: text.professions.tsuchiya, chapterIntroduced: 1, position: { x: 455, y: -350 } });
  const yuri = await createCharacter({ bookId, name: text.names.yuri, role: 'witness', profession: text.professions.yuri, chapterIntroduced: 1, position: { x: 455, y: -105 } });
  const attic = await createCharacter({
    bookId,
    name: text.names.attic,
    kind: 'room',
    role: 'other',
    profession: text.professions.attic,
    chapterIntroduced: 2,
    position: { x: -80, y: 455 },
  });
  const vase = await createCharacter({
    bookId,
    name: text.names.vase,
    kind: 'item',
    role: 'other',
    profession: text.professions.vase,
    chapterIntroduced: 2,
    position: { x: 165, y: 455 },
  });

  const rel = async (
    sourceId: string,
    targetId: string,
    type: string,
    label: string,
    chapterRevealed = 1,
    timeLayerId?: string,
    certainty: 'confirmed' | 'suspected' | 'disproven' = 'confirmed',
  ) => createRelationship({ bookId, sourceId, targetId, type, label, chapterRevealed, timeLayerId, certainty });

  await Promise.all([
    rel(reijiro.id, kazumi.id, 'family', text.labels.fatherDaughter),
    rel(reijiro.id, kuruno.id, 'family', text.labels.fatherDaughter),
    rel(reijiro.id, haruna.id, 'family', text.labels.fatherDaughter),
    rel(kazumi.id, q.id, 'family', text.labels.motherSon),
    rel(kazumi.id, fujitaka.id, 'family', text.labels.motherSon),
    rel(kazumi.id, yoshio.id, 'family', text.labels.motherSon),
    rel(haruna.id, mai.id, 'family', text.labels.motherDaughter),
    rel(haruna.id, luna.id, 'family', text.labels.motherDaughter),
    rel(ikuko.id, reijiro.id, 'professional', text.labels.maid),
    rel(tsuchiya.id, reijiro.id, 'professional', text.labels.secretary),
    rel(yuri.id, kuruno.id, 'professional', text.labels.secretary),
    rel(q.id, reijiro.id, 'witness', text.labels.discoveredDeath, 2, 'loop-2', 'confirmed'),
    rel(attic.id, reijiro.id, 'suspicion', text.labels.deathScene, 2, 'loop-2', 'confirmed'),
    rel(vase.id, attic.id, 'suspicion', text.labels.possibleWeapon, 2, 'loop-2', 'suspected'),
    rel(q.id, attic.id, 'other', text.labels.routeCheck, 7, 'loop-7', 'confirmed'),
    rel(q.id, reijiro.id, 'other', text.labels.preventDeath, 9, 'loop-9', 'confirmed'),
  ]);

  await Promise.all([
    createGroupRange({
      bookId,
      label: text.familyGroup,
      color: 'ochre',
      position: { x: -540, y: -510 },
      width: 1120,
      height: 760,
      labelFontSize: 34,
      labelPosition: { x: 0.54, y: 0.16 },
      chapterIntroduced: 1,
    }),
    createGroupRange({
      bookId,
      label: text.obaGroup,
      color: 'blue',
      position: { x: -485, y: -220 },
      width: 420,
      height: 500,
      labelFontSize: 24,
      labelPosition: { x: 0.36, y: 0.18 },
      chapterIntroduced: 1,
    }),
    createGroupRange({
      bookId,
      label: text.kaneGroup,
      color: 'green',
      position: { x: 105, y: -220 },
      width: 460,
      height: 500,
      labelFontSize: 24,
      labelPosition: { x: 0.55, y: 0.18 },
      chapterIntroduced: 1,
    }),
    createGroupRange({
      bookId,
      label: text.loopGroup,
      color: 'red',
      position: { x: -190, y: 325 },
      width: 520,
      height: 320,
      labelFontSize: 30,
      labelPosition: { x: 0.5, y: 0.18 },
      chapterIntroduced: 2,
      timeLayerId: 'loop-2',
    }),
    createGroupRange({
      bookId,
      label: text.loopGroup,
      color: 'violet',
      position: { x: -780, y: 330 },
      width: 430,
      height: 330,
      labelFontSize: 28,
      labelPosition: { x: 0.48, y: 0.2 },
      chapterIntroduced: 7,
      timeLayerId: 'loop-7',
    }),
  ]);

  await Promise.all([
    createAnnotation({
      bookId,
      content: text.startNote,
      position: { x: -820, y: -450 },
      width: 340,
      height: 180,
      color: 'yellow',
      fontSize: 18,
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: text.baselineNote,
      position: { x: -820, y: -220 },
      width: 340,
      height: 170,
      color: 'green',
      fontSize: 18,
      chapterIntroduced: 1,
      timeLayerId: 'loop-1',
    }),
    createAnnotation({
      bookId,
      content: text.discoveryNote,
      position: { x: 390, y: 360 },
      width: 350,
      height: 180,
      color: 'pink',
      fontSize: 18,
      chapterIntroduced: 2,
      timeLayerId: 'loop-2',
    }),
    createAnnotation({
      bookId,
      content: text.lateLoopNote,
      position: { x: -820, y: 600 },
      width: 350,
      height: 180,
      color: 'purple',
      fontSize: 18,
      chapterIntroduced: 7,
      timeLayerId: 'loop-7',
    }),
    createAnnotation({
      bookId,
      content: text.finalNote,
      position: { x: 610, y: 70 },
      width: 360,
      height: 180,
      color: 'blue',
      fontSize: 18,
      chapterIntroduced: 9,
      timeLayerId: 'loop-9',
    }),
  ]);

  return bookId;
}

export async function seedTutorialBook(options: SeedOptions = {}): Promise<string> {
  if (options.kind === 'ackroyd') return seedRogerAckroyd(options.userId, options.language ?? 'en');
  if (options.kind === 'contest') return seedContestTemplate(options.userId, options.language ?? 'en');
  if (options.kind === 'sevenDeaths') return seedSevenDeathsTimeLoop(options.userId, options.language ?? 'en');
  const language = options.language ?? 'en';
  const copy = tutorialCopy[language];
  const category = await findOrCreateCategory({ name: copy.category, userId: options.userId });
  const book = await createBook({
    userId: options.userId,
    title: copy.title,
    author: copy.author,
    totalChapters: 3,
    spoilerShield: true,
    categoryId: category.id,
  });
  const bookId = book.id;

  const hajime = await createCharacter({
    bookId,
    name: copy.hajime,
    role: 'detective',
    profession: language === 'ja' ? '高校生探偵' : language === 'zh-CN' ? '高中生侦探' : language === 'es' ? 'Detective de instituto' : 'High school detective',
    chapterIntroduced: 1,
    position: { x: -689.025, y: 60.356 },
    notes: language === 'ja'
      ? '推理視点の起点として、左側に置いておきます。'
      : language === 'zh-CN'
      ? '把他放在图的左侧，当作推理视角的锚点。'
      : language === 'es'
        ? 'Colócalo a la izquierda como ancla del punto de vista detectivesco.'
        : 'Place him on the left as the anchor for the deduction thread.',
  });

  const miyuki = await createCharacter({
    bookId,
    name: copy.miyuki,
    role: 'witness',
    profession: language === 'ja' ? '金田一の幼なじみ' : language === 'zh-CN' ? '金田一的青梅竹马' : language === 'es' ? 'Amiga de la infancia de Kindaichi' : "Kindaichi's childhood friend",
    chapterIntroduced: 1,
    position: { x: -1017.701, y: 79.148 },
  });

  const kenmochi = await createCharacter({
    bookId,
    name: copy.kenmochi,
    role: 'detective',
    profession: language === 'ja' ? '警視庁捜査一課警部' : language === 'zh-CN' ? '搜查一课警部' : language === 'es' ? 'Inspector de homicidios' : 'Tokyo homicide detective',
    chapterIntroduced: 2,
    position: { x: -916.68, y: -245.119 },
    notes: language === 'ja'
      ? `剣持は${copy.shino}の幼なじみで、その縁で金田一を巽家へ連れてきます。`
      : language === 'zh-CN'
      ? `剑持与${copy.shino}是儿时好友，所以才会带金田一来到巽家。`
      : language === 'es'
        ? `Kenmochi y ${copy.shino} son amigos de la infancia; por eso lleva a Kindaichi a la casa Tatsumi.`
        : `Kenmochi and ${copy.shino} are childhood friends, which is why he brings Kindaichi to the Tatsumi house.`,
  });

  const shino = await createCharacter({
    bookId,
    name: copy.shino,
    role: 'suspect',
    roleReveals: [{ role: 'murderer', chapterRevealed: 3 }],
    profession: language === 'ja' ? '巽家の後妻' : language === 'zh-CN' ? '巽家遗孀' : language === 'es' ? 'Viuda de la familia Tatsumi' : 'Widow of the Tatsumi family',
    chapterIntroduced: 1,
    position: { x: -275.553, y: -279.84 },
  });

  const ayako = await createCharacter({
    bookId,
    name: copy.ayako,
    role: 'other',
    profession: language === 'ja'
      ? '巽家の亡き先妻'
      : language === 'zh-CN'
      ? '巽家已故先妻'
      : language === 'es'
        ? 'Primera esposa fallecida de los Tatsumi'
        : 'Late first wife of the Tatsumi family',
    chapterIntroduced: 1,
    position: { x: 81.113, y: 215.868 },
  });

  const seimaru = await createCharacter({
    bookId,
    name: copy.seimaru,
    role: 'suspect',
    profession: language === 'ja' ? '紫乃の戸籍上の息子' : language === 'zh-CN' ? '紫乃名义上的儿子' : language === 'es' ? 'Hijo legal de Shino' : "Shino's legal son",
    chapterIntroduced: 1,
    position: { x: -213.488, y: 202.854 },
  });

  const ryunosuke = await createCharacter({
    bookId,
    name: copy.ryunosuke,
    role: 'suspect',
    profession: language === 'ja' ? '巽家の戸籍上の長男' : language === 'zh-CN' ? '巽家名义长子' : language === 'es' ? 'Hijo mayor legal de los Tatsumi' : "Tatsumi family's legal oldest son",
    chapterIntroduced: 1,
    position: { x: 333.888, y: -318.33 },
  });

  const hayato = await createCharacter({
    bookId,
    name: copy.hayato,
    role: 'suspect',
    profession: language === 'ja' ? '綾子の子、巽家の次男' : language === 'zh-CN' ? '绫子之子，巽家次子' : language === 'es' ? 'Hijo de Ayako; segundo hijo de los Tatsumi' : "Ayako's son; Tatsumi family's second son",
    chapterIntroduced: 1,
    position: { x: 631.189, y: -25.238 },
  });

  const moegi = await createCharacter({
    bookId,
    name: copy.moegi,
    role: 'witness',
    profession: language === 'ja' ? '綾子の娘、巽家の長女' : language === 'zh-CN' ? '绫子之女，巽家长女' : language === 'es' ? 'Hija de Ayako; hija mayor de los Tatsumi' : "Ayako's daughter; Tatsumi family's oldest daughter",
    chapterIntroduced: 2,
    position: { x: 435.159, y: 303.094 },
  });

  const fuyuki = await createCharacter({
    bookId,
    name: copy.fuyuki,
    role: 'suspect',
    profession: language === 'ja' ? '巽家の主治医' : language === 'zh-CN' ? '巽家医生' : language === 'es' ? 'Médico de la familia Tatsumi' : 'Tatsumi family doctor',
    chapterIntroduced: 2,
    position: { x: 83.333, y: -476.661 },
  });

  const senda = await createCharacter({
    bookId,
    name: copy.senda,
    role: 'suspect',
    profession: language === 'ja' ? '巽家の使用人' : language === 'zh-CN' ? '巽家佣人' : language === 'es' ? 'Sirviente de los Tatsumi' : 'Servant to the Tatsumi family',
    chapterIntroduced: 1,
    position: { x: 68.254, y: -113.411 },
  });

  const headless = await createCharacter({
    bookId,
    name: copy.headless,
    role: 'other',
    profession: language === 'ja' ? '仮面の別名' : language === 'zh-CN' ? '怪人别名' : language === 'es' ? 'Alias enmascarado' : 'Masked alias',
    chapterIntroduced: 1,
    position: { x: -500.155, y: -669.441 },
    aliases: [
      { name: copy.headless, chapterRevealed: 1 },
      {
        name: language === 'ja'
          ? `${copy.shino}（${copy.headless}）`
          : language === 'zh-CN'
          ? `${copy.shino}（${copy.headless}）`
          : `${copy.shino} (${copy.headless})`,
        chapterRevealed: 3,
      },
    ],
    notes: language === 'ja'
      ? 'チュートリアルでは、まず「正体不明の脅威」として記録します。第3話で実在の人物につながります。'
      : language === 'zh-CN'
      ? '教程里先把它当作“身份未知的威胁”记录；第 3 集再连接到真实人物。'
      : language === 'es'
        ? 'En el tutorial empieza como una amenaza sin identidad; el episodio 3 la conecta con una persona real.'
        : 'In the tutorial, keep this as an unidentified threat until episode 3 connects it to a real person.',
  });

  await attachHidaPortraits(bookId, [
    { character: hajime, key: 'hajime' },
    { character: miyuki, key: 'miyuki' },
    { character: kenmochi, key: 'kenmochi' },
    { character: shino, key: 'shino' },
    { character: seimaru, key: 'seimaru' },
    { character: ryunosuke, key: 'ryunosuke' },
    { character: hayato, key: 'hayato' },
    { character: moegi, key: 'moegi' },
    { character: fuyuki, key: 'fuyuki' },
    { character: senda, key: 'senda' },
    { character: headless, key: 'headless' },
  ]);

  await createRelationship({
    bookId,
    sourceId: hajime.id,
    targetId: miyuki.id,
    type: 'professional',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '同行' : language === 'zh-CN' ? '同行' : language === 'es' ? 'acompaña' : 'travels with',
  });
  await createRelationship({
    bookId,
    sourceId: hajime.id,
    targetId: seimaru.id,
    type: 'professional',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '飛騨へ同行' : language === 'zh-CN' ? '受邀到飞驒' : language === 'es' ? 'viaja a Hida' : 'called to Hida',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: seimaru.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '戸籍上の母子' : language === 'zh-CN' ? '名义母子' : language === 'es' ? 'madre legal-hijo' : 'legal mother-son',
  });
  await createRelationship({
    bookId,
    sourceId: ayako.id,
    targetId: hayato.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '実の母子' : language === 'zh-CN' ? '亲生母子' : language === 'es' ? 'madre biológica-hijo' : 'biological mother-son',
  });
  await createRelationship({
    bookId,
    sourceId: ayako.id,
    targetId: moegi.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '実の母娘' : language === 'zh-CN' ? '亲生母女' : language === 'es' ? 'madre biológica-hija' : 'biological mother-daughter',
  });
  await createRelationship({
    bookId,
    sourceId: ryunosuke.id,
    targetId: hayato.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '戸籍上の兄弟' : language === 'zh-CN' ? '名义兄弟' : language === 'es' ? 'hermanos legales' : 'legal brothers',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: ryunosuke.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '継母/継子' : language === 'zh-CN' ? '继母/继子' : language === 'es' ? 'madrastra-hijastro' : 'stepmother-stepson',
  });
  await createRelationship({
    bookId,
    sourceId: senda.id,
    targetId: shino.id,
    type: 'professional',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'ja' ? '仕える' : language === 'zh-CN' ? '侍奉' : language === 'es' ? 'sirve' : 'serves',
  });
  await createRelationship({
    bookId,
    sourceId: headless.id,
    targetId: shino.id,
    type: 'hostile',
    chapterRevealed: 1,
    certainty: 'suspected',
    label: language === 'ja' ? '脅迫状' : language === 'zh-CN' ? '威胁信' : language === 'es' ? 'amenaza' : 'warning',
  });
  await createRelationship({
    bookId,
    sourceId: kenmochi.id,
    targetId: hajime.id,
    type: 'professional',
    chapterRevealed: 2,
    certainty: 'confirmed',
    label: language === 'ja' ? '捜査に加わる' : language === 'zh-CN' ? '介入调查' : language === 'es' ? 'investiga con' : 'investigates with',
  });
  await createRelationship({
    bookId,
    sourceId: kenmochi.id,
    targetId: shino.id,
    type: 'other',
    chapterRevealed: 2,
    certainty: 'confirmed',
    label: language === 'ja'
      ? '幼なじみ'
      : language === 'zh-CN'
      ? '儿时好友'
      : language === 'es'
        ? 'amigos de infancia'
        : 'childhood friends',
    notes: language === 'ja'
      ? `剣持は${copy.shino}を幼いころから知っており、${copy.headless}からの脅迫を受けた彼女に頼まれて介入します。`
      : language === 'zh-CN'
      ? `剑持与${copy.shino}是儿时好友；她收到${copy.headless}的威胁后请他介入。`
      : language === 'es'
        ? `Kenmochi conoce a ${copy.shino} desde la infancia; ella le pide ayuda tras recibir la amenaza del ${copy.headless}.`
        : `Kenmochi has known ${copy.shino} since childhood; she asks him for help after receiving the ${copy.headless} threat.`,
  });
  await createRelationship({
    bookId,
    sourceId: fuyuki.id,
    targetId: shino.id,
    type: 'professional',
    chapterRevealed: 2,
    certainty: 'confirmed',
    label: language === 'ja' ? '主治医' : language === 'zh-CN' ? '家庭医生' : language === 'es' ? 'médico familiar' : 'family doctor',
  });
  await createRelationship({
    bookId,
    sourceId: moegi.id,
    targetId: hayato.id,
    type: 'family',
    chapterRevealed: 2,
    certainty: 'confirmed',
    label: language === 'ja' ? '実の兄妹' : language === 'zh-CN' ? '亲生兄妹' : language === 'es' ? 'hermanos biológicos' : 'biological siblings',
  });
  await createRelationship({
    bookId,
    sourceId: hajime.id,
    targetId: headless.id,
    type: 'suspicion',
    chapterRevealed: 3,
    certainty: 'suspected',
    label: language === 'ja' ? '仮面を追う' : language === 'zh-CN' ? '锁定假面' : language === 'es' ? 'sigue la máscara' : 'tracks the mask',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: headless.id,
    type: 'other',
    chapterRevealed: 3,
    certainty: 'confirmed',
    label: language === 'ja' ? '正体' : language === 'zh-CN' ? '真实身份' : language === 'es' ? 'identidad real' : 'true identity',
    notes: language === 'ja'
      ? `第3話で、${copy.headless}の正体が${copy.shino}だと明かされます。`
      : language === 'zh-CN'
      ? `第 3 集揭示：${copy.headless}的真实身份是${copy.shino}。`
      : language === 'es'
        ? `El episodio 3 revela que ${copy.shino} es la identidad real del ${copy.headless}.`
        : `Episode 3 reveals that ${copy.shino} is the real identity behind ${copy.headless}.`,
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: ryunosuke.id,
    type: 'family',
    chapterRevealed: 3,
    certainty: 'confirmed',
    label: language === 'ja' ? '実の母子' : language === 'zh-CN' ? '亲生母子' : language === 'es' ? 'madre biológica-hijo' : 'biological mother-son',
  });
  await createRelationship({
    bookId,
    sourceId: ayako.id,
    targetId: seimaru.id,
    type: 'family',
    chapterRevealed: 3,
    certainty: 'confirmed',
    label: language === 'ja' ? '実の母子' : language === 'zh-CN' ? '亲生母子' : language === 'es' ? 'madre biológica-hijo' : 'biological mother-son',
  });
  await createRelationship({
    bookId,
    sourceId: senda.id,
    targetId: ryunosuke.id,
    type: 'family',
    chapterRevealed: 3,
    certainty: 'confirmed',
    label: language === 'ja' ? '実の父子' : language === 'zh-CN' ? '亲生父子' : language === 'es' ? 'padre biológico-hijo' : 'biological father-son',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: senda.id,
    type: 'other',
    chapterRevealed: 3,
    certainty: 'confirmed',
    label: language === 'ja' ? '共犯' : language === 'zh-CN' ? '共犯' : language === 'es' ? 'cómplices' : 'co-conspirators',
  });

  await Promise.all([
    createGroupRange({
      bookId,
      label: copy.investigationGroup,
      color: 'blue',
      position: { x: -1064.181, y: -440.126 },
      width: 635,
      height: 889,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.18 },
      chapterIntroduced: 1,
    }),
    createGroupRange({
      bookId,
      label: copy.familyGroup,
      color: 'ochre',
      position: { x: -364.442, y: -492.777 },
      width: 1345,
      height: 1074,
      labelFontSize: 32,
      labelPosition: { x: 0.76, y: 0.201 },
      chapterIntroduced: 1,
    }),
  ]);

  await Promise.all([
    createAnnotation({
      bookId,
      content: copy.notes.start,
      position: { x: -1003.805, y: -627.063 },
      width: 432,
      height: 232,
      color: 'yellow',
      fontSize: 20,
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: copy.notes.chapters,
      position: { x: 706.189, y: -629.046 },
      width: 510,
      height: 202,
      color: 'blue',
      fontSize: 20,
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: copy.notes.edit,
      position: { x: -979.678, y: 519.918 },
      width: 515,
      height: 186,
      color: 'green',
      fontSize: 20,
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: copy.notes.groups,
      position: { x: 979.752, y: 463.577 },
      width: 452,
      height: 220,
      color: 'purple',
      fontSize: 20,
      chapterIntroduced: 1,
    }),
  ]);

  return bookId;
}
