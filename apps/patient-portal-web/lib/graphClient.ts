import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID!;
const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!;
const clientSecret = process.env.AZURE_CLIENT_SECRET!;

const tenantDomain = process.env.AZURE_TENANT_DOMAIN || 'eyehospitalb9337298.onmicrosoft.com';

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
  upi?: string;
  roles?: string[];
  verifiedMethod?: 'gov_id' | 'biometric' | 'staff_attestation';
}

export interface EntraUser {
  id: string;
  userPrincipalName: string;
  displayName: string;
  mail: string | null;
}

function getExtensionAttributeName(attributeName: string): string {
  return `extension_${clientId.replace(/-/g, '')}_${attributeName}`;
}

export async function createEntraUser(input: CreateEntraUserInput): Promise<EntraUser> {
  const client = getGraphClient();

  try {
    const mailNickname = input.email.split('@')[0];
    const userPrincipalName = `${mailNickname}@${tenantDomain}`;

    const extensionAttributes: any = {};
    
    if (input.patientId) {
      extensionAttributes[getExtensionAttributeName('patientId')] = input.patientId;
    }
    if (input.upi) {
      extensionAttributes[getExtensionAttributeName('upi')] = input.upi;
    }
    if (input.verifiedMethod) {
      extensionAttributes[getExtensionAttributeName('verified_method')] = input.verifiedMethod;
    }
    if (input.roles && input.roles.length > 0) {
      extensionAttributes[getExtensionAttributeName('roles')] = JSON.stringify(input.roles);
    }

    const user = await client.api('/users').post({
      accountEnabled: true,
      displayName: input.displayName,
      mailNickname: mailNickname,
      userPrincipalName: userPrincipalName,
      passwordProfile: {
        forceChangePasswordNextSignIn: false,
        password: crypto.randomUUID() + 'Aa1!',
      },
      identities: [
        {
          signInType: 'emailAddress',
          issuer: tenantDomain,
          issuerAssignedId: input.email,
        },
      ],
      ...extensionAttributes,
    });

    console.log(`✅ Created Entra user: ${user.id} (${userPrincipalName})`);
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
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create Entra user: ${error.message || 'Unknown error'}`);
  }
}

export async function updateEntraUserExtensionAttribute(
  userId: string,
  patientId: string
): Promise<void> {
  const client = getGraphClient();

  try {
    const extensionName = getExtensionAttributeName('patientId');
    
    await client.api(`/users/${userId}`).patch({
      [extensionName]: patientId,
    });

    console.log(`✅ Updated Entra user ${userId} with patientId: ${patientId}`);
  } catch (error: any) {
    console.error('❌ Failed to update extension attribute:', error);
    throw new Error(`Failed to set patientId claim: ${error.message || 'Unknown error'}`);
  }
}

export async function updateEntraUserUPI(
  userId: string,
  upi: string
): Promise<void> {
  const client = getGraphClient();

  try {
    const extensionName = getExtensionAttributeName('upi');
    
    await client.api(`/users/${userId}`).patch({
      [extensionName]: upi,
    });

    console.log(`✅ Updated Entra user ${userId} with UPI: ${upi}`);
  } catch (error: any) {
    console.error('❌ Failed to update UPI:', error);
    throw new Error(`Failed to set UPI claim: ${error.message || 'Unknown error'}`);
  }
}

export async function updateEntraUserVerificationMethod(
  userId: string,
  verifiedMethod: 'gov_id' | 'biometric' | 'staff_attestation'
): Promise<void> {
  const client = getGraphClient();

  try {
    const extensionName = getExtensionAttributeName('verified_method');
    
    await client.api(`/users/${userId}`).patch({
      [extensionName]: verifiedMethod,
    });

    console.log(`✅ Updated Entra user ${userId} with verification method: ${verifiedMethod}`);
  } catch (error: any) {
    console.error('❌ Failed to update verification method:', error);
    throw new Error(`Failed to set verification method: ${error.message || 'Unknown error'}`);
  }
}

export async function updateEntraUserRoles(
  userId: string,
  roles: string[]
): Promise<void> {
  const client = getGraphClient();

  try {
    const extensionName = getExtensionAttributeName('roles');
    
    await client.api(`/users/${userId}`).patch({
      [extensionName]: JSON.stringify(roles),
    });

    console.log(`✅ Updated Entra user ${userId} with roles: ${roles.join(', ')}`);
  } catch (error: any) {
    console.error('❌ Failed to update roles:', error);
    throw new Error(`Failed to set roles: ${error.message || 'Unknown error'}`);
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
