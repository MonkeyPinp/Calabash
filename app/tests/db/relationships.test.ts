import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/schema';
import {
  createRelationship,
  getRelationship,
  listRelationshipsByBook,
  updateRelationship,
  deleteRelationship,
} from '@/db/relationships';

describe('relationships DAO', () => {
  beforeEach(async () => {
    await db.relationships.clear();
  });

  it('createRelationship assigns id and defaults certainty to suspected', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't',
      type: 'suspicion', chapterRevealed: 3,
    });
    expect(r.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.certainty).toBe('suspected');
  });

  it('createRelationship honours explicit certainty', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't',
      type: 'family', chapterRevealed: 1, certainty: 'confirmed',
    });
    expect(r.certainty).toBe('confirmed');
  });

  it('accepts custom and blank optional relationship types', async () => {
    const custom = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't',
      type: 'mentor', chapterRevealed: 1, directed: true,
    });
    const untyped = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 'u',
      type: '   ', chapterRevealed: 1,
    });

    expect(custom.type).toBe('mentor');
    expect(custom.directed).toBe(true);
    expect(untyped.type).toBeUndefined();
  });

  it('listRelationshipsByBook scopes to one book', async () => {
    await createRelationship({ bookId: 'A', sourceId: 's', targetId: 't', type: 'family', chapterRevealed: 1 });
    await createRelationship({ bookId: 'B', sourceId: 's', targetId: 't', type: 'family', chapterRevealed: 1 });
    const a = await listRelationshipsByBook('A');
    expect(a).toHaveLength(1);
    expect(a[0].bookId).toBe('A');
  });

  it('updateRelationship merges fields', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't', type: 'suspicion', chapterRevealed: 1,
    });
    const u = await updateRelationship(r.id, { certainty: 'confirmed' });
    expect(u.certainty).toBe('confirmed');
  });

  it('deleteRelationship removes the row', async () => {
    const r = await createRelationship({
      bookId: 'b', sourceId: 's', targetId: 't', type: 'family', chapterRevealed: 1,
    });
    await deleteRelationship(r.id);
    expect(await getRelationship(r.id)).toBeUndefined();
  });
});
