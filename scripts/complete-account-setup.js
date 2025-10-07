const { hash } = require('@node-rs/argon2');
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { users, credentials } = require('../apps/patient-portal-web/lib/schema');
const crypto = require('crypto');

async function completeAccountSetup() {
  const patientId = '31573119-7d11-4753-9d54-a39be72e2cb4';
  const upi = 'UPI724E0A';
  const displayName = 'Sam Aluri';
  const password = 'Sam@#$0606';
  
  const pepper = process.env.ARGON2_PEPPER;
  if (!pepper) {
    throw new Error('ARGON2_PEPPER not found in environment');
  }

  const client = postgres(process.env.DATABASE_URL);
  const db = drizzle(client);

  try {
    // Hash password with pepper
    const pepperedPassword = password + pepper;
    const passwordHash = await hash(pepperedPassword, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    console.log('Password hashed successfully');

    // Create user record
    const userId = crypto.randomUUID();
    await db.insert(users).values({
      userId,
      patientId,
      displayName,
      isActive: true,
      createdAt: new Date(),
      mfaEnabled: false,
    });

    console.log('User record created:', userId);

    // Create password credential
    await db.insert(credentials).values({
      userId,
      credentialType: 'password',
      passwordHash,
      createdAt: new Date(),
    });

    console.log('Password credential created successfully');
    console.log(`Account setup complete for ${upi}`);
    
  } catch (error) {
    console.error('Error completing account setup:', error);
    throw error;
  } finally {
    await client.end();
  }
}

completeAccountSetup().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
