import { createBook, updateBook } from '@/db/books';
import { createCharacter, updateCharacter } from '@/db/characters';
import { findOrCreateCategory } from '@/db/categories';
import { createRelationship } from '@/db/relationships';
import { createAnnotation } from '@/db/annotations';
import { createGroupRange } from '@/db/groupRanges';
import { savePortrait } from '@/db/portraits';
import { createOpenClueDraft } from '@/lib/clues';
import { publicAsset } from '@/lib/publicAsset';
import type { CharacterNodeViewMode, ResolvedLanguage } from '@/stores/uiStore';
import type { Character } from '@/types';

interface SeedOptions {
  userId?: string;
  language?: ResolvedLanguage;
  kind?: TutorialKind;
}

export type TutorialKind = 'ackroyd' | 'hida' | 'contest';

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

const contestTemplateCopy: Record<ResolvedLanguage, {
  category: string;
  title: string;
  author: string;
  sections: {
    people: string;
    clues: string;
    timeline: string;
    suspicions: string;
    final: string;
  };
  notes: {
    people: string;
    clues: string;
    timeline: string;
    suspicions: string;
    final: string;
  };
  nodes: {
    suspectA: string;
    suspectB: string;
    witness: string;
    scene: string;
    evidence: string;
  };
  nodeDescriptions: {
    suspect: string;
    witness: string;
    scene: string;
    evidence: string;
  };
  relationships: {
    conflict: string;
    access: string;
    alibi: string;
  };
  openClues: string[];
}> = {
  en: {
    category: 'Templates',
    title: 'Mystery Puzzle / Contest Template',
    author: 'Blank case board',
    sections: {
      people: 'People Table',
      clues: 'Clues',
      timeline: 'Timeline',
      suspicions: 'Suspicions',
      final: 'Final Deduction',
    },
    notes: {
      people: 'Rename these placeholders as suspects, witnesses, locations, rooms, or evidence. Use the right sidebar for motive, opportunity, alibi, and notes.',
      clues: 'Clue card\nSource / quote:\nObserved fact:\nReliability:\nPoints to:\nContradicts:',
      timeline: 'Timeline row\nTime:\nWho was where:\nClaim / evidence:\nConflict to verify:',
      suspicions: 'Hypothesis\nIf this is true:\nSupporting clues:\nCounter-clues:\nWhat must be checked next:',
      final: 'Answer draft\nCulprit / method / motive:\nCore logic chain:\nHow each odd clue is explained:\nRemaining uncertainty:',
    },
    nodes: {
      suspectA: 'Suspect A',
      suspectB: 'Suspect B',
      witness: 'Witness / narrator',
      scene: 'Key location',
      evidence: 'Key evidence',
    },
    nodeDescriptions: {
      suspect: 'Rename and add motive, opportunity, alibi, and contradictions.',
      witness: 'Use for testimony, narration, or a source whose reliability matters.',
      scene: 'Use location or room nodes for floor plans and movement paths.',
      evidence: 'Use item nodes for physical evidence, documents, or puzzle props.',
    },
    relationships: {
      conflict: 'conflict?',
      access: 'access?',
      alibi: 'claims to be at',
    },
    openClues: [
      'Who had motive, means, and opportunity at the same time?',
      'Which timeline claim cannot be true with the other clues?',
      'Does the final answer explain every strange detail?',
    ],
  },
  'zh-CN': {
    category: '模板',
    title: '每谜 / 推理比赛模板',
    author: '空白案件看板',
    sections: {
      people: '人物表',
      clues: '线索区',
      timeline: '时间线',
      suspicions: '怀疑点',
      final: '最终推理区',
    },
    notes: {
      people: '把这些占位节点改成嫌疑人、证人、地点、房间或物证。右侧边栏可以记录动机、机会、不在场证明和备注。',
      clues: '线索卡\n来源 / 原文：\n观察到的事实：\n可靠性：\n指向谁：\n和什么矛盾：',
      timeline: '时间线\n时间点：\n谁在哪里：\n说法 / 证据：\n需要验证的矛盾：',
      suspicions: '假设\n如果这个猜想成立：\n支持线索：\n反证：\n下一步要验证：',
      final: '答案草稿\n凶手 / 手法 / 动机：\n核心逻辑链：\n每个异常线索如何解释：\n仍不确定的地方：',
    },
    nodes: {
      suspectA: '嫌疑人 A',
      suspectB: '嫌疑人 B',
      witness: '证人 / 叙述者',
      scene: '关键地点',
      evidence: '关键物证',
    },
    nodeDescriptions: {
      suspect: '改名后记录动机、机会、不在场证明和矛盾点。',
      witness: '适合记录证词、叙述视角，或可靠性需要判断的信息来源。',
      scene: '地点/房间节点适合配合平面图、行动路线和时间线使用。',
      evidence: '物品节点适合记录凶器、文件、谜题道具或关键图片。',
    },
    relationships: {
      conflict: '利益冲突？',
      access: '接触过？',
      alibi: '声称在',
    },
    openClues: [
      '谁同时具备动机、手段和机会？',
      '时间线里哪一句说法无法同时成立？',
      '最终答案能否解释所有异常线索？',
    ],
  },
  ja: {
    category: 'テンプレート',
    title: 'ミステリーパズル / コンテスト用テンプレート',
    author: '空の事件ボード',
    sections: {
      people: '人物表',
      clues: '手がかり',
      timeline: 'タイムライン',
      suspicions: '疑い',
      final: '最終推理',
    },
    notes: {
      people: 'このプレースホルダーを容疑者、証人、場所、部屋、証拠に変更します。右サイドバーで動機、機会、アリバイ、メモを記録できます。',
      clues: '手がかりカード\n出典 / 引用:\n観察された事実:\n信頼性:\n指し示す相手:\n矛盾する点:',
      timeline: 'タイムライン\n時刻:\n誰がどこにいたか:\n主張 / 証拠:\n確認すべき矛盾:',
      suspicions: '仮説\nこれが正しいなら:\n支持する手がかり:\n反証:\n次に確認すること:',
      final: '解答草案\n犯人 / 手口 / 動機:\n中心の論理:\n奇妙な手がかりの説明:\n残る不確実性:',
    },
    nodes: {
      suspectA: '容疑者 A',
      suspectB: '容疑者 B',
      witness: '証人 / 語り手',
      scene: '重要な場所',
      evidence: '重要な証拠',
    },
    nodeDescriptions: {
      suspect: '名前を変えて、動機、機会、アリバイ、矛盾点を追加します。',
      witness: '証言、語り、信頼性が重要な情報源に使います。',
      scene: '場所や部屋ノードは見取り図、移動経路、時間整理に使えます。',
      evidence: '物品ノードは凶器、書類、パズル道具、重要画像に使えます。',
    },
    relationships: {
      conflict: '対立?',
      access: '接触?',
      alibi: 'そこにいたと主張',
    },
    openClues: [
      '動機、手段、機会が同時にそろう人物は誰か？',
      'タイムライン上で同時に成立しない主張はどれか？',
      '最終解答はすべての奇妙な点を説明できるか？',
    ],
  },
  es: {
    category: 'Plantillas',
    title: 'Plantilla para acertijo / concurso de misterio',
    author: 'Tablero de caso en blanco',
    sections: {
      people: 'Personas',
      clues: 'Pistas',
      timeline: 'Cronología',
      suspicions: 'Sospechas',
      final: 'Deducción final',
    },
    notes: {
      people: 'Renombra estos marcadores como sospechosos, testigos, lugares, habitaciones o pruebas. Usa la barra derecha para motivo, oportunidad, coartada y notas.',
      clues: 'Ficha de pista\nFuente / cita:\nHecho observado:\nFiabilidad:\nSeñala a:\nContradice:',
      timeline: 'Cronología\nHora:\nQuién estaba dónde:\nAfirmación / prueba:\nConflicto a verificar:',
      suspicions: 'Hipótesis\nSi esto es cierto:\nPistas a favor:\nContraindicios:\nQué comprobar después:',
      final: 'Borrador de respuesta\nCulpable / método / motivo:\nCadena lógica:\nCómo explica cada rareza:\nDudas restantes:',
    },
    nodes: {
      suspectA: 'Sospechoso A',
      suspectB: 'Sospechoso B',
      witness: 'Testigo / narrador',
      scene: 'Lugar clave',
      evidence: 'Prueba clave',
    },
    nodeDescriptions: {
      suspect: 'Renombra y añade motivo, oportunidad, coartada y contradicciones.',
      witness: 'Úsalo para testimonios, narración o fuentes cuya fiabilidad importe.',
      scene: 'Los nodos de lugar o habitación sirven para planos y rutas.',
      evidence: 'Los nodos de objeto sirven para pruebas físicas, documentos o piezas del acertijo.',
    },
    relationships: {
      conflict: 'conflicto?',
      access: 'acceso?',
      alibi: 'dice estar en',
    },
    openClues: [
      '¿Quién tiene motivo, medios y oportunidad a la vez?',
      '¿Qué afirmación de la cronología no puede ser cierta?',
      '¿La respuesta final explica todos los detalles extraños?',
    ],
  },
  'pt-BR': {
    category: 'Modelos',
    title: 'Modelo para enigma / concurso de mistério',
    author: 'Quadro de caso em branco',
    sections: {
      people: 'Pessoas',
      clues: 'Pistas',
      timeline: 'Linha do tempo',
      suspicions: 'Suspeitas',
      final: 'Dedução final',
    },
    notes: {
      people: 'Renomeie estes marcadores como suspeitos, testemunhas, lugares, cômodos ou provas. Use a barra direita para motivo, oportunidade, álibi e notas.',
      clues: 'Cartão de pista\nFonte / citação:\nFato observado:\nConfiabilidade:\nAponta para:\nContradiz:',
      timeline: 'Linha do tempo\nHora:\nQuem estava onde:\nAfirmação / prova:\nConflito a verificar:',
      suspicions: 'Hipótese\nSe isto for verdade:\nPistas a favor:\nContraindícios:\nO que verificar depois:',
      final: 'Rascunho da resposta\nCulpado / método / motivo:\nCadeia lógica:\nComo explica cada detalhe estranho:\nIncertezas restantes:',
    },
    nodes: {
      suspectA: 'Suspeito A',
      suspectB: 'Suspeito B',
      witness: 'Testemunha / narrador',
      scene: 'Lugar-chave',
      evidence: 'Prova-chave',
    },
    nodeDescriptions: {
      suspect: 'Renomeie e adicione motivo, oportunidade, álibi e contradições.',
      witness: 'Use para depoimentos, narração ou fontes cuja confiabilidade importa.',
      scene: 'Nós de lugar ou cômodo ajudam com plantas e rotas.',
      evidence: 'Nós de objeto servem para provas físicas, documentos ou peças do enigma.',
    },
    relationships: {
      conflict: 'conflito?',
      access: 'acesso?',
      alibi: 'diz estar em',
    },
    openClues: [
      'Quem tem motivo, meio e oportunidade ao mesmo tempo?',
      'Qual afirmação da linha do tempo não pode ser verdadeira?',
      'A resposta final explica todos os detalhes estranhos?',
    ],
  },
};

export async function seedContestTemplate(userId?: string, language: ResolvedLanguage = 'en'): Promise<string> {
  const copy = contestTemplateCopy[language];
  const category = await findOrCreateCategory({ name: copy.category, userId });
  const book = await createBook({
    userId,
    title: copy.title,
    author: copy.author,
    totalChapters: 1,
    spoilerShield: false,
    highlightedChapters: [1],
    categoryId: category.id,
  });
  const bookId = book.id;

  const suspectA = await createCharacter({
    bookId,
    name: copy.nodes.suspectA,
    kind: 'character',
    role: 'suspect',
    profession: copy.nodeDescriptions.suspect,
    chapterIntroduced: 1,
    position: { x: -1040, y: -280 },
  });
  const suspectB = await createCharacter({
    bookId,
    name: copy.nodes.suspectB,
    kind: 'character',
    role: 'suspect',
    profession: copy.nodeDescriptions.suspect,
    chapterIntroduced: 1,
    position: { x: -1040, y: -140 },
  });
  const witness = await createCharacter({
    bookId,
    name: copy.nodes.witness,
    kind: 'testimony',
    role: 'witness',
    profession: copy.nodeDescriptions.witness,
    chapterIntroduced: 1,
    position: { x: -1040, y: 0 },
  });
  const scene = await createCharacter({
    bookId,
    name: copy.nodes.scene,
    kind: 'location',
    role: 'other',
    profession: copy.nodeDescriptions.scene,
    chapterIntroduced: 1,
    position: { x: -1040, y: 140 },
  });
  const evidence = await createCharacter({
    bookId,
    name: copy.nodes.evidence,
    kind: 'item',
    role: 'other',
    profession: copy.nodeDescriptions.evidence,
    chapterIntroduced: 1,
    position: { x: -1040, y: 280 },
  });

  await Promise.all([
    createRelationship({
      bookId,
      sourceId: suspectA.id,
      targetId: suspectB.id,
      type: 'hostile',
      chapterRevealed: 1,
      certainty: 'suspected',
      label: copy.relationships.conflict,
    }),
    createRelationship({
      bookId,
      sourceId: suspectA.id,
      targetId: evidence.id,
      type: 'suspicion',
      chapterRevealed: 1,
      certainty: 'suspected',
      label: copy.relationships.access,
    }),
    createRelationship({
      bookId,
      sourceId: witness.id,
      targetId: scene.id,
      type: 'other',
      chapterRevealed: 1,
      certainty: 'suspected',
      label: copy.relationships.alibi,
    }),
  ]);

  await Promise.all([
    createGroupRange({
      bookId,
      label: copy.sections.people,
      color: 'blue',
      position: { x: -1180, y: -470 },
      width: 680,
      height: 900,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.12 },
      chapterIntroduced: 1,
      locked: true,
    }),
    createGroupRange({
      bookId,
      label: copy.sections.clues,
      color: 'green',
      position: { x: -430, y: -470 },
      width: 760,
      height: 420,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.16 },
      chapterIntroduced: 1,
      locked: true,
    }),
    createGroupRange({
      bookId,
      label: copy.sections.timeline,
      color: 'violet',
      position: { x: -430, y: 10 },
      width: 760,
      height: 420,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.16 },
      chapterIntroduced: 1,
      locked: true,
    }),
    createGroupRange({
      bookId,
      label: copy.sections.suspicions,
      color: 'red',
      position: { x: 410, y: -470 },
      width: 720,
      height: 420,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.16 },
      chapterIntroduced: 1,
      locked: true,
    }),
    createGroupRange({
      bookId,
      label: copy.sections.final,
      color: 'ochre',
      position: { x: 410, y: 10 },
      width: 720,
      height: 420,
      labelFontSize: 32,
      labelPosition: { x: 0.5, y: 0.16 },
      chapterIntroduced: 1,
      locked: true,
    }),
  ]);

  await Promise.all([
    createAnnotation({
      bookId,
      content: copy.notes.people,
      position: { x: -820, y: -300 },
      width: 280,
      height: 310,
      color: 'blue',
      fontSize: 16,
      chapterIntroduced: 1,
      locked: true,
    }),
    createAnnotation({
      bookId,
      content: copy.notes.clues,
      position: { x: -265, y: -335 },
      width: 500,
      height: 245,
      color: 'green',
      fontSize: 16,
      chapterIntroduced: 1,
      locked: true,
    }),
    createAnnotation({
      bookId,
      content: copy.notes.timeline,
      position: { x: -265, y: 145 },
      width: 500,
      height: 245,
      color: 'purple',
      fontSize: 16,
      chapterIntroduced: 1,
      locked: true,
    }),
    createAnnotation({
      bookId,
      content: copy.notes.suspicions,
      position: { x: 565, y: -335 },
      width: 430,
      height: 245,
      color: 'pink',
      fontSize: 16,
      chapterIntroduced: 1,
      locked: true,
    }),
    createAnnotation({
      bookId,
      content: copy.notes.final,
      position: { x: 565, y: 145 },
      width: 430,
      height: 245,
      color: 'yellow',
      fontSize: 16,
      chapterIntroduced: 1,
      locked: true,
    }),
  ]);

  await updateBook(bookId, {
    openClues: copy.openClues.map((text) => createOpenClueDraft(text, 1)),
  });

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

export async function seedTutorialBook(options: SeedOptions = {}): Promise<string> {
  if (options.kind === 'ackroyd') return seedRogerAckroyd(options.userId, options.language ?? 'en');
  if (options.kind === 'contest') return seedContestTemplate(options.userId, options.language ?? 'en');
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
