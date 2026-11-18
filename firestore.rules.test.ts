import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');
const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8')) as {
  entities: Record<string, { properties: Record<string, unknown>; required?: string[] }>;
  firestore: Record<string, unknown>;
};

describe('Firestore Security Rules & Blueprint Integrity (Eight Pillars)', () => {
  it('starts with rules_version = 2 and global default-deny catch-all', () => {
    expect(rulesContent).toContain("rules_version = '2';");
    expect(rulesContent).toContain('match /{document=**}');
    expect(rulesContent).toContain('allow read, write: if false;');
  });

  it('enforces Path Variable Hardening (isValidId) and strict list query gates', () => {
    expect(rulesContent).toContain('function isValidId(id)');
    expect(rulesContent).toContain('allow list: if false;');
    expect(rulesContent).toContain(
      "allow list: if isSignedIn() && resource.data.uid == request.auth.uid;",
    );
    expect(rulesContent).toContain(
      "allow list: if resource.data.visibility == 'public';",
    );
    expect(rulesContent).not.toContain('allow list: if isSignedIn();');
    expect(rulesContent).not.toContain('allow read: if isSignedIn();');
  });

  it('enforces Master Gate exists() on user routines subcollection and email verification', () => {
    expect(rulesContent).toContain('function isEmailVerified()');
    expect(rulesContent).toContain(
      'exists(/databases/$(database)/documents/users/$(userId))',
    );
  });

  it('enforces temporal integrity (request.time) and immutable owner/timestamp fields', () => {
    expect(rulesContent).toContain('incoming().createdAt == request.time');
    expect(rulesContent).toContain('incoming().updatedAt == request.time');
    expect(rulesContent).toContain('incoming().createdAt == existing().createdAt');
    expect(rulesContent).toContain('incoming().uid == existing().uid');
    expect(rulesContent).toContain('incoming().authorUid == existing().authorUid');
  });

  it('enforces action-based affectedKeys().hasOnly() and array allowlists', () => {
    expect(rulesContent).toContain('affectedKeys().hasOnly([');
    expect(rulesContent).toContain('data.keys().hasAll([');
    expect(rulesContent).toContain('data.keys().hasOnly([');
    expect(rulesContent).toContain(
      "data.sensitiveGroups.hasOnly(['children', 'seniors', 'asthma_respiratory', 'pregnant'])",
    );
    expect(rulesContent).toContain(
      "data.indoorGear.hasOnly(['hepa_purifier', 'box_fan_diy', 'kitchen_exhaust', 'window_seals', 'hygrometer', 'n95_masks'])",
    );
  });

  it('covers every collection in firebase-blueprint.json with a matching rule block', () => {
    const collectionPaths = Object.keys(blueprint.firestore);
    expect(collectionPaths).toEqual([
      '/users/{userId}',
      '/users/{userId}/routines/{routineId}',
      '/community_pledges/{pledgeId}',
      '/smog_reports/{reportId}',
    ]);

    expect(rulesContent).toContain('match /users/{userId}');
    expect(rulesContent).toContain('match /routines/{routineId}');
    expect(rulesContent).toContain('match /community_pledges/{pledgeId}');
    expect(rulesContent).toContain('match /smog_reports/{reportId}');
  });
});
