// packages/config/src/azure.ts
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { ServiceBusClient, ServiceBusMessage } from "@azure/service-bus";

const credential = new DefaultAzureCredential();
const secretCache = new Map<string, Promise<string>>();

function getKeyVaultUrl(name: string) {
  return `https://${name}.vault.azure.net`;
}

/**
 * Get a secret value from Key Vault (cached per-process).
 * @param keyVaultName Key Vault short name (e.g. process.env.KEY_VAULT_NAME)
 * @param secretName secret name stored in Key Vault
 */
export async function getSecretFromVault(keyVaultName: string, secretName: string): Promise<string> {
  const cacheKey = `${keyVaultName}:${secretName}`;
  if (!secretCache.has(cacheKey)) {
    const p = (async () => {
      const client = new SecretClient(getKeyVaultUrl(keyVaultName), credential);
      const resp = await client.getSecret(secretName);
      if (!resp || !resp.value) throw new Error(`Secret ${secretName} not found in vault ${keyVaultName}`);
      return resp.value;
    })();
    secretCache.set(cacheKey, p);
  }
  return secretCache.get(cacheKey)!;
}

/**
 * Create a Service Bus client reading the connection string from Key Vault.
 * Expects SERVICE_BUS_CONN secret stored in Key Vault.
 */
export async function createServiceBusClient(keyVaultName: string): Promise<ServiceBusClient> {
  const conn = await getSecretFromVault(keyVaultName, "SERVICE_BUS_CONN");
  return new ServiceBusClient(conn);
}

/**
 * Send a message to a Service Bus topic
 */
export async function sendToTopic(keyVaultName: string, topicName: string, messageBody: unknown) {
  const client = await createServiceBusClient(keyVaultName);
  const sender = client.createSender(topicName);
  const msg: ServiceBusMessage = { body: messageBody };
  try {
    await sender.sendMessages(msg);
  } finally {
    await sender.close();
    await client.close();
  }
}