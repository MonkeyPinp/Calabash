import { createBook } from '@/db/books';
import { createCharacter } from '@/db/characters';
import { createRelationship } from '@/db/relationships';

// ─── One Hundred Years of Solitude ──────────────────────────────────────────

/**
 * Seeds the Buendía family tree from Gabriel García Márquez's
 * "One Hundred Years of Solitude" (1967). Covers all six generations
 * across 20 chapters. Returns the new bookId.
 */
export async function seedHundredYearsSolitude(): Promise<string> {
  const book = await createBook({
    title: 'One Hundred Years of Solitude',
    author: 'Gabriel García Márquez',
    totalChapters: 20,
  });
  const bookId = book.id;

  // ── Generation 0 — Founders ────────────────────────────────────────────────
  const jose = await createCharacter({
    bookId, name: 'José Arcadio Buendía', role: 'other',
    profession: 'Patriarch, founder of Macondo', chapterIntroduced: 1,
    position: { x: 0, y: 0 },
    notes: 'Visionary founder of Macondo. Obsession with alchemy and science ultimately drove him mad — he spent his last years tied to a chestnut tree.',
  });
  const ursula = await createCharacter({
    bookId, name: 'Úrsula Iguarán', role: 'other',
    profession: 'Matriarch', chapterIntroduced: 1,
    position: { x: -220, y: 0 },
    notes: 'Indomitable matriarch who outlives multiple generations and holds the family together through sheer force of will.',
  });
  const melquiades = await createCharacter({
    bookId, name: 'Melquíades', role: 'other',
    profession: 'Gypsy sage', chapterIntroduced: 1,
    position: { x: 380, y: 0 },
    notes: 'Ancient gypsy who brings magnets, ice, and prophecy to Macondo. His Sanskrit manuscripts, sealed in his room, record the entire Buendía fate.',
  });

  // ── Generation 1 — Children of José and Úrsula ────────────────────────────
  const aureliano = await createCharacter({
    bookId, name: 'Colonel Aureliano Buendía', role: 'other',
    profession: 'Military commander', chapterIntroduced: 1,
    position: { x: -220, y: 200 },
    notes: 'Led 32 armed uprisings; survived 14 assassination attempts and a self-inflicted gunshot. In peacetime he made and melted little gold fish, endlessly.',
  });
  const joseHijo = await createCharacter({
    bookId, name: 'José Arcadio (hijo)', role: 'other',
    profession: 'Adventurer', chapterIntroduced: 1,
    position: { x: 180, y: 200 },
    notes: 'Enormous and tattooed. Ran off with the gypsies as a teenager, returned years later and eloped with Rebeca, shocking the town.',
  });
  const amaranta = await createCharacter({
    bookId, name: 'Amaranta', role: 'other',
    profession: 'Seamstress', chapterIntroduced: 2,
    position: { x: -460, y: 200 },
    notes: 'Youngest daughter of the founders. Kept burning love at arm\'s length out of bitter pride; spent her final years weaving her own burial shroud.',
  });
  const rebeca = await createCharacter({
    bookId, name: 'Rebeca', role: 'other',
    profession: 'Adopted daughter', chapterIntroduced: 2,
    position: { x: -640, y: 160 },
    notes: 'Arrived carrying her parents\' bones in a bag, eating earth and lime off the walls. Adopted by Úrsula, later eloped with José Arcadio hijo.',
  });

  // ── External — connected to generation 1 ──────────────────────────────────
  const pilar = await createCharacter({
    bookId, name: 'Pilar Ternera', role: 'other',
    profession: 'Fortune teller', chapterIntroduced: 2,
    position: { x: 300, y: 320 },
    notes: 'Ageless fortune teller and brothel-keeper who reads fate in a greasy pack of cards. Had children by both Buendía sons.',
  });
  const pietro = await createCharacter({
    bookId, name: 'Pietro Crespi', role: 'victim',
    profession: 'Italian musician', chapterIntroduced: 3,
    position: { x: -540, y: 360 },
    notes: 'Delicate Italian who came to install an automated music box. Destroyed by Amaranta\'s twice-repeated rejection; died by suicide with his wrists slashed over his account books.',
  });

  // ── Generation 2 ──────────────────────────────────────────────────────────
  const arcadio = await createCharacter({
    bookId, name: 'Arcadio', role: 'suspect',
    profession: 'Schoolteacher-turned-tyrant', chapterIntroduced: 3,
    position: { x: 250, y: 440 },
    notes: 'Son of José Arcadio hijo and Pilar Ternera, raised not knowing his parentage. Became a brutal local dictator during the civil war; executed by firing squad.',
  });

  // ── Generation 3 — Arcadio's children ────────────────────────────────────
  const remediosBella = await createCharacter({
    bookId, name: 'Remedios la Bella', role: 'other',
    profession: '—', chapterIntroduced: 11,
    position: { x: -100, y: 600 },
    notes: 'Of surpassing, lethal beauty — men who crossed her path died in accidents. One afternoon she ascended bodily to heaven, taking Fernanda\'s good sheets with her.',
  });
  const segundoA = await createCharacter({
    bookId, name: 'Aureliano Segundo', role: 'other',
    profession: 'Landowner', chapterIntroduced: 11,
    position: { x: 160, y: 600 },
    notes: 'Twin grandson and glorious hedonist. Hosted legendary banquets and lived a double life between his wife Fernanda and his beloved Petra Cotes.',
  });
  const segundoJ = await createCharacter({
    bookId, name: 'José Arcadio Segundo', role: 'witness',
    profession: 'Union organiser', chapterIntroduced: 11,
    position: { x: 400, y: 600 },
    notes: 'The other twin. The only man who remembered the banana company massacre — three thousand bodies heaped on a train and dumped in the sea. The government erased all record of it.',
  });

  // ── External — connected to generation 3 ─────────────────────────────────
  const fernanda = await createCharacter({
    bookId, name: 'Fernanda del Carpio', role: 'other',
    profession: 'Aristocrat\'s daughter', chapterIntroduced: 13,
    position: { x: 300, y: 490 },
    notes: 'Cold, rigidly pious wife of Aureliano Segundo. Brought an elaborate 150-page liturgical calendar specifying which days she permitted intimacy.',
  });
  const petra = await createCharacter({
    bookId, name: 'Petra Cotes', role: 'other',
    profession: 'Lottery vendor', chapterIntroduced: 11,
    position: { x: 560, y: 510 },
    notes: 'Aureliano Segundo\'s lifelong lover. Their passion caused her animals to multiply in miraculous abundance.',
  });

  // ── Generation 4 — Aureliano Segundo's children ───────────────────────────
  const meme = await createCharacter({
    bookId, name: 'Meme (Renata Remedios)', role: 'victim',
    profession: 'Student', chapterIntroduced: 14,
    position: { x: 200, y: 760 },
    notes: 'Daughter of Aureliano Segundo and Fernanda. Fell passionately in love with Mauricio Babilonia. After Fernanda had him shot, Meme never spoke again and was shut in a convent.',
  });
  const mauricio = await createCharacter({
    bookId, name: 'Mauricio Babilonia', role: 'victim',
    profession: 'Mechanic', chapterIntroduced: 15,
    position: { x: 460, y: 680 },
    notes: 'Meme\'s lover, always preceded by a cloud of yellow butterflies. Shot by a guard on Fernanda\'s orders; paralysed for the rest of his life.',
  });

  // ── Generation 5 — the last Buendía ──────────────────────────────────────
  const aurelianoLast = await createCharacter({
    bookId, name: 'Aureliano (the last)', role: 'other',
    profession: 'Scholar', chapterIntroduced: 17,
    position: { x: 360, y: 920 },
    notes: 'Son of Meme and Mauricio Babilonia, raised as a foundling. Spent years in Melquíades\' room decoding the parchments — only to find they prophesied the entire Buendía history, including his own annihilation.',
  });

  // ── Relationships ─────────────────────────────────────────────────────────

  // Founding couple
  await createRelationship({
    bookId, sourceId: ursula.id, targetId: jose.id,
    type: 'family', direction: 'both', chapterRevealed: 1, certainty: 'confirmed',
    label: 'married',
  });
  // José ↔ Melquíades
  await createRelationship({
    bookId, sourceId: jose.id, targetId: melquiades.id,
    type: 'professional', direction: 'forward', chapterRevealed: 1, certainty: 'confirmed',
    label: 'obsessed with',
    notes: 'Traded his mule for a magnet, a magnifying glass, and eventually an astrolabe. Melquíades became his spiritual guide.',
  });
  // Colonel Aureliano ↔ Melquíades manuscripts
  await createRelationship({
    bookId, sourceId: aureliano.id, targetId: melquiades.id,
    type: 'professional', direction: 'forward', chapterRevealed: 1, certainty: 'confirmed',
    label: 'seeks prophecy of',
  });

  // José Arcadio Buendía → children
  await createRelationship({
    bookId, sourceId: jose.id, targetId: aureliano.id,
    type: 'family', direction: 'forward', chapterRevealed: 1, certainty: 'confirmed',
    label: 'father → son',
  });
  await createRelationship({
    bookId, sourceId: jose.id, targetId: joseHijo.id,
    type: 'family', direction: 'forward', chapterRevealed: 1, certainty: 'confirmed',
    label: 'father → son',
  });
  await createRelationship({
    bookId, sourceId: jose.id, targetId: amaranta.id,
    type: 'family', direction: 'forward', chapterRevealed: 2, certainty: 'confirmed',
    label: 'father → daughter',
  });
  await createRelationship({
    bookId, sourceId: ursula.id, targetId: rebeca.id,
    type: 'family', direction: 'forward', chapterRevealed: 2, certainty: 'confirmed',
    label: 'adopted',
  });

  // Generation 1 romantic
  await createRelationship({
    bookId, sourceId: joseHijo.id, targetId: pilar.id,
    type: 'romantic', direction: 'both', chapterRevealed: 2, certainty: 'confirmed',
    label: 'affair',
  });
  await createRelationship({
    bookId, sourceId: aureliano.id, targetId: pilar.id,
    type: 'romantic', direction: 'both', chapterRevealed: 3, certainty: 'confirmed',
    label: 'affair',
  });
  await createRelationship({
    bookId, sourceId: joseHijo.id, targetId: rebeca.id,
    type: 'romantic', direction: 'both', chapterRevealed: 5, certainty: 'confirmed',
    label: 'married (eloped)',
    notes: 'Shocked everyone — Rebeca had been engaged to Pietro Crespi.',
  });
  await createRelationship({
    bookId, sourceId: amaranta.id, targetId: pietro.id,
    type: 'romantic', direction: 'both', chapterRevealed: 3, certainty: 'confirmed',
    label: 'tragic love',
    notes: 'Loved Pietro, refused him twice from bitter pride. He cut his wrists. She wore a black bandage on her burnt hand for the rest of her life.',
  });

  // Pilar → Arcadio
  await createRelationship({
    bookId, sourceId: pilar.id, targetId: arcadio.id,
    type: 'family', direction: 'forward', chapterRevealed: 3, certainty: 'confirmed',
    label: 'mother → son',
  });

  // Arcadio → generation 3
  await createRelationship({
    bookId, sourceId: arcadio.id, targetId: remediosBella.id,
    type: 'family', direction: 'forward', chapterRevealed: 11, certainty: 'confirmed',
    label: 'father → daughter',
  });
  await createRelationship({
    bookId, sourceId: arcadio.id, targetId: segundoA.id,
    type: 'family', direction: 'forward', chapterRevealed: 11, certainty: 'confirmed',
    label: 'father → son',
  });
  await createRelationship({
    bookId, sourceId: arcadio.id, targetId: segundoJ.id,
    type: 'family', direction: 'forward', chapterRevealed: 11, certainty: 'confirmed',
    label: 'father → son',
  });

  // Twins
  await createRelationship({
    bookId, sourceId: segundoA.id, targetId: segundoJ.id,
    type: 'family', direction: 'both', chapterRevealed: 11, certainty: 'confirmed',
    label: 'twins',
    notes: 'So alike even their mother confused them. May have quietly swapped identities in childhood.',
  });

  // Aureliano Segundo's love life
  await createRelationship({
    bookId, sourceId: segundoA.id, targetId: fernanda.id,
    type: 'family', direction: 'both', chapterRevealed: 13, certainty: 'confirmed',
    label: 'married',
  });
  await createRelationship({
    bookId, sourceId: segundoA.id, targetId: petra.id,
    type: 'romantic', direction: 'both', chapterRevealed: 11, certainty: 'confirmed',
    label: 'lifelong lover',
    notes: 'Their passion caused Petra\'s animals to multiply magically. He died calling her name.',
  });
  await createRelationship({
    bookId, sourceId: segundoA.id, targetId: meme.id,
    type: 'family', direction: 'forward', chapterRevealed: 14, certainty: 'confirmed',
    label: 'father → daughter',
  });

  // Meme & Mauricio
  await createRelationship({
    bookId, sourceId: meme.id, targetId: mauricio.id,
    type: 'romantic', direction: 'both', chapterRevealed: 15, certainty: 'confirmed',
    label: 'forbidden love',
    notes: 'Their meetings were heralded by swarms of yellow butterflies. Fernanda had Mauricio shot in her yard.',
  });
  await createRelationship({
    bookId, sourceId: meme.id, targetId: aurelianoLast.id,
    type: 'family', direction: 'forward', chapterRevealed: 17, certainty: 'confirmed',
    label: 'mother → son',
    notes: 'Meme gave birth in silence and was enclosed in a convent. The boy was left on Úrsula\'s doorstep in a basket.',
  });

  return bookId;
}

/**
 * Seeds the database with characters and relationships from
 * "The Murder of Roger Ackroyd" by Agatha Christie (1926).
 * Certainties are deliberately kept at 'suspected' to avoid spoilers.
 * Returns the new bookId.
 */
export async function seedRogerAckroyd(): Promise<string> {
  const book = await createBook({
    title: 'The Murder of Roger Ackroyd',
    author: 'Agatha Christie',
    totalChapters: 27,
  });
  const bookId = book.id;

  // ── Characters ──────────────────────────────────────────────────────────────
  const poirot = await createCharacter({
    bookId, name: 'Hercule Poirot', role: 'detective',
    profession: 'Retired detective', chapterIntroduced: 1,
    position: { x: 0, y: 0 },
    notes: 'Belgian detective, recently retired to King\'s Abbot to grow vegetable marrows.',
  });

  const sheppard = await createCharacter({
    bookId, name: 'Dr. James Sheppard', role: 'witness',
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

  return bookId;
}
