import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID!;
const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!;
const clientSecret = process.env.AZURE_CLIENT_SECRET!;

let graphClient: Client | null = null;

export function getGraphClient(): Client {
  if (!graphClient) {
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error('Missing required Azure credentials for Graph API');
    }

    const credential = new ClientSecretCredential(
      tenantId,
      clientId,
      clientSecret
    );

    graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken(
            'https://graph.microsoft.com/.default'
          );
          return tokenResponse?.token || '';
        },
      },
    });
  }

  return graphClient;
}

export interface CreateEntraUserInput {
  email: string;
  displayName: string;
  patientId: string;
  phoneNumber?: string;
}

export interface EntraUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail: string | null;
}

export async function createEntraUser(input: CreateEntraUserInput): Promise<EntraUser> {
  const client = getGraphClient();

  try {
    const user = await client.api('/users').post({
      accountEnabled: true,
      displayName: input.displayName,
      mailNickname: input.email.split('@')[0],
      userPrincipalName: input.email,
      passwordProfile: {
        forceChangePasswordNextSignIn: false,
        password: crypto.randomUUID() + 'Aa1!', // Random password (not used for passwordless auth)
      },
      identities: [
        {
          signInType: 'emailAddress',
          issuer: `${tenantId}.onmicrosoft.com`,
          issuerAssignedId: input.email,
        },
      ],
    });

    console.log(`✅ Created Entra user: ${user.id} (${input.email})`);
    return user as EntraUser;
  } catch (error: any) {
    if (error?.code === 'Request_ResourceNotFound' || error?.statusCode === 404) {
      throw new Error(`Entra tenant not found. Please verify AZURE_TENANT_ID.`);
    }
    if (error?.code === 'Authorization_RequestDenied' || error?.statusCode === 403) {
      throw new Error(`Insufficient permissions. Ensure app has User.ReadWrite.All permission.`);
    }
    if (error?.code === 'Request_BadRequest' && error?.message?.includes('already exists')) {
      throw new Error(`User with email ${input.email} already exists in Entra.`);
    }
    
    console.error('❌ Graph API error:', error);
    throw new Error(`Failed to create Entra user: ${error.message || 'Unknown error'}`);
  }
}

export async function updateEntraUserExtensionAttribute(
  userId: string,
  patientId: string
): Promise<void> {
  const client = getGraphClient();

  try {
    const extensionName = `extension_${clientId.replace(/-/g, '')}_patientId`;
    
    await client.api(`/users/${userId}`).patch({
      [extensionName]: patientId,
    });

    console.log(`✅ Updated Entra user ${userId} with patientId: ${patientId}`);
  } catch (error: any) {
    console.error('❌ Failed to update extension attribute:', error);
    throw new Error(`Failed to set patientId claim: ${error.message || 'Unknown error'}`);
  }
}

export async function getEntraUserByEmail(email: string): Promise<EntraUser | null> {
  const client = getGraphClient();

  try {
    const users = await client
      .api('/users')
      .filter(`mail eq '${email}' or userPrincipalName eq '${email}'`)
      .get();

    if (users.value && users.value.length > 0) {
      return users.value[0] as EntraUser;
    }

    return null;
  } catch (error: any) {
    console.error('❌ Failed to fetch Entra user:', error);
    return null;
  }
}
