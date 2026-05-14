import { createBook, updateBook } from '@/db/books';
import { createCharacter, updateCharacter } from '@/db/characters';
import { findOrCreateCategory } from '@/db/categories';
import { createRelationship, listRelationshipsByBook } from '@/db/relationships';
import { createAnnotation } from '@/db/annotations';
import { createGroupRange } from '@/db/groupRanges';
import { savePortrait } from '@/db/portraits';
import { computeForceLayout } from '@/lib/layout';
import { publicAsset } from '@/lib/publicAsset';
import { isRelationshipDirected } from '@/lib/relationshipTypes';
import type { ResolvedLanguage } from '@/stores/uiStore';
import type { Character, GroupRangeColor } from '@/types';

interface SeedOptions {
  userId?: string;
  language?: ResolvedLanguage;
  kind?: TutorialKind;
}

export type TutorialKind = 'ackroyd' | 'hida';

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

const DEMO_GROUP_NODE_WIDTH = 210;
const DEMO_GROUP_NODE_HEIGHT = 270;

function boundsForCharacters(
  characters: Character[],
  positions: Map<string, { x: number; y: number }>,
  padding = 90,
) {
  const points = characters
    .map((character) => positions.get(character.id) ?? character.position)
    .filter(Boolean);
  if (points.length === 0) return { position: { x: -180, y: -120 }, width: 360, height: 240 };

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x + DEMO_GROUP_NODE_WIDTH));
  const maxY = Math.max(...points.map((point) => point.y + DEMO_GROUP_NODE_HEIGHT));

  return {
    position: { x: Math.round(minX - padding), y: Math.round(minY - padding) },
    width: Math.round(maxX - minX + padding * 2),
    height: Math.round(maxY - minY + padding * 2),
  };
}

async function createDemoGroupRange(input: {
  bookId: string;
  label: string;
  characters: Character[];
  positions: Map<string, { x: number; y: number }>;
  color: GroupRangeColor;
  chapterIntroduced?: number;
  padding?: number;
}) {
  const bounds = boundsForCharacters(input.characters, input.positions, input.padding);
  await createGroupRange({
    bookId: input.bookId,
    label: input.label,
    color: input.color,
    chapterIntroduced: input.chapterIntroduced ?? 1,
    ...bounds,
  });
}

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
  secretGroup: string;
}> = {
  en: {
    start: 'Start here: this is your local tutorial copy. Move characters, edit labels, and delete anything; the public demo will stay unchanged for everyone else.',
    chapters: 'Try the chapter slider: chapter 2 shows the Fernly Park circle. Chapters 10 and 17 are highlighted, and chapter 27 is protected by Spoiler Shield.',
    edit: 'Try it: select Poirot, press E, then click another character to sketch a theory. Export Library when you want to keep your own backup.',
    detectiveGroup: 'Investigation view',
    householdGroup: 'Fernly Park circle',
    secretGroup: 'Hidden marriage thread',
  },
  'zh-CN': {
    start: '从这里开始：这是你的本地教程副本。拖动人物、修改标签、删除内容，都只影响你自己的浏览器，公开 demo 不会被改动。',
    chapters: '试试章节滑杆：第 2 章展示 Fernly Park 的主要人物圈；第 10、17 章被高亮，第 27 章由防剧透保护。',
    edit: '动手试试：选中 Poirot，按 E，再点击另一个人物，画一条自己的推理线。想保存时导出书库。',
    detectiveGroup: '调查视角',
    householdGroup: 'Fernly Park 人物圈',
    secretGroup: '隐藏婚姻线',
  },
  es: {
    start: 'Empieza aquí: esta es tu copia local del tutorial. Mueve personajes, edita etiquetas y borra lo que quieras; la demo pública no cambia para nadie más.',
    chapters: 'Prueba el control de capítulos: el capítulo 2 muestra el círculo de Fernly Park. Los capítulos 10 y 17 están destacados, y el 27 está protegido por el escudo anti-spoilers.',
    edit: 'Pruébalo: selecciona a Poirot, pulsa E y haz clic en otro personaje para dibujar una teoría. Exporta la biblioteca cuando quieras guardar una copia.',
    detectiveGroup: 'Mirada investigadora',
    householdGroup: 'Círculo de Fernly Park',
    secretGroup: 'Matrimonio oculto',
  },
  'pt-BR': {
    start: 'Comece aqui: esta é sua cópia local do tutorial. Mova personagens, edite rótulos e apague qualquer coisa; a demo pública continua igual para as outras pessoas.',
    chapters: 'Teste o controle de capítulos: o capítulo 2 mostra o círculo de Fernly Park. Os capítulos 10 e 17 ficam destacados, e o 27 é protegido pelo escudo anti-spoiler.',
    edit: 'Experimente: selecione Poirot, pressione E e clique em outro personagem para desenhar uma teoria. Exporte a biblioteca quando quiser guardar seu backup.',
    detectiveGroup: 'Ponto de vista da investigação',
    householdGroup: 'Círculo de Fernly Park',
    secretGroup: 'Casamento oculto',
  },
};

/**
 * Seeds the database with characters and relationships from
 * "The Murder of Roger Ackroyd" by Agatha Christie (1926).
 * This demo keeps the final culprit hidden until chapter 27. Spoiler Shield
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
    spoilerChapters: [27],
    highlightedChapters: [2, 10, 17],
    categoryId: category.id,
  });
  const bookId = book.id;
  await updateBook(bookId, { currentChapter: 2 });

  // ── Characters ──────────────────────────────────────────────────────────────
  const poirot = await createCharacter({
    bookId, name: 'Hercule Poirot', role: 'detective',
    profession: 'Retired detective', chapterIntroduced: 1,
    position: { x: 0, y: 0 },
    notes: 'Belgian detective, recently retired to King\'s Abbot to grow vegetable marrows.',
  });

  const sheppard = await createCharacter({
    bookId, name: 'Dr. James Sheppard', role: 'witness',
    roleReveals: [{ role: 'murderer', chapterRevealed: 27 }],
    profession: 'Village doctor', chapterIntroduced: 1,
    position: { x: -280, y: 80 },
    aliases: [{ name: 'Dr. James Sheppard', chapterRevealed: 1 }],
    notes: 'Village doctor and narrator. Assists Poirot with the investigation.',
  });

  const ackroyd = await createCharacter({
    bookId, name: 'Roger Ackroyd', role: 'victim',
    profession: 'Wealthy manufacturer', chapterIntroduced: 1,
    position: { x: 280, y: 80 },
    notes: 'Found murdered in his study at Fernly Park. Chapter 3.',
  });

  const flora = await createCharacter({
    bookId, name: 'Flora Ackroyd', role: 'suspect',
    profession: "Roger's niece", chapterIntroduced: 2,
    position: { x: 420, y: 220 },
    notes: 'Roger\'s niece, engaged to Ralph Paton. Claims she saw Roger alive at 9:45pm.',
  });

  const mrsAckroyd = await createCharacter({
    bookId, name: 'Mrs. Cecil Ackroyd', role: 'suspect',
    profession: "Roger's sister-in-law", chapterIntroduced: 2,
    position: { x: 180, y: 280 },
    notes: 'Roger\'s sister-in-law, dependent on his generosity.',
  });

  const blunt = await createCharacter({
    bookId, name: 'Major Hector Blunt', role: 'suspect',
    profession: 'Big-game hunter', chapterIntroduced: 2,
    position: { x: -160, y: 300 },
    notes: 'Old friend of Ackroyd. Taciturn man with feelings for Flora.',
  });

  const raymond = await createCharacter({
    bookId, name: 'Geoffrey Raymond', role: 'suspect',
    profession: "Roger's secretary", chapterIntroduced: 2,
    position: { x: 80, y: 360 },
    notes: 'Ackroyd\'s efficient young secretary.',
  });

  const ralph = await createCharacter({
    bookId, name: 'Ralph Paton', role: 'suspect',
    profession: 'Stepson', chapterIntroduced: 1,
    position: { x: -60, y: 220 },
    notes: 'Roger\'s stepson, heavily in debt. Disappears the night of the murder.',
  });

  const ursula = await createCharacter({
    bookId, name: 'the parlour maid', role: 'suspect',
    profession: 'Parlour maid at Fernly Park', chapterIntroduced: 2,
    position: { x: 60, y: 480 },
    aliases: [
      { name: 'the parlour maid', chapterRevealed: 2 },
      { name: 'Ursula Bourne', chapterRevealed: 14 },
      { name: 'Ursula Paton', chapterRevealed: 17 },
    ],
    notes: 'Parlour maid with a secret. Her real identity is concealed until later chapters.',
  });

  const caroline = await createCharacter({
    bookId, name: 'Caroline Sheppard', role: 'bystander',
    profession: "James's sister", chapterIntroduced: 1,
    position: { x: -420, y: 200 },
    notes: 'James\'s sharp-tongued sister, the village oracle of gossip.',
  });
  const characters = [
    poirot,
    sheppard,
    ackroyd,
    flora,
    mrsAckroyd,
    blunt,
    raymond,
    ralph,
    ursula,
    caroline,
  ];

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
    type: 'romantic', chapterRevealed: 2, certainty: 'confirmed',
    label: 'engaged',
  });

  // Ralph & Ursula (secret — revealed ch 17)
  await createRelationship({
    bookId, sourceId: ralph.id, targetId: ursula.id,
    type: 'romantic', chapterRevealed: 17, certainty: 'confirmed',
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
    type: 'romantic', chapterRevealed: 10, certainty: 'suspected',
    label: 'admires',
  });

  // Poirot suspicion of main suspect (deliberately vague — no spoilers)
  await createRelationship({
    bookId, sourceId: poirot.id, targetId: sheppard.id,
    type: 'suspicion', chapterRevealed: 20, certainty: 'suspected',
    label: 'suspects',
  });

  const relationships = await listRelationshipsByBook(bookId);
  const positions = computeForceLayout(
    characters.map((character) => character.id),
    relationships.map((relationship) => ({
      source: relationship.sourceId,
      target: relationship.targetId,
      directed: isRelationshipDirected(relationship),
    })),
  );
  await Promise.all(
    characters.map(async (character) => {
      const position = positions.get(character.id);
      if (position) await updateCharacter(character.id, { position });
    }),
  );

  await Promise.all([
    createDemoGroupRange({
      bookId,
      label: guide.detectiveGroup,
      characters: [poirot, sheppard, caroline],
      positions,
      color: 'blue',
      chapterIntroduced: 1,
      padding: 110,
    }),
    createDemoGroupRange({
      bookId,
      label: guide.householdGroup,
      characters: [ackroyd, flora, mrsAckroyd, blunt, raymond, ralph, ursula],
      positions,
      color: 'ochre',
      chapterIntroduced: 2,
      padding: 120,
    }),
    createDemoGroupRange({
      bookId,
      label: guide.secretGroup,
      characters: [ralph, ursula],
      positions,
      color: 'violet',
      chapterIntroduced: 17,
      padding: 95,
    }),
  ]);

  await Promise.all([
    createAnnotation({
      bookId,
      content: guide.start,
      position: { x: -600, y: -300 },
      width: 300,
      height: 128,
      color: 'yellow',
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: guide.chapters,
      position: { x: 340, y: -300 },
      width: 300,
      height: 140,
      color: 'blue',
      chapterIntroduced: 1,
    }),
    createAnnotation({
      bookId,
      content: guide.edit,
      position: { x: -600, y: 390 },
      width: 300,
      height: 132,
      color: 'green',
      chapterIntroduced: 1,
    }),
  ]);

  return bookId;
}

const tutorialCopy: Record<ResolvedLanguage, {
  category: string;
  title: string;
  author: string;
  hajime: string;
  miyuki: string;
  kenmochi: string;
  shino: string;
  seimaru: string;
  ryunosuke: string;
  hayato: string;
  moegi: string;
  fuyuki: string;
  senda: string;
  headless: string;
  note: string;
  investigationGroup: string;
  familyGroup: string;
  threatGroup: string;
}> = {
  en: {
    category: 'Tutorial',
    title: 'Hida Trick House Murder Case',
    author: 'The Kindaichi Case Files · TV 18-20',
    hajime: 'Hajime Kindaichi',
    miyuki: 'Miyuki Nanase',
    kenmochi: 'Isamu Kenmochi',
    shino: 'Shino Tatsumi',
    seimaru: 'Seimaru Tatsumi',
    ryunosuke: 'Ryunosuke Tatsumi',
    hayato: 'Hayato Tatsumi',
    moegi: 'Moegi Tatsumi',
    fuyuki: 'Rintaro Fuyuki',
    senda: 'Saruhiko Senda',
    headless: 'The Headless Samurai',
    note: 'TV 18: keep the mansion, the Tatsumi family, and the masked threat as separate clusters. Try selecting Kindaichi, press E, then click the Headless Samurai to add your own theory.',
    investigationGroup: 'Investigation team',
    familyGroup: 'Tatsumi family',
    threatGroup: 'Masked threat',
  },
  'zh-CN': {
    category: '教程',
    title: '飞驒机关宅邸杀人事件',
    author: '金田一少年事件簿 · TV 18-20',
    hajime: '金田一一',
    miyuki: '七濑美雪',
    kenmochi: '剑持勇',
    shino: '巽紫乃',
    seimaru: '巽征丸',
    ryunosuke: '巽龙之介',
    hayato: '巽隼人',
    moegi: '巽萌黄',
    fuyuki: '冬木伦太郎',
    senda: '仙田猿彦',
    headless: '首狩武者',
    note: 'TV 18：先别急着猜凶手。把机关宅邸、巽家成员、戴面具的威胁者分成三簇；试试看选中金田一，按 E，再点击首狩武者，补一条自己的怀疑线。',
    investigationGroup: '调查组',
    familyGroup: '巽家成员',
    threatGroup: '假面威胁',
  },
  es: {
    category: 'Tutorial',
    title: 'Caso de la mansión mecánica de Hida',
    author: 'The Kindaichi Case Files · TV 18-20',
    hajime: 'Hajime Kindaichi',
    miyuki: 'Miyuki Nanase',
    kenmochi: 'Isamu Kenmochi',
    shino: 'Shino Tatsumi',
    seimaru: 'Seimaru Tatsumi',
    ryunosuke: 'Ryunosuke Tatsumi',
    hayato: 'Hayato Tatsumi',
    moegi: 'Moegi Tatsumi',
    fuyuki: 'Rintaro Fuyuki',
    senda: 'Saruhiko Senda',
    headless: 'El samurái sin cabeza',
    note: 'TV 18: separa la mansión, la familia Tatsumi y la amenaza enmascarada en tres grupos. Prueba a seleccionar a Kindaichi, pulsa E y haz clic en el samurái para añadir tu propia teoría.',
    investigationGroup: 'Equipo investigador',
    familyGroup: 'Familia Tatsumi',
    threatGroup: 'Amenaza enmascarada',
  },
  'pt-BR': {
    category: 'Tutorial',
    title: 'Caso da Mansão Mecânica de Hida',
    author: 'The Kindaichi Case Files · TV 18-20',
    hajime: 'Hajime Kindaichi',
    miyuki: 'Miyuki Nanase',
    kenmochi: 'Isamu Kenmochi',
    shino: 'Shino Tatsumi',
    seimaru: 'Seimaru Tatsumi',
    ryunosuke: 'Ryunosuke Tatsumi',
    hayato: 'Hayato Tatsumi',
    moegi: 'Moegi Tatsumi',
    fuyuki: 'Rintaro Fuyuki',
    senda: 'Saruhiko Senda',
    headless: 'O samurai sem cabeça',
    note: 'TV 18: separe a mansão, a família Tatsumi e a ameaça mascarada em três grupos. Selecione Kindaichi, pressione E e clique no samurai para adicionar sua própria teoria.',
    investigationGroup: 'Equipe de investigação',
    familyGroup: 'Família Tatsumi',
    threatGroup: 'Ameaça mascarada',
  },
};

export async function seedTutorialBook(options: SeedOptions = {}): Promise<string> {
  if (options.kind === 'ackroyd') return seedRogerAckroyd(options.userId, options.language ?? 'en');
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
    profession: language === 'zh-CN' ? '高中生侦探' : language === 'es' ? 'Detective de instituto' : 'High school detective',
    chapterIntroduced: 1,
    position: { x: -340, y: -80 },
    notes: language === 'zh-CN'
      ? '把他放在图的左侧，当作推理视角的锚点。'
      : language === 'es'
        ? 'Colócalo a la izquierda como ancla del punto de vista detectivesco.'
        : 'Place him on the left as the anchor for the deduction thread.',
  });

  const miyuki = await createCharacter({
    bookId,
    name: copy.miyuki,
    role: 'witness',
    profession: language === 'zh-CN' ? '金田一的青梅竹马' : language === 'es' ? 'Amiga de la infancia de Kindaichi' : "Kindaichi's childhood friend",
    chapterIntroduced: 1,
    position: { x: -330, y: 110 },
  });

  const kenmochi = await createCharacter({
    bookId,
    name: copy.kenmochi,
    role: 'detective',
    profession: language === 'zh-CN' ? '搜查一课警部' : language === 'es' ? 'Inspector de homicidios' : 'Tokyo homicide detective',
    chapterIntroduced: 2,
    position: { x: -80, y: 260 },
  });

  const shino = await createCharacter({
    bookId,
    name: copy.shino,
    role: 'suspect',
    roleReveals: [{ role: 'murderer', chapterRevealed: 3 }],
    profession: language === 'zh-CN' ? '巽家遗孀' : language === 'es' ? 'Viuda de la familia Tatsumi' : 'Widow of the Tatsumi family',
    chapterIntroduced: 1,
    position: { x: 20, y: -120 },
  });

  const seimaru = await createCharacter({
    bookId,
    name: copy.seimaru,
    role: 'suspect',
    profession: language === 'zh-CN' ? '紫乃之子' : language === 'es' ? 'Hijo de Shino' : "Shino's son",
    chapterIntroduced: 1,
    position: { x: 260, y: -150 },
  });

  const ryunosuke = await createCharacter({
    bookId,
    name: copy.ryunosuke,
    role: 'suspect',
    profession: language === 'zh-CN' ? '巽家长子' : language === 'es' ? 'Hijo mayor de los Tatsumi' : "Tatsumi family's oldest son",
    chapterIntroduced: 1,
    position: { x: 260, y: 30 },
  });

  const hayato = await createCharacter({
    bookId,
    name: copy.hayato,
    role: 'suspect',
    profession: language === 'zh-CN' ? '巽家次子' : language === 'es' ? 'Segundo hijo de los Tatsumi' : "Tatsumi family's second son",
    chapterIntroduced: 1,
    position: { x: 500, y: 20 },
  });

  const moegi = await createCharacter({
    bookId,
    name: copy.moegi,
    role: 'witness',
    profession: language === 'zh-CN' ? '巽家长女' : language === 'es' ? 'Hija mayor de los Tatsumi' : "Tatsumi family's oldest daughter",
    chapterIntroduced: 2,
    position: { x: 500, y: 190 },
  });

  const fuyuki = await createCharacter({
    bookId,
    name: copy.fuyuki,
    role: 'suspect',
    profession: language === 'zh-CN' ? '巽家医生' : language === 'es' ? 'Médico de la familia Tatsumi' : 'Tatsumi family doctor',
    chapterIntroduced: 2,
    position: { x: 20, y: 220 },
  });

  const senda = await createCharacter({
    bookId,
    name: copy.senda,
    role: 'suspect',
    profession: language === 'zh-CN' ? '巽家佣人' : language === 'es' ? 'Sirviente de los Tatsumi' : 'Servant to the Tatsumi family',
    chapterIntroduced: 1,
    position: { x: 20, y: 60 },
  });

  const headless = await createCharacter({
    bookId,
    name: copy.headless,
    role: 'other',
    profession: language === 'zh-CN' ? '怪人别名' : language === 'es' ? 'Alias enmascarado' : 'Masked alias',
    chapterIntroduced: 1,
    position: { x: -90, y: -300 },
    notes: language === 'zh-CN'
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
    label: language === 'zh-CN' ? '同行' : language === 'es' ? 'acompaña' : 'travels with',
  });
  await createRelationship({
    bookId,
    sourceId: hajime.id,
    targetId: seimaru.id,
    type: 'professional',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '受邀到飞驒' : language === 'es' ? 'viaja a Hida' : 'called to Hida',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: seimaru.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '母子' : language === 'es' ? 'madre-hijo' : 'mother-son',
  });
  await createRelationship({
    bookId,
    sourceId: ryunosuke.id,
    targetId: hayato.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '兄弟' : language === 'es' ? 'hermanos' : 'brothers',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: ryunosuke.id,
    type: 'family',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '巽家' : language === 'es' ? 'familia Tatsumi' : 'Tatsumi family',
  });
  await createRelationship({
    bookId,
    sourceId: senda.id,
    targetId: shino.id,
    type: 'professional',
    chapterRevealed: 1,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '侍奉' : language === 'es' ? 'sirve' : 'serves',
  });
  await createRelationship({
    bookId,
    sourceId: headless.id,
    targetId: shino.id,
    type: 'hostile',
    chapterRevealed: 1,
    certainty: 'suspected',
    label: language === 'zh-CN' ? '威胁信' : language === 'es' ? 'amenaza' : 'warning',
  });
  await createRelationship({
    bookId,
    sourceId: kenmochi.id,
    targetId: hajime.id,
    type: 'professional',
    chapterRevealed: 2,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '介入调查' : language === 'es' ? 'investiga con' : 'investigates with',
  });
  await createRelationship({
    bookId,
    sourceId: fuyuki.id,
    targetId: shino.id,
    type: 'professional',
    chapterRevealed: 2,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '家庭医生' : language === 'es' ? 'médico familiar' : 'family doctor',
  });
  await createRelationship({
    bookId,
    sourceId: moegi.id,
    targetId: hayato.id,
    type: 'family',
    chapterRevealed: 2,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '兄妹' : language === 'es' ? 'hermanos' : 'siblings',
  });
  await createRelationship({
    bookId,
    sourceId: hajime.id,
    targetId: headless.id,
    type: 'suspicion',
    chapterRevealed: 3,
    certainty: 'suspected',
    label: language === 'zh-CN' ? '锁定假面' : language === 'es' ? 'sigue la máscara' : 'tracks the mask',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: headless.id,
    type: 'other',
    chapterRevealed: 3,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '真实身份' : language === 'es' ? 'identidad real' : 'true identity',
  });
  await createRelationship({
    bookId,
    sourceId: shino.id,
    targetId: senda.id,
    type: 'other',
    chapterRevealed: 3,
    certainty: 'confirmed',
    label: language === 'zh-CN' ? '共犯' : language === 'es' ? 'cómplices' : 'co-conspirators',
  });

  const hidaPositions = new Map([
    hajime, miyuki, kenmochi, shino, seimaru, ryunosuke,
    hayato, moegi, fuyuki, senda, headless,
  ].map((character) => [character.id, character.position] as const));

  await Promise.all([
    createDemoGroupRange({
      bookId,
      label: copy.investigationGroup,
      characters: [hajime, miyuki],
      positions: hidaPositions,
      color: 'blue',
      chapterIntroduced: 1,
      padding: 100,
    }),
    createDemoGroupRange({
      bookId,
      label: copy.familyGroup,
      characters: [shino, seimaru, ryunosuke, hayato, moegi],
      positions: hidaPositions,
      color: 'ochre',
      chapterIntroduced: 1,
      padding: 110,
    }),
    createDemoGroupRange({
      bookId,
      label: copy.threatGroup,
      characters: [headless, shino, senda],
      positions: hidaPositions,
      color: 'red',
      chapterIntroduced: 3,
      padding: 95,
    }),
  ]);

  await createAnnotation({
    bookId,
    content: copy.note,
    position: { x: -420, y: 210 },
    width: 260,
    height: 128,
    chapterIntroduced: 1,
  });

  return bookId;
}
