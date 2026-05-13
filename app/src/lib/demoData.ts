import { createBook } from '@/db/books';
import { createCharacter } from '@/db/characters';
import { createRelationship } from '@/db/relationships';

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
